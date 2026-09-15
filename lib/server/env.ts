/**
 * Server environment reads that fail with a clear, name-only message —
 * never the value — when config is missing. Required booking/admin config
 * (below) must block the routes that need it; optional pipeline config
 * (e.g. the brief generator's provider keys) must use readOptionalEnv so a
 * missing key there never blocks admin or booking routes.
 */

export class MissingEnvError extends Error {
  constructor(public readonly names: string[]) {
    super(`Missing required environment variable(s): ${names.join(', ')}`);
    this.name = 'MissingEnvError';
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new MissingEnvError([name]);
  }
  return value;
}

/** Reads several required variables at once, reporting every missing name together. */
export function requireEnvAll<Name extends string>(names: readonly Name[]): Record<Name, string> {
  const missing = names.filter((name) => {
    const value = process.env[name];
    return !value || value.trim() === '';
  });
  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }
  return Object.fromEntries(names.map((name) => [name, process.env[name] as string])) as Record<Name, string>;
}

/** For config that must not block a route when absent (e.g. the brief pipeline). */
export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : undefined;
}

export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** Required for every admin-authenticated route and for the Firestore/Storage REST adapters. */
export function getFirebaseAdminConfig(): FirebaseAdminConfig {
  const env = requireEnvAll(['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'] as const);
  return {
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY,
  };
}

/** Required for every Storage REST call (upload, download, delete, list). */
export function getStorageBucket(): string {
  return requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
}
