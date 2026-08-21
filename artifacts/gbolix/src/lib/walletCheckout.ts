export function checkoutErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Unable to start secure checkout. Refresh the page and try again.";
}
