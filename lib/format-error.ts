type PostgrestLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function collectErrorMessages(error: unknown, depth = 0): string[] {
  if (depth > 6) {
    return [];
  }

  if (error instanceof Error) {
    const messages = error.message ? [error.message] : [];
    if (error.cause) {
      messages.push(...collectErrorMessages(error.cause, depth + 1));
    }
    return messages;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as PostgrestLikeError & { cause?: unknown };
    const messages: string[] = [];

    if (record.message) {
      messages.push(
        record.hint ? `${record.message} (${record.hint})` : record.message,
      );
    }

    if (record.cause) {
      messages.push(...collectErrorMessages(record.cause, depth + 1));
    }

    return messages;
  }

  if (typeof error === "string") {
    return [error];
  }

  return [];
}

export function formatUnknownError(error: unknown): string {
  const messages = collectErrorMessages(error);
  const unique = [...new Set(messages.filter(Boolean))];

  if (unique.length > 0) {
    return unique.join(": ");
  }

  return "Unknown error";
}
