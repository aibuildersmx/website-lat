"use client";

import { useState, useTransition } from "react";
import { subscribe } from "@/lib/actions/subscribe";

type Status = "idle" | "success" | "error";

const ERROR_COPY: Record<string, string> = {
  invalid: "Ingresa un correo válido.",
  rate_limited: "Demasiados intentos, intenta en un momento.",
  error: "Hubo un error. Intenta de nuevo.",
};

const SUCCESS_COPY = "¡Listo! Te avisaremos en el próximo número.";
const ATTRIBUTION_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

function appendAttribution(formData: FormData) {
  const params = new URLSearchParams(window.location.search);

  for (const field of ATTRIBUTION_FIELDS) {
    const value = params.get(field);
    if (value) formData.set(field, value);
  }

  if (document.referrer) formData.set("attribution_referrer", document.referrer);
  formData.set("attribution_landing_page", window.location.href);
}

// The hero pill signup: same bespoke `.hero-form` look as the original static
// site, wired to the self-hosted `subscribe` server action (writes to contacts).
export function NewsletterSignup({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    appendAttribution(formData);
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

  if (status === "success") {
    return (
      <p className={`hero-form-status is-success${className ? ` ${className}` : ""}`} role="status">
        {SUCCESS_COPY}
      </p>
    );
  }

  return (
    <form
      className={`hero-form${className ? ` ${className}` : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="sr-only" htmlFor="hero-email">
        Correo electrónico
      </label>
      {/* Honeypot — hidden from humans, catnip for bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hero-honeypot"
      />
      <input id="hero-email" name="email" type="email" placeholder="tu@email.com" required />
      <button type="submit" disabled={pending}>
        <span>{pending ? "Enviando…" : "Suscribirme"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </button>
      {status === "error" && (
        <p className="hero-form-status is-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
