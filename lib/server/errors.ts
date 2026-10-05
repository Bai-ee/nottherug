import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Typed server errors carry a `clientMessage` safe to return in a response
 * body, separate from `message`/`cause`, which is only ever logged. Route
 * handlers should throw these (or let them propagate from verifyAdmin) and
 * convert them with errorResponse() — never echo `error.message` directly.
 */
export class AppError extends Error {
  readonly status: number;
  readonly clientMessage: string;

  constructor(status: number, clientMessage: string, detail?: string, options?: ErrorOptions) {
    super(detail ?? clientMessage, options);
    this.status = status;
    this.clientMessage = clientMessage;
  }
}

/** No credential presented, or the credential itself does not verify. */
export class UnauthorizedError extends AppError {
  constructor(detail: string) {
    super(401, 'Authentication required.', detail);
  }
}

/** Credential verifies, but the identity is not permitted for this resource. */
export class ForbiddenError extends AppError {
  constructor(detail: string) {
    super(403, 'You are not authorized for this resource.', detail);
  }
}

/** The request was legitimate; a dependency (Firestore, Storage, etc.) failed. */
export class ServiceError extends AppError {
  constructor(detail: string) {
    super(500, 'A server error occurred. Please try again.', detail);
  }
}

/**
 * Converts a thrown value into a safe NextResponse: known AppErrors return
 * their status and clientMessage; anything else is logged server-side (never
 * to the client) and reported as a generic 500. Other route owners should
 * adopt this instead of `NextResponse.json({ error: err.message })`.
 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      console.error(`[${err.name}]`, err.message);
    }
    return NextResponse.json({ error: err.clientMessage }, { status: err.status });
  }

  console.error('[UnhandledError]', err instanceof Error ? err.stack ?? err.message : String(err));
  return NextResponse.json({ error: 'A server error occurred. Please try again.' }, { status: 500 });
}

/**
 * Constant-time comparison for shared secrets (e.g. the cron bearer token).
 *
 * `===` on strings short-circuits at the first differing byte, which leaks the
 * length of a correct prefix across repeated requests. Low severity for a single
 * fixed secret, but there is no reason to hand it out.
 */
export function timingSafeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  // timingSafeEqual throws on a length mismatch, which would itself be a signal.
  if (left.length !== right.length) {
    // Still burn a comparison of equal length so the failure path costs the same.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * A Firestore/Storage request exceeded its deadline. Distinct from an HTTP
 * failure (the upstream answered) and from a caller abort (the caller cancelled).
 * The outcome of a timed-out write is unknown; callers must not blindly retry.
 */
export class UpstreamTimeoutError extends Error {
  readonly service: 'firestore' | 'storage';
  readonly operation: string;

  constructor(service: 'firestore' | 'storage', operation: string, timeoutMs: number) {
    super(`${service} ${operation} timed out after ${timeoutMs}ms`);
    this.name = 'UpstreamTimeoutError';
    this.service = service;
    this.operation = operation;
  }
}

/** A conditional Firestore write was rejected because its update-time / exists precondition failed. */
export class FirestorePreconditionError extends Error {
  constructor(message = 'Firestore precondition failed') {
    super(message);
    this.name = 'FirestorePreconditionError';
  }
}
