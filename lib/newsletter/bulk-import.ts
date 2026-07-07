const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

export type BulkImportState = {
  ok: boolean;
  message: string;
  inputCount: number;
  uniqueCount: number;
  insertedCount: number;
  skippedCount: number;
  duplicateInputCount: number;
  invalidCount: number;
  invalidSamples: string[];
};

export const initialBulkImportState: BulkImportState = {
  ok: false,
  message: "",
  inputCount: 0,
  uniqueCount: 0,
  insertedCount: 0,
  skippedCount: 0,
  duplicateInputCount: 0,
  invalidCount: 0,
  invalidSamples: [],
};

function normalizeEmail(value: string): string | null {
  const email = value
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/^["'<([]+|[>"')\].]+$/g, "")
    .toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

export function parseBulkSubscriberEmails(input: string): {
  emails: string[];
  inputCount: number;
  duplicateInputCount: number;
  invalidCount: number;
  invalidSamples: string[];
} {
  const tokens = input
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const emails: string[] = [];
  const invalidSamples: string[] = [];
  let invalidCount = 0;
  let duplicateInputCount = 0;

  for (const token of tokens) {
    const email = normalizeEmail(token);
    if (!email) {
      if (token.includes("@")) {
        invalidCount += 1;
        if (invalidSamples.length < 5) invalidSamples.push(token);
      }
      continue;
    }
    if (seen.has(email)) {
      duplicateInputCount += 1;
      continue;
    }
    seen.add(email);
    emails.push(email);
  }

  return {
    emails,
    inputCount: tokens.length,
    duplicateInputCount,
    invalidCount,
    invalidSamples,
  };
}
