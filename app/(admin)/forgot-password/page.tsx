"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth";
import { ThemeToggle } from "@/app/(admin)/admin/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const result = await requestPasswordReset(formData);
    setMessage(result.message);
    setLoading(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-stone-100 px-4 dark:bg-neutral-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 text-center">
          <Link href="/">
            <Image
              src="/aibl-logo.svg"
              alt="AI Builders Latam"
              width={393}
              height={95}
              className="mx-auto h-6 w-auto brightness-0 dark:invert"
              unoptimized
            />
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            Recupera tu acceso
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Te enviaremos un enlace que vence en una hora.
          </p>
        </div>

        {message ? (
          <div className="space-y-6 text-center">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-800 dark:text-emerald-300">{message}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                maxLength={320}
                autoComplete="email"
                placeholder="hola@aibuilders.lat"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 transition-colors hover:border-gray-300 focus:border-gray-400 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-white/25 dark:focus:border-white/40"
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={!loading ? { scale: 0.97 } : undefined}
              className="mt-2 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gray-900 px-8 py-4 font-mono text-xs font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:disabled:bg-white/30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {loading ? "Enviando..." : "Enviar enlace"}
            </motion.button>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
