/** View-transition name for an entity's cover art (must be a valid CSS ident). */
export const vtName = (kind: "track" | "artist", id: string) =>
  `${kind}-${id.replace(/[^A-Za-z0-9_-]/g, (c) => `_${c.codePointAt(0)}`)}`;
