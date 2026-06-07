type PostgrestLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as PostgrestLikeError;
    if (record.message) {
      return record.hint
        ? `${record.message} (${record.hint})`
        : record.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}
