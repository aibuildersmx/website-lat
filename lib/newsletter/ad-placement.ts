import { AD_PLACEMENTS, type AdPlacement, type Issue } from "./types";

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  top: "Después del encabezado",
  after_stories: "Después de las historias",
  after_essay: "Después del ensayo",
  before_footer: "Antes del pie",
};

export function isAdPlacement(value: unknown): value is AdPlacement {
  return typeof value === "string" && (AD_PLACEMENTS as readonly string[]).includes(value);
}

// The sent email renders the Spanish copy. Keep that copy on the same slot
// as the original so a placement change cannot strand the ad in one language.
export function syncAdPlacement(issue: Issue): Issue {
  if (!issue.spanish || issue.spanish.adPlacement === issue.adPlacement) return issue;
  return {
    ...issue,
    spanish: { ...issue.spanish, adPlacement: issue.adPlacement },
  };
}
