"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type {
  BaseIssue,
  Story,
  EventItem,
  BuildersMexicoItem,
} from "@/lib/newsletter/types";

const SUBJECT_BASE = "The Build Log";

function subjectSuffix(subject: string): string {
  const prefix = `${SUBJECT_BASE}:`;
  return subject.startsWith(prefix)
    ? subject.slice(prefix.length).trimStart()
    : subject === SUBJECT_BASE
      ? ""
    : subject;
}

function eventLocation(label: string): string {
  const location = label.replace(/^(AI BUILDERS|AIBM)\s*[-·]\s*/i, "").trim();
  return /^ONLINE$/i.test(location) ? "VIRTUAL" : location || "VIRTUAL";
}

// --- immutable helpers ------------------------------------------------------
function replaceAt<T>(arr: T[], i: number, val: T): T[] {
  return arr.map((x, idx) => (idx === i ? val : x));
}
function removeAt<T>(arr: T[], i: number): T[] {
  return arr.filter((_, idx) => idx !== i);
}

// --- inline contentEditable primitive ---------------------------------------
// Uncontrolled-on-mount: writes to state on input, and only re-syncs the DOM
// from props when the node is NOT focused (prevents caret jumps while typing).
const editableBase =
  "outline-none rounded-md -mx-1.5 px-1.5 ring-1 ring-transparent transition-[box-shadow,background] " +
  "hover:ring-black/10 hover:bg-black/[0.015] focus:ring-black/25 " +
  "dark:hover:ring-white/10 dark:hover:bg-white/[0.02] dark:focus:ring-white/25 " +
  "empty:before:content-[attr(data-placeholder)] empty:before:pointer-events-none " +
  "empty:before:text-black/25 dark:empty:before:text-white/25";

function Editable({
  value,
  onChange,
  placeholder,
  multiline,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel ?? placeholder}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onInput={(e) => {
        const el = e.currentTarget;
        // keep the node truly empty so :empty (placeholder) matches
        if (el.textContent === "") el.innerHTML = "";
        onChange(el.textContent ?? "");
      }}
      onKeyDown={
        multiline
          ? undefined
          : (e) => {
              if (e.key === "Enter") e.preventDefault();
            }
      }
      className={cn(
        editableBase,
        multiline && "whitespace-pre-wrap break-words",
        className,
      )}
    />
  );
}

// A monospace URL line that stays quiet until you hover/focus its group.
function LinkLine({
  value,
  onChange,
  overlay = false,
}: {
  value: string;
  onChange: (v: string) => void;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        overlay ? "absolute inset-x-3 bottom-1" : "mt-2",
        "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
      )}
    >
      <Editable
        value={value}
        onChange={onChange}
        placeholder="https://…"
        ariaLabel="Link"
        className="font-mono text-xs text-gray-400 dark:text-gray-500"
      />
    </div>
  );
}

// Eyebrow / mono label.
function Eyebrow({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Editable
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="font-mono text-[11px] uppercase tracking-normal text-gray-400 dark:text-gray-500"
    />
  );
}

function SectionHeader({
  title,
  editableTitle,
  onTitleChange,
  titlePlaceholder,
  compact = false,
  separated = false,
}: {
  title?: string;
  editableTitle?: string;
  onTitleChange?: (v: string) => void;
  titlePlaceholder?: string;
  compact?: boolean;
  separated?: boolean;
}) {
  const titleClass =
    `${compact ? "text-[28px]" : "text-[34px]"} font-semibold leading-[1.1] text-gray-800 dark:text-gray-100`;
  return (
    <div
      className={cn(
        "mt-8 mb-6",
        separated && "border-t border-gray-200 pt-8 dark:border-white/10",
      )}
    >
      {onTitleChange ? (
        <Editable
          value={editableTitle ?? ""}
          onChange={onTitleChange}
          placeholder={titlePlaceholder ?? "Título de la sección"}
          className={titleClass}
        />
      ) : (
        <h2 className={titleClass}>{title}</h2>
      )}
    </div>
  );
}

// Hover affordances for list items: a quiet "× Quitar" top-right.
function ItemShell({
  onRemove,
  children,
  compact = false,
}: {
  onRemove: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "group/item relative rounded-xl border border-transparent px-3 transition-colors hover:border-black/5 dark:hover:border-white/10",
        compact ? "py-2" : "py-4",
      )}
    >
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-xs uppercase tracking-normal text-gray-300 opacity-0 transition hover:text-red-500 group-hover/item:opacity-100 dark:text-gray-600 dark:hover:text-red-400"
      >
        × Quitar
      </button>
      {children}
    </div>
  );
}

