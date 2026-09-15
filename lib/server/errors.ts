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
