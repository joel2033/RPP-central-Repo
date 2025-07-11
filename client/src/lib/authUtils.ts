export function isUnauthorizedError(error: Error): boolean {
  // Authentication disabled - never treat errors as unauthorized
  return false;
}