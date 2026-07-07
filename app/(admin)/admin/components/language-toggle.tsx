"use client";

import { useRouter } from "next/navigation";
import {
  ADMIN_LANGUAGE_COOKIE,
  type AdminLanguage,
} from "@/lib/admin/language";

const LABEL: Record<AdminLanguage, string> = {
  es: "Cambiar a inglés",
  en: "Switch to Spanish",
};

export function LanguageToggle({ language }: { language: AdminLanguage }) {
  const router = useRouter();
  const nextLanguage: AdminLanguage = language === "es" ? "en" : "es";

  function toggleLanguage() {
    document.cookie = `${ADMIN_LANGUAGE_COOKIE}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={LABEL[language]}
      className="inline-flex items-center rounded-lg px-2 py-2 font-mono text-[11px] font-semibold uppercase tracking-normal text-gray-500 transition hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <span className={language === "en" ? "text-gray-900 dark:text-white" : ""}>EN</span>
      <span className="px-1.5 text-gray-300 dark:text-gray-600">/</span>
      <span className={language === "es" ? "text-gray-900 dark:text-white" : ""}>ES</span>
    </button>
  );
}
