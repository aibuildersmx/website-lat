"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { subscribe } from "@/lib/actions/subscribe";
import { cn } from "@/lib/utils";

type Status = "idle" | "success" | "error";

const ERROR_COPY: Record<string, string> = {
  invalid: "Ingresa un correo válido.",
  rate_limited: "Demasiados intentos, intenta en un momento.",
  error: "Hubo un error. Intenta de nuevo.",
};

const SUCCESS_COPY = "¡Listo! Te avisaremos en el próximo número.";

export function NewsletterSignup({
  tone = "light",
  heading,
  subtext,
  className,
}: {
  tone?: "light" | "onDark";
  heading?: string;
  subtext?: string;
  className?: string;
}) {
  const onDark = tone === "onDark";
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await subscribe(formData);
      if (res.ok) {
        setStatus("success");
        setMessage(SUCCESS_COPY);
      } else {
        setStatus("error");
        setMessage(ERROR_COPY[res.error] ?? ERROR_COPY.error);
      }
    });
  }

  return (
    <div className={className}>
      {heading && (
        <h3
          className={cn(
            "text-xl sm:text-2xl md:text-3xl font-instrument font-medium mb-3 sm:mb-4",
            onDark ? "text-white" : "text-black",
          )}
        >
          {heading}
        </h3>
      )}
      {subtext && (
        <p
          className={cn(
            "mb-6 sm:mb-8 text-sm sm:text-base",
            onDark ? "text-white/60" : "text-black/60",
          )}
        >
          {subtext}
        </p>
      )}

      {status === "success" ? (
        <p className="font-mono text-sm uppercase tracking-widest text-green-500">
          {SUCCESS_COPY}
        </p>
      ) : (
        <form className="space-y-3 sm:space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Honeypot — hidden from humans, catnip for bots. */}
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          <input
            type="email"
            name="email"
            required
            placeholder="tu@email.com"
            className={cn(
              "w-full rounded-lg sm:rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:ring-2 transition-all",
              onDark
                ? "bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:ring-white/20"
                : "bg-white border border-black/10 text-black placeholder:text-black/30 focus:ring-black/20",
            )}
          />
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "w-full py-5 sm:py-6 text-sm sm:text-base font-bold rounded-lg sm:rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60",
              onDark
                ? "bg-white text-black hover:bg-white/90"
                : "bg-black text-white hover:bg-black/90",
            )}
          >
            <span>{pending ? "Enviando…" : "Suscribirme"}</span>
            {!pending && <Send className="size-4" />}
          </button>
          {status === "error" && (
            <p className="font-mono text-xs uppercase tracking-widest text-red-500">
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