function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 w-full rounded-xl border border-dashed border-black/10 py-2.5 font-mono text-xs uppercase tracking-normal text-gray-400 transition hover:border-black/25 hover:text-gray-600 dark:border-white/10 dark:text-gray-500 dark:hover:border-white/25 dark:hover:text-gray-300"
    >
      {label}
    </button>
  );
}

// --- the canvas -------------------------------------------------------------
export function EditableCanvas({
  issue,
  onChange,
}: {
  issue: BaseIssue;
  onChange: (next: BaseIssue) => void;
}) {
  const patch = (p: Partial<BaseIssue>) => onChange({ ...issue, ...p });
  const patchEssay = (p: Partial<BaseIssue["essay"]>) =>
    onChange({ ...issue, essay: { ...issue.essay, ...p } });
  const patchSponsor = (p: Partial<NonNullable<BaseIssue["sponsor"]>>) =>
    onChange({
      ...issue,
      sponsor: { title: "", description: "", href: "", ...issue.sponsor, ...p },
    });
  const buildersMexicoItems: BuildersMexicoItem[] =
    issue.buildersMexicoItems ??
    (issue.buildersMexico?.text
      ? [{ title: issue.buildersMexico.text, body: "", href: issue.buildersMexico.href }]
      : []);
  const patchBuildersMexicoItems = (items: BuildersMexicoItem[]) =>
    onChange({ ...issue, buildersMexico: undefined, buildersMexicoItems: items });
  const metadata = [
    issue.showIssueLabel !== false && issue.issueLabel.trim() ? issue.issueLabel : null,
    issue.date || "Fecha pendiente",
    issue.readingTime,
  ].filter((value): value is string => Boolean(value));
  const currentSubjectSuffix = subjectSuffix(issue.subject);
  return (
    <div className="mx-auto w-full max-w-[680px]">
      {/* Envelope: email metadata that isn't part of the visible body */}
      <div className="mb-8 rounded-2xl border border-black/5 bg-stone-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/5">
        <p className="mb-3 font-mono text-xs uppercase tracking-normal text-gray-400 dark:text-gray-600">
          Sobre · inbox
        </p>
        <div className="space-y-2">
          <div className="flex items-baseline gap-1 text-[15px] font-medium text-gray-800 dark:text-gray-100">
            <span className="shrink-0">
              {SUBJECT_BASE}{currentSubjectSuffix ? ":" : ""}
            </span>
            <Editable
              value={currentSubjectSuffix}
              onChange={(value) =>
                patch({
                  subject: value.trim() ? `${SUBJECT_BASE}: ${value}` : SUBJECT_BASE,
                })
              }
              placeholder="Some Text Here"
              className="min-w-0 flex-1"
              ariaLabel="Texto del asunto"
            />
          </div>
          <Editable
            value={issue.preview}
            onChange={(v) => patch({ preview: v })}
            placeholder="Texto de preview en el inbox…"
            multiline
            className="text-sm text-gray-500 dark:text-gray-400"
          />
          <div className="flex gap-6 pt-1">
            <Editable
              value={issue.slug}
              onChange={(v) => patch({ slug: v })}
              placeholder="slug"
              className="font-mono text-xs text-gray-400 dark:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* The newsletter body — follows the admin color scheme */}
      <article className="rounded-2xl border border-black/5 bg-white px-6 py-10 sm:px-10 dark:border-white/10 dark:bg-neutral-900">
        {/* Masthead */}
        <h1 className="text-[38px] font-semibold leading-[1.1] text-gray-900 dark:text-white">
          {issue.title}
        </h1>
        <p className="mt-2.5 text-lg leading-[1.4] text-gray-500 dark:text-gray-400">
          {issue.subtitle}
        </p>

        {/* Meta line */}
        <div className="mt-[18px] flex flex-wrap gap-x-2.5 gap-y-1 border-b border-gray-200 pb-3 dark:border-white/10">
          <a
            href="https://aibuilders.lat"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[13px] uppercase text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            AI BUILDERS LATAM
          </a>
          {metadata.map((value, index) => (
            <span key={`${value}-${index}`} className="contents">
              <span className="font-mono text-[13px] text-gray-300 dark:text-gray-600">·</span>
              <span className="font-mono text-[13px] uppercase text-gray-400 dark:text-gray-500">
                {value}
              </span>
            </span>
          ))}
        </div>

        {/* Compact sponsor placement: CTA remains visible when inventory is empty. */}
        <div className="mt-4 py-2">
          <p className="font-mono text-[10px] font-medium uppercase text-gray-400 dark:text-gray-500">
            Publicidad <span aria-hidden="true">—</span> Patrocina{" "}
            <a
              href="https://vacantes.lat/checkout/ad-sponsor"
              target="_blank"
              rel="noreferrer"
              className="text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              este espacio
            </a>
          </p>
          <div className="group mt-2">
            <div className="text-base font-semibold leading-snug text-gray-800 dark:text-gray-100">
              <Editable
                value={issue.sponsor?.title ?? ""}
                onChange={(title) => patchSponsor({ title })}
                placeholder="Título del anuncio"
              />
            </div>
            <div className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              <Editable
                value={issue.sponsor?.description ?? ""}
                onChange={(description) => patchSponsor({ description })}
                placeholder="Descripción de una línea (opcional)"
              />
            </div>
            <LinkLine
              value={issue.sponsor?.href ?? ""}
              onChange={(href) => patchSponsor({ href })}
            />
          </div>
        </div>

        {/* 01 — Stories */}
        <SectionHeader title="Esta semana en IA" compact />
        {issue.stories.map((s, i) => (
          <ItemShell
            key={i}
            onRemove={() => patch({ stories: removeAt(issue.stories, i) })}
            compact
          >
            <div className="group pb-4">
              <div className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                <Editable
                  value={s.title}
                  onChange={(v) =>
                    patch({ stories: replaceAt(issue.stories, i, { ...s, title: v }) })
                  }
                  placeholder="Título de la historia"
                />
              </div>
              <div className="mt-2 text-[17px] leading-relaxed text-gray-500 dark:text-gray-400">
                <Editable
                  value={s.body}
                  onChange={(v) =>
                    patch({ stories: replaceAt(issue.stories, i, { ...s, body: v }) })
                  }
                  placeholder="Por qué importa: …"
                  multiline
                />
              </div>
              <LinkLine
                value={s.href}
                onChange={(v) =>
                  patch({ stories: replaceAt(issue.stories, i, { ...s, href: v }) })
                }
                overlay
              />
            </div>
          </ItemShell>
        ))}
        <AddButton
          label="+ Añadir historia"
          onClick={() =>
            patch({
              stories: [...issue.stories, { eyebrow: "", title: "", href: "", body: "" } as Story],
            })
          }
        />

        {/* 02 — Essay */}
        <SectionHeader
          title="Pensamiento de la semana"
          separated={Boolean(issue.stories.length && issue.essay.title.trim())}
        />
        <div className="group rounded-[18px] border border-gray-200 bg-stone-50 p-8 dark:border-white/10 dark:bg-white/5">
          <Eyebrow
            value={issue.essay.eyebrow}
            onChange={(v) => patchEssay({ eyebrow: v })}
            placeholder="Ensayo · 3 min"
          />
          <div className="mt-3 text-[30px] font-normal leading-[1.15] text-gray-900 dark:text-white">
            <Editable
              value={issue.essay.title}
              onChange={(v) => patchEssay({ title: v })}
              placeholder="Título del ensayo"
            />
          </div>
          <div className="mt-4 text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            <Editable
              value={issue.essay.body}
              onChange={(v) => patchEssay({ body: v })}
              placeholder="Cuerpo del ensayo…"
              multiline
            />
          </div>
          <div className="mt-7 border-t border-gray-200 pt-5 dark:border-white/10">
            <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
              <Editable
                value={issue.essay.author}
                onChange={(v) => patchEssay({ author: v })}
                placeholder="Autor"
              />
            </div>
            <div className="text-base text-gray-500 dark:text-gray-400">
              <Editable
                value={issue.essay.authorRole}
                onChange={(v) => patchEssay({ authorRole: v })}
                placeholder="Rol del autor"
              />
            </div>
            <div className="mt-3 text-base font-semibold text-gray-800 underline dark:text-gray-100">
              <Editable
                value={issue.essay.linkText}
                onChange={(v) => patchEssay({ linkText: v })}
                placeholder="Texto del link ↗"
              />
            </div>
            <LinkLine
              value={issue.essay.linkHref}
              onChange={(v) => patchEssay({ linkHref: v })}
            />
          </div>
        </div>

        {/* 03 — Events */}
        <SectionHeader
          title={issue.eventsLabel?.trim() || "Próximos eventos"}
          compact
          separated={Boolean(
            issue.events.length && (issue.stories.length || issue.essay.title.trim()),
          )}
        />
        {issue.events.map((e, i) => (
          <ItemShell
            key={i}
            onRemove={() => patch({ events: removeAt(issue.events, i) })}
            compact
          >
            <div className="group pb-4">
              <div className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] uppercase tracking-normal text-gray-400 dark:text-gray-500">
                <Editable
                  value={e.day}
                  onChange={(v) =>
                    patch({ events: replaceAt(issue.events, i, { ...e, day: v }) })
                  }
                  placeholder="18"
                />
                <Editable
                  value={e.month}
                  onChange={(v) =>
                    patch({ events: replaceAt(issue.events, i, { ...e, month: v }) })
                  }
                  placeholder="Jun"
                />
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <Editable
                  value={eventLocation(e.label)}
                  onChange={(v) =>
                    patch({ events: replaceAt(issue.events, i, { ...e, label: v }) })
                  }
                  placeholder="VIRTUAL o ubicación"
                />
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                <Editable
                  value={e.title}
                  onChange={(v) =>
                    patch({ events: replaceAt(issue.events, i, { ...e, title: v }) })
                  }
                  placeholder="Nombre del evento"
                />
              </div>
              <div className="mt-2 text-base leading-relaxed text-gray-500 dark:text-gray-400">
                <Editable
                  value={e.body}
                  onChange={(v) =>
                    patch({ events: replaceAt(issue.events, i, { ...e, body: v }) })
                  }
                  placeholder="Descripción del evento…"
                  multiline
                />
              </div>
              <LinkLine
                value={e.href}
                onChange={(v) =>
                  patch({ events: replaceAt(issue.events, i, { ...e, href: v }) })
                }
                overlay
              />
            </div>
          </ItemShell>
        ))}
        <AddButton
          label="+ Añadir evento"
          onClick={() =>
            patch({
              events: [
                ...issue.events,
                {
                  day: "",
                  month: "",
                  label: "VIRTUAL",
                  title: "",
                  body: "",
                  href: "",
                } as EventItem,
              ],
            })
          }
        />

        <SectionHeader
          title="Desde AI Builders México"
          compact
          separated={Boolean(
            buildersMexicoItems.some((item) => item.title.trim() || item.body.trim()) &&
              (issue.stories.length || issue.essay.title.trim() || issue.events.length),
          )}
        />
        {buildersMexicoItems.map((item, index) => (
          <ItemShell
            key={index}
            onRemove={() => patchBuildersMexicoItems(removeAt(buildersMexicoItems, index))}
            compact
          >
            <div className="group pb-4">
              <div className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                <Editable
                  value={item.title}
                  onChange={(title) =>
                    patchBuildersMexicoItems(
                      replaceAt(buildersMexicoItems, index, { ...item, title }),
                    )
                  }
                  placeholder="Título"
                />
              </div>
              <div className="mt-2 text-[17px] leading-relaxed text-gray-500 dark:text-gray-400">
                <Editable
                  value={item.body}
                  onChange={(body) =>
                    patchBuildersMexicoItems(
                      replaceAt(buildersMexicoItems, index, { ...item, body }),
                    )
                  }
                  placeholder="Descripción…"
                  multiline
                />
              </div>
              <LinkLine
                value={item.href}
                onChange={(href) =>
                  patchBuildersMexicoItems(
                    replaceAt(buildersMexicoItems, index, { ...item, href }),
                  )
                }
                overlay
              />
            </div>
          </ItemShell>
        ))}
        <AddButton
          label="+ Añadir contenido"
          onClick={() =>
            patchBuildersMexicoItems([
              ...buildersMexicoItems,
              { title: "", body: "", href: "" },
            ])
          }
        />

        <footer className="mt-10 border-t border-gray-200 pt-8 text-gray-400 dark:border-white/10 dark:text-gray-500">
          <p className="mb-6 text-sm leading-6">
            The Build Log es una curaduría semanal de AI BUILDERS LATAM.
          </p>
          <div className="mb-6 space-y-2 text-sm">
            <p>
              ¿Quieres promocionarte en The Build Log?{" "}
              <a
                href="https://vacantes.lat/checkout/ad-sponsor"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline dark:text-blue-400"
              >
                Patrocina una edición
              </a>
              .
            </p>
            <p>
              ¿Buscas trabajo en IA?{" "}
              <a
                href="https://vacantes.lat"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline dark:text-blue-400"
              >
                Explora vacantes
              </a>
              .
            </p>
          </div>
          <p className="mt-3 font-mono text-xs">
            <span className="underline">Cancelar suscripción</span>
            <span aria-hidden="true"> · </span>
            <a
              href="https://aibuilders.lat"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              AI BUILDERS LATAM
            </a>
            <span aria-hidden="true"> · </span>
            <a
              href="https://aibuilders.mx"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              AI BUILDERS MEXICO
            </a>
          </p>
        </footer>

      </article>
    </div>
  );
}
