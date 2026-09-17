/**
 * Business errors carry a stable code the UI translates, and an HTTP status.
 * Anything that is not a DomainError is an unexpected failure and is logged
 * without request bodies (no PII in logs).
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what: string) => new DomainError(`${what}_not_found`, 404);
