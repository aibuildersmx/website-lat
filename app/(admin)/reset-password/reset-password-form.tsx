"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { resetPassword } from "@/lib/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await resetPassword(formData);
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setMessage(result.message);
    setLoading(false);
  }

  if (message) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">{message}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex rounded-full bg-gray-900 px-8 py-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          name="password"
          required
          minLength={10}
          maxLength={72}
          autoComplete="new-password"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:focus:border-white/40"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password_confirmation" className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          Confirmar contraseña
        </label>
        <input
          id="password_confirmation"
          type="password"
          name="password_confirmation"
          required
          minLength={10}
          maxLength={72}
          autoComplete="new-password"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:focus:border-white/40"
        />
      </div>
      <motion.button
        type="submit"
        disabled={loading || !token}
        whileTap={!loading ? { scale: 0.97 } : undefined}
        className="mt-2 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gray-900 px-8 py-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:disabled:bg-white/30"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {loading ? "Actualizando..." : "Guardar contraseña"}
      </motion.button>
      {!token && (
        <p className="text-center text-sm text-red-500">
          Este enlace no es válido. Solicita uno nuevo.
        </p>
      )}
    </form>
  );
}
