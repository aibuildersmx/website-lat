"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function NewIssueCreator() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function createIssue() {
      try {
        const response = await fetch("/api/admin/newsletter/create", {
          method: "POST",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Create issue failed: ${response.status}`);
        const data = (await response.json()) as { id: string };
        router.replace(`/admin/newsletter/${data.id}`);
      } catch {
        setError(true);
      }
    }

    void createIssue();
  }, [router]);

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">The Build Log</p>
      <h1 className="mt-1 text-3xl font-medium text-gray-800 dark:text-gray-100">
        Nuevo issue
      </h1>
      <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-neutral-900">
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No se pudo crear el issue.
            </p>
            <Link
              href="/admin/newsletter"
              className="inline-flex rounded-xl border border-black/10 px-4 py-2 text-sm text-gray-700 transition hover:border-black/25 dark:border-white/15 dark:text-gray-200 dark:hover:border-white/30"
            >
              Volver a newsletter
            </Link>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Creando issue...</p>
        )}
      </div>
    </div>
  );
}
