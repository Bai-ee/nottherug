/**
 * In-memory stand-in for the Firestore REST helpers' optimistic-concurrency
 * contract (fsGetDoc updateTime, fsMergeDoc preconditions, withOptimisticRetry),
 * for unit tests that mock '@/lib/server/firestoreRest'. Real concurrency is
 * proven against the emulator in bench-resume-emulator.test.ts; this only lets
 * the route-level tests run without it. Not itself a test file.
 *
 * updateTime is the document's JSON, so any change, including a test mutating
 * the map directly, reads as a new version.
 */
export class FirestorePreconditionError extends Error {}
export class UpstreamTimeoutError extends Error {
  constructor(
    readonly service: 'firestore' | 'storage',
    readonly operation: string,
  ) {
    super(`${service} ${operation} timed out`);
  }
}

export function firestoreContractFake(getDocs: () => Map<string, Record<string, unknown>>) {
  return {
    FirestorePreconditionError,
    UpstreamTimeoutError,
    fsGetDoc: async (path: string) => {
      const data = getDocs().get(path);
      return data ? { exists: true, data: { ...data }, updateTime: JSON.stringify(data) } : { exists: false };
    },
    fsMergeDoc: async (
      path: string,
      data: Record<string, unknown>,
      opts?: { precondition?: { updateTime: string } | { exists: boolean } },
    ) => {
      const current = getDocs().get(path);
      const pre = opts?.precondition;
      if (pre && 'updateTime' in pre && (!current || JSON.stringify(current) !== pre.updateTime)) {
        throw new FirestorePreconditionError('updateTime mismatch');
      }
      if (pre && 'exists' in pre && Boolean(current) !== pre.exists) {
        throw new FirestorePreconditionError('exists mismatch');
      }
      getDocs().set(path, { ...(current ?? {}), ...data });
      return { updateTime: JSON.stringify(getDocs().get(path)) };
    },
    withOptimisticRetry: async <T>(attempt: () => Promise<T>, opts?: { maxAttempts?: number }): Promise<T> => {
      const max = opts?.maxAttempts ?? 5;
      for (let i = 1; ; i++) {
        try {
          return await attempt();
        } catch (err) {
          if (!(err instanceof FirestorePreconditionError) || i >= max) throw err;
        }
      }
    },
  };
}
