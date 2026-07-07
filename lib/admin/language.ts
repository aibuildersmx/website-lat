export const ADMIN_LANGUAGE_COOKIE = "admin_language";

export type AdminLanguage = "es" | "en";

export function normalizeAdminLanguage(value: string | undefined | null): AdminLanguage {
  return value === "en" ? "en" : "es";
}
