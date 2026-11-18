import { FieldPath } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { getEntities, trackDocFrom, type ArtistDoc, type TrackDoc } from "@/lib/entities";
import { artistKey } from "@/lib/plays/keys";
import { spotifyGet } from "@/lib/spotify/client";
import { Artist, Track } from "@/lib/spotify/types";
import { getAllTime } from "@/lib/stats/read";
import { lastfmEnabled, similarArtists, topTags } from "./lastfm";
import { artistGenresAndTags, artistsByIsrc, searchArtist } from "./musicbrainz";
import { mergeGenres, weigh, type WeightedTag } from "./tags";

const DAY = 24 * 60 * 60 * 1000;
const RETRY_HIT = 90 * DAY;
const RETRY_MISS = 30 * DAY;
// Runs once a day, so take as much as the time budget allows; the loop below
// stops picking new work when time runs low (MusicBrainz is ~1 call/s).
const TRACKS_PER_RUN = 300; // export stubs; single lookups are quick, capped at half the time budget
const ARTISTS_PER_RUN = 40;
const SCAN_PAGE = 200;

const pickImage = (imgs?: { url: string; width?: number | null }[]) =>
  imgs?.find((i) => (i.width ?? 0) >= 160 && (i.width ?? 0) <= 400)?.url ?? imgs?.[0]?.url;

/**
 * Level 5, hourly. Within a time budget:
 * 1. resolve Spotify metadata for export stubs (most-played first),
 * 2. enrich ~10 artists with MusicBrainz genres and Last.fm tags + similar artists.
 */
export async function enrich(budgetMs = 240_000) {
  const started = Date.now();
  const timeLeft = () => budgetMs - (Date.now() - started);
  const db = getDb();
  const allTime = await getAllTime();
  const result = { tracksResolved: 0, artistsEnriched: 0, artistMisses: 0, imagesAdded: 0, stoppedEarly: false };

  // 1. Track stubs: priority from all-time minutes, then any other stub.
  const priority = (allTime?.topTracksByMs ?? []).slice(0, 200).map((r) => r.id);
  const known = await getEntities<TrackDoc>("tracks", priority);
  const stubIds = new Set(priority.filter((id) => known.get(id)?.metaSource === "export-stub"));
  if (stubIds.size < TRACKS_PER_RUN) {
    const more = await db.collection("tracks").where("metaSource", "==", "export-stub").limit(TRACKS_PER_RUN).get();
    more.docs.forEach((d) => stubIds.add(d.id));
  }
  for (const id of [...stubIds].slice(0, TRACKS_PER_RUN)) {
    if (timeLeft() < budgetMs / 2) {
      // Leave the other half of the run for artist enrichment.
      result.stoppedEarly = true;
      break;
    }
    try {
      const t = await spotifyGet(`/tracks/${id}`, Track);
      const doc = trackDocFrom(t);
      if (!doc) continue;
      const batch = db.batch();
      batch.set(db.doc(`tracks/${id}`), doc, { merge: true });
      const primary = t.artists[0];
      if (primary?.id) batch.set(db.doc(`artists/${doc.artistKey}`), { name: primary.name, spotifyId: primary.id }, { merge: true });
      await batch.commit();
      result.tracksResolved += 1;
    } catch (err) {
      console.error(`[enrich] track ${id} failed`, err);
    }
  }

  // 2. Artists: top artists by minutes first, then a rolling scan of the whole collection.
  const now = Date.now();
  // `similar` is only written once Last.fm has been asked, so artists enriched
  // before LASTFM_API_KEY existed are picked up again as soon as it's set.
  const lastfmPending = (a: ArtistDoc) => lastfmEnabled() && a.similar === undefined;
  const needs = (a: ArtistDoc | undefined) =>
    !!a && (!a.nextEnrichAt || a.nextEnrichAt < now || (!a.image && !!a.spotifyId) || lastfmPending(a));
  const candidates = new Map<string, ArtistDoc>();
  const topKeys = (allTime?.topArtistsByMs ?? []).slice(0, 60).map((r) => r.id);
  for (const [k, a] of await getEntities<ArtistDoc>("artists", topKeys)) if (needs(a)) candidates.set(k, a);

  if (candidates.size < ARTISTS_PER_RUN) {
    const cfgRef = db.doc("config/enrich");
    const scanAfter = ((await cfgRef.get()).data()?.scanAfter as string | undefined) ?? "";
    let q = db.collection("artists").orderBy(FieldPath.documentId()).limit(SCAN_PAGE);
    if (scanAfter) q = q.startAfter(scanAfter);
    const page = await q.get();
    page.docs.forEach((d) => {
      const a = d.data() as ArtistDoc;
      if (needs(a) && !candidates.has(d.id)) candidates.set(d.id, a);
    });
    await cfgRef.set({ scanAfter: page.size < SCAN_PAGE ? "" : page.docs.at(-1)!.id }, { merge: true });
  }

  for (const [key, a] of [...candidates].slice(0, ARTISTS_PER_RUN)) {
    if (timeLeft() < 30_000) {
      result.stoppedEarly = true;
      break;
    }
    try {
      const hit = await enrichArtist(key, a);
      if (hit.image) result.imagesAdded += 1;
      if (hit.miss) result.artistMisses += 1;
      else result.artistsEnriched += 1;
    } catch (err) {
      console.error(`[enrich] artist ${key} failed`, err);
    }
  }

  return { ...result, lastfm: lastfmEnabled(), candidates: candidates.size };
}

async function enrichArtist(key: string, a: ArtistDoc) {
  const db = getDb();
  const update: Partial<ArtistDoc> = {};

  // Spotify artist image.
  if (a.spotifyId && !a.image) {
    const sa = await spotifyGet(`/artists/${a.spotifyId}`, Artist);
    update.image = pickImage(sa.images);
    update.url = sa.external_urls?.spotify;
  }

  // MusicBrainz id: ISRC of one of their tracks first, then a confident name search.
  let mbid = a.mbid ?? undefined;
  if (mbid === undefined) {
    const withIsrc = await db.collection("tracks").where("artistKey", "==", key).limit(3).get();
    const isrc = withIsrc.docs.map((d) => (d.data() as TrackDoc).isrc).find(Boolean);
    if (isrc) {
      const credited = await artistsByIsrc(isrc);
      mbid = credited.find((c) => artistKey(c.name) === key)?.id;
    }
    if (!mbid) mbid = (await searchArtist(a.name))?.id;
  }

  const tags: WeightedTag[] = [];
  if (mbid) {
    const mb = await artistGenresAndTags(mbid);
    if (mb) {
      tags.push(...weigh(mb.genres, "mb-genre", a.name, 1));
      tags.push(...weigh(mb.tags, "mb-tag", a.name, 0.5));
    }
  }
  const who = { mbid, name: a.name };
  const lf = await topTags(who);
  tags.push(...weigh(lf.slice(0, 20), "lastfm", a.name, 1));
  const similar = await similarArtists(who);

  const genres = mergeGenres(tags);
  const miss = !mbid && lf.length === 0;
  const now = Date.now();
  Object.assign(update, {
    mbid: mbid ?? null,
    tags: tags.sort((x, y) => y.weight - x.weight).slice(0, 15),
    genres,
    ...(similar.length || lastfmEnabled() ? { similar } : {}),
    enrichedAt: now,
    nextEnrichAt: now + (miss ? RETRY_MISS : RETRY_HIT),
  });
  await db.doc(`artists/${key}`).set(update, { merge: true });
  return { miss, image: !!update.image };
}
