/**
 * Wraps a Promise with a timeout. If the promise doesn't resolve within `ms`,
 * it rejects with a clear timeout error.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15000, label = 'Request'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}
