"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { IconPicker } from "./icon-picker";
import type {
  Issue,
  Story,
  UseCase,
  EventItem,
  JobItem,
} from "@/lib/newsletter/types";

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
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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

// Section heading shown above each block, mirrors the email's "01 / 05" rhythm.
function SectionHeader({
  index,
  title,
  editableTitle,
  onTitleChange,
  titlePlaceholder,
}: {
  index: string;
  title?: string;
  editableTitle?: string;
  onTitleChange?: (v: string) => void;
  titlePlaceholder?: string;
}) {
  const titleClass =
    "mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100";
  return (
    <div className="mt-14 mb-6">
      <p className="font-mono text-[11px] uppercase tracking-normal text-gray-300 dark:text-gray-600">
        {index}
      </p>
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
}: {
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group/item relative rounded-xl border border-transparent px-3 py-4 transition-colors hover:border-black/5 dark:hover:border-white/10">
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
  issue: Issue;
  onChange: (next: Issue) => void;
}) {
  const patch = (p: Partial<Issue>) => onChange({ ...issue, ...p });
  const patchEssay = (p: Partial<Issue["essay"]>) =>
    onChange({ ...issue, essay: { ...issue.essay, ...p } });
  const patchCommunity = (p: Partial<Issue["community"]>) =>
    onChange({ ...issue, community: { ...issue.community, ...p } });

  return (
    <div className="mx-auto w-full max-w-[680px]">
      {/* Envelope: email metadata that isn't part of the visible body */}
      <div className="mb-8 rounded-2xl border border-black/5 bg-stone-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/5">
        <p className="mb-3 font-mono text-xs uppercase tracking-normal text-gray-400 dark:text-gray-600">
          Sobre · inbox
        </p>
        <div className="space-y-2">
          <Editable
            value={issue.subject}
            onChange={(v) => patch({ subject: v })}
            placeholder="Asunto del correo…"
            className="text-[15px] font-medium text-gray-800 dark:text-gray-100"
          />
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
        <p className="mb-8 font-mono text-[11px] uppercase tracking-normal text-gray-300 dark:text-gray-600">
          AI Builders MX
        </p>
        <Editable
          value={issue.title}
          onChange={(v) => patch({ title: v })}
          placeholder="The Build Log"
          className="text-4xl font-normal leading-[0.95] text-gray-900 sm:text-5xl dark:text-white"
        />
        <div className="mt-5 text-lg leading-snug text-gray-500 dark:text-gray-400">
          <Editable
            value={issue.subtitle}
            onChange={(v) => patch({ subtitle: v })}
            placeholder="Subtítulo del issue…"
            multiline
          />
        </div>

        {/* Meta line */}
        <div className="mt-8 flex flex-wrap gap-x-3 gap-y-1 border-y border-black/5 py-4 dark:border-white/10">
          <Editable
            value={issue.issueLabel}
            onChange={(v) => patch({ issueLabel: v })}
            placeholder="Issue 003"
            className="font-mono text-[11px] uppercase tracking-normal text-gray-400 dark:text-gray-500"
          />
          <span className="font-mono text-[11px] text-gray-300 dark:text-gray-600">·</span>
          <Editable
            value={issue.date}
            onChange={(v) => patch({ date: v })}
            placeholder="07 Jun 2026"
            className="font-mono text-[11px] uppercase tracking-normal text-gray-400 dark:text-gray-500"
          />
          <span className="font-mono text-[11px] text-gray-300 dark:text-gray-600">·</span>
          <Editable
            value={issue.readingTime}
            onChange={(v) => patch({ readingTime: v })}
            placeholder="6 min de lectura"
            className="font-mono text-[11px] uppercase tracking-normal text-gray-400 dark:text-gray-500"
          />
        </div>

        {/* 01 — Stories */}
        <SectionHeader index="01 / 05" title="Esta semana en IA" />
        {issue.stories.map((s, i) => (
          <ItemShell
            key={i}
            onRemove={() => patch({ stories: removeAt(issue.stories, i) })}
          >
            <div className="group border-b border-black/5 pb-8 dark:border-white/10">
              <Eyebrow
                value={s.eyebrow}
                onChange={(v) =>
                  patch({ stories: replaceAt(issue.stories, i, { ...s, eyebrow: v }) })
                }
                placeholder="01 · Desarrollo"
              />
              <div className="mt-2 text-2xl font-semibold leading-tight text-gray-900 dark:text-white">
                <Editable
                  value={s.title}
                  onChange={(v) =>
                    patch({ stories: replaceAt(issue.stories, i, { ...s, title: v }) })
                  }
                  placeholder="Título de la historia"
                />
              </div>
              <div className="mt-3 text-[17px] leading-relaxed text-gray-500 dark:text-gray-400">
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
        <SectionHeader index="02 / 05" title="Pensamiento de la semana" />
        <div className="group rounded-2xl border border-black/10 bg-stone-50/60 p-6 dark:border-white/10 dark:bg-white/5">
          <Eyebrow
            value={issue.essay.eyebrow}
            onChange={(v) => patchEssay({ eyebrow: v })}
            placeholder="Ensayo · 3 min"
          />
          <div className="mt-3 text-[26px] font-normal leading-tight text-gray-900 dark:text-white">
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
          <div className="mt-7 border-t border-black/5 pt-5 dark:border-white/10">
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

        {/* 03 — Use cases */}
        <SectionHeader index="03 / 05" title="En qué estamos usando IA" />
        {issue.useCases.map((u, i) => (
          <ItemShell
            key={i}
            onRemove={() => patch({ useCases: removeAt(issue.useCases, i) })}
          >
            <div className="pb-3">
              <IconPicker
                value={u.icon}
                onSelect={(name) =>
                  patch({ useCases: replaceAt(issue.useCases, i, { ...u, icon: name }) })
                }
              />
              <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                <Editable
                  value={u.title}
                  onChange={(v) =>
                    patch({ useCases: replaceAt(issue.useCases, i, { ...u, title: v }) })
                  }
                  placeholder="Título del caso"
                />
              </div>
              <div className="mt-2 text-base leading-relaxed text-gray-500 dark:text-gray-400">
                <Editable
                  value={u.body}
                  onChange={(v) =>
                    patch({ useCases: replaceAt(issue.useCases, i, { ...u, body: v }) })
                  }
                  placeholder="Descripción del caso…"
                  multiline
                />
              </div>
            </div>
          </ItemShell>
        ))}
        <AddButton
          label="+ Añadir caso"
          onClick={() =>
            patch({ useCases: [...issue.useCases, { icon: "", title: "", body: "" } as UseCase] })
          }
        />

        {/* 04 — Events */}
        <SectionHeader
          index="04 / 05"
          editableTitle={issue.eventsLabel}
          onTitleChange={(v) => patch({ eventsLabel: v })}
          titlePlaceholder="Próximos eventos"
        />
        {issue.events.map((e, i) => (
          <ItemShell
            key={i}
            onRemove={() => patch({ events: removeAt(issue.events, i) })}
          >
            <div className="group border-b border-black/5 pb-4 dark:border-white/10">
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
                  value={e.label}
                  onChange={(v) =>
                    patch({ events: replaceAt(issue.events, i, { ...e, label: v }) })
                  }
                  placeholder="AIBM · Online"
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
                { day: "", month: "", label: "", title: "", body: "", href: "" } as EventItem,
              ],
            })
          }
        />

        {/* 05 — Community */}
        <SectionHeader index="05 / 05" title="Comunidad" />
        <div className="rounded-2xl border border-black/10 bg-stone-50/60 p-6 dark:border-white/10 dark:bg-white/5">
          <Eyebrow
            value={issue.community.label}
            onChange={(v) => patchCommunity({ label: v })}
            placeholder="Resumen de la semana"
          />
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold text-gray-900 dark:text-white">
            <Editable
              value={issue.community.title}
              onChange={(v) => patchCommunity({ title: v })}
              placeholder="Automatización"
            />
            <span className="text-base font-normal text-gray-400 dark:text-gray-500">
              <Editable
                value={issue.community.titleSuffix}
                onChange={(v) => patchCommunity({ titleSuffix: v })}
                placeholder="· herramientas dev …"
              />
            </span>
          </div>
          <div className="mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400">
            <Editable
              value={issue.community.body}
              onChange={(v) => patchCommunity({ body: v })}
              placeholder="Cuerpo de comunidad…"
              multiline
            />
          </div>

          {/* Stats lines */}
          <ul className="mt-5 space-y-2">
            {issue.community.stats.map((line, i) => (
              <li key={i} className="group/item flex items-baseline gap-3">
                <span className="font-mono text-xs text-gray-300 dark:text-gray-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 text-base text-gray-600 dark:text-gray-300">
                  <Editable
                    value={line}
                    onChange={(v) =>
                      patchCommunity({
                        stats: replaceAt(issue.community.stats, i, v),
                      })
                    }
                    placeholder="Punto de la semana…"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patchCommunity({ stats: removeAt(issue.community.stats, i) })
                  }
                  className="font-mono text-xs uppercase text-gray-300 opacity-0 transition hover:text-red-500 group-hover/item:opacity-100 dark:text-gray-600 dark:hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <AddButton
            label="+ Añadir línea"
            onClick={() =>
              patchCommunity({ stats: [...issue.community.stats, ""] })
            }
          />
        </div>

        {/* Jobs */}
        <div className="mt-6 space-y-1">
          {issue.jobs.map((j, i) => (
            <ItemShell
              key={i}
              onRemove={() => patch({ jobs: removeAt(issue.jobs, i) })}
            >
              <div className="group border-b border-black/5 pb-4 dark:border-white/10">
                <Eyebrow
                  value={j.label}
                  onChange={(v) =>
                    patch({ jobs: replaceAt(issue.jobs, i, { ...j, label: v }) })
                  }
                  placeholder="Contratando"
                />
                <div className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  <Editable
                    value={j.title}
                    onChange={(v) =>
                      patch({ jobs: replaceAt(issue.jobs, i, { ...j, title: v }) })
                    }
                    placeholder="Puesto"
                  />
                </div>
                <div className="mt-2 text-[15px] text-gray-500 dark:text-gray-400">
                  <Editable
                    value={j.meta}
                    onChange={(v) =>
                      patch({ jobs: replaceAt(issue.jobs, i, { ...j, meta: v }) })
                    }
                    placeholder="Freelance · remoto LatAm"
                  />
                </div>
                <LinkLine
                  value={j.href}
                  onChange={(v) =>
                    patch({ jobs: replaceAt(issue.jobs, i, { ...j, href: v }) })
                  }
                />
              </div>
            </ItemShell>
          ))}
          <AddButton
            label="+ Añadir empleo"
            onClick={() =>
              patch({
                jobs: [...issue.jobs, { label: "", title: "", meta: "", href: "" } as JobItem],
              })
            }
          />
        </div>
      </article>
    </div>
  );
}
