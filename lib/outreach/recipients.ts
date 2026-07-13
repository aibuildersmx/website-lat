function recipientTokens(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function toggleOutreachRecipient(value: string, email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const tokens = recipientTokens(value);
  const selected = tokens.some((token) => token.toLowerCase() === normalizedEmail);
  const next = selected
    ? tokens.filter((token) => token.toLowerCase() !== normalizedEmail)
    : [...tokens, normalizedEmail];
  return next.join("\n");
}

export function addOutreachRecipients(
  value: string,
  emails: string[],
  limit: number,
): string {
  const tokens = recipientTokens(value);
  const seen = new Set(tokens.map((token) => token.toLowerCase()));
  for (const rawEmail of emails) {
    const email = rawEmail.trim().toLowerCase();
    if (!email || seen.has(email) || tokens.length >= limit) continue;
    tokens.push(email);
    seen.add(email);
  }
  return tokens.join("\n");
}
