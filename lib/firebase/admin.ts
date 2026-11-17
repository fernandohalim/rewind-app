import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-only Firestore access. The client never talks to Firestore
 * (firestore.rules denies everything), so no Firebase web config exists.
 *
 * FIREBASE_SERVICE_ACCOUNT is the service account JSON, base64-encoded.
 */
function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!encoded) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set");
  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8"),
  );
  return initializeApp({ credential: cert(serviceAccount) });
}

// Kept on globalThis so dev hot reloads reuse the instance: Firestore only
// allows settings() once per instance, and the app (with its Firestore)
// survives a module reload while module-level variables don't.
const g = globalThis as typeof globalThis & { __rewindDb?: Firestore };

export function getDb(): Firestore {
  if (!g.__rewindDb) {
    const db = getFirestore(app());
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already configured by an earlier module instance.
    }
    g.__rewindDb = db;
  }
  return g.__rewindDb;
}
