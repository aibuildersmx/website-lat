"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, LogIn, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth";
import { ThemeToggle } from "@/app/(admin)/admin/components/theme-toggle";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
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
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/">
            <Image
              src="/aibm-logo.svg"
              alt="AI Builders Mexico"
              width={393}
              height={95}
              className="mx-auto h-6 w-auto brightness-0 dark:invert"
              unoptimized
            />
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            Iniciar sesión
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Panel de administración
          </p>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10"
          >
            <AlertCircle
              className="h-4 w-4 shrink-0 text-red-400"
              strokeWidth={1.5}
            />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              Correo electrónico
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@aibuilders.mx"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 transition-colors hover:border-gray-300 focus:border-gray-400 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-white/25 dark:focus:border-white/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-300 transition-colors hover:border-gray-300 focus:border-gray-400 focus:outline-none dark:border-white/15 dark:bg-neutral-900 dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-white/25 dark:focus:border-white/40"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={!loading ? { scale: 0.97 } : undefined}
            className="mt-2 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-gray-900 px-8 py-4 font-mono text-xs font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:disabled:bg-white/30"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" strokeWidth={2} />
            )}
            {loading ? "Ingresando..." : "Ingresar"}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-gray-300 dark:text-gray-600">
          Solo administradores
        </p>
      </motion.div>
    </div>
  );
}
