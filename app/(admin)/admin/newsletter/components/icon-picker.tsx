"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Visual picker for the use-case Phosphor icon. The stored value is the kebab
// icon name (e.g. "tree-structure") — the same string the email's PNG route
// consumes. Here in the browser we render icons straight from Phosphor's CDN
// SVG via CSS `mask-image`, so they inherit the current text color (theme-aware)
// with zero bundle cost. The full name+tags list is lazy-loaded on first open.

const CDN = "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2.1.1/assets/regular";
const PAGE_SIZE = 120; // icons per page — keeps each page's mask fetches bounded

function svgUrl(name: string): string {
  return `${CDN}/${name}.svg`;
}

type IconMeta = { name: string; tags: readonly string[]; categories: readonly string[] };

/** A single Phosphor glyph painted with the current text color (mask-image). */
function Glyph({ name, className }: { name: string; className?: string }) {
  const url = `url("${svgUrl(name)}")`;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export function IconPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={value ? `Ícono: ${value}` : "Elegir ícono"}
        className="flex size-11 items-center justify-center rounded-xl border border-black/10 text-gray-800 transition hover:border-black/30 hover:bg-black/[0.02] dark:border-white/15 dark:text-gray-100 dark:hover:border-white/40 dark:hover:bg-white/[0.04]"
      >
        {value ? (
          <Glyph name={value} className="size-6" />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-normal text-gray-400">
            Ícono
          </span>
        )}
      </button>
      {open && <PickerModal value={value} onSelect={onSelect} onClose={() => setOpen(false)} />}
    </>
  );
}

function PickerModal({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [all, setAll] = useState<IconMeta[] | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-load the metadata only when the modal first opens.
  useEffect(() => {
    let alive = true;
    import("@phosphor-icons/core").then((mod) => {
      if (!alive) return;
      setAll(
        mod.icons.map((i) => ({
          name: i.name,
          tags: i.tags,
          categories: i.categories,
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const matched = useMemo(() => {
    if (!all) return [] as IconMeta[];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) =>
        i.name.includes(q) ||
        i.tags.some((t) => t.includes(q)) ||
        i.categories.some((c) => c.includes(q)),
    );
  }, [all, query]);

  const total = matched.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const results = matched.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const choose = (name: string) => {
    onSelect(name);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Elegir ícono"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />
      <div className="relative mt-8 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center gap-3 border-b border-black/5 p-4 dark:border-white/10">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Busca un ícono… (nombre o etiqueta: loop, money, code)"
            className="w-full bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-normal text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-200"
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!all ? (
            <p className="py-16 text-center text-sm text-gray-400">Cargando íconos…</p>
          ) : results.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">
              Sin resultados para “{query}”.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
              {results.map((i) => {
                const selected = i.name === value;
                return (
                  <button
                    key={i.name}
                    type="button"
                    onClick={() => choose(i.name)}
                    title={i.name}
                    className={`group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-1 transition ${
                      selected
                        ? "border-black/40 bg-black/[0.04] dark:border-white/40 dark:bg-white/10"
                        : "border-transparent hover:border-black/15 hover:bg-black/[0.03] dark:hover:border-white/15 dark:hover:bg-white/5"
                    }`}
                  >
                    <Glyph name={i.name} className="size-6 text-gray-700 dark:text-gray-200" />
                    <span className="w-full truncate text-center text-[9px] leading-none text-gray-400 dark:text-gray-500">
                      {i.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {all && total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-2.5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              aria-label="Página anterior"
              className="flex size-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-black/[0.04] hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
            >
              <Glyph name="caret-left" className="size-4" />
            </button>
            <span className="font-mono text-[11px] uppercase tracking-normal text-gray-400 dark:text-gray-500">
              {safePage + 1} / {pageCount} · {total} íconos
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Página siguiente"
              className="flex size-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-black/[0.04] hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100"
            >
              <Glyph name="caret-right" className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
