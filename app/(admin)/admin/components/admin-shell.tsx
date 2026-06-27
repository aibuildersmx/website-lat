"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Mail, Menu, X, ChevronUp } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { identityForEmail } from "@/lib/admin/avatars";

// Footer pinned to the bottom of the sidebar: theme toggle above the divider
// (right-aligned), then the avatar row. Clicking the avatar opens an upward
// dropdown with "Salir". Each render (desktop + mobile drawer) gets its own
// open state.
function AccountFooter({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const identity = identityForEmail(email);
  const initial = (identity?.name ?? email).trim().charAt(0).toUpperCase();

  return (
    <div>
      {/* Theme toggle — above the divider, right-aligned. */}
      <div className="flex justify-end px-3 py-2">
        <ThemeToggle />
      </div>

      <div className="relative border-t border-black/5 dark:border-white/10">
        {menuOpen && (
          <>
            {/* Click-away backdrop. */}
            <button
              type="button"
              aria-label="Cerrar menú de cuenta"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            {/* Dropdown — opens upward. */}
            <div className="absolute bottom-full left-3 right-3 z-20 mb-2 overflow-hidden rounded-xl border border-black/5 bg-white shadow-lg dark:border-white/10 dark:bg-neutral-800">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.2em] text-gray-600 transition hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                  Salir
                </button>
              </form>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
        >
          {identity ? (
            <Image
              src={identity.avatar}
              alt={identity.name}
              width={64}
              height={64}
              className="h-9 w-9 shrink-0 rounded-full object-cover grayscale"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 font-mono text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {identity && (
              <p className="truncate text-sm text-gray-800 dark:text-gray-100">{identity.name}</p>
            )}
            <p className="truncate text-xs font-medium text-gray-400 dark:text-gray-500">
              {email}
            </p>
          </div>
          <ChevronUp
            className={`h-4 w-4 shrink-0 text-gray-400 transition ${menuOpen ? "" : "rotate-180"}`}
            strokeWidth={1.75}
          />
        </button>
      </div>
    </div>
  );
}

// Sidebar entries. All admins see every entry — access is currently flat
// (every logged-in user is an admin). When role-based gating lands, add an
// optional `requires` predicate here and filter against the user's role.
const NAV: { href: string; label: string; section: string; icon: typeof Home; exact?: boolean }[] = [
  { href: "/admin/newsletter", label: "Newsletter", section: "The Build Log", icon: Mail },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Wordmark SVG is white artwork: invert it to black on light backgrounds,
// keep it white in dark mode.
function Logo() {
  return (
    <Image
      src="/AIBM-logo-dark.svg"
      alt="AI Builders México"
      width={393}
      height={95}
      unoptimized
      className="h-5.5 w-auto invert dark:invert-0"
    />
  );
}

export function AdminShell({
  email,
  signOutAction,
  children,
}: {
  email: string;
  signOutAction: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Group entries by their section label, preserving first-seen order.
  const sections: { name: string; items: typeof NAV }[] = [];
  for (const item of NAV) {
    let group = sections.find((s) => s.name === item.section);
    if (!group) {
      group = { name: item.section, items: [] };
      sections.push(group);
    }
    group.items.push(item);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
      {sections.map((section) => (
        <div key={section.name}>
          <p className="px-3 pb-2 text-xs font-medium text-gray-400 dark:text-gray-500">
            {section.name}
          </p>
          <ul className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = <AccountFooter email={email} signOutAction={signOutAction} />;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-neutral-950">
      {/* Desktop sidebar — fixed left. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-black/5 bg-white md:flex dark:border-white/10 dark:bg-neutral-900">
        <Link
          href="/admin"
          className="flex h-16 shrink-0 items-center border-b border-black/5 px-5 dark:border-white/10"
        >
          <Logo />
        </Link>
        {nav}
        {account}
      </aside>

      {/* Mobile topbar. */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-black/5 bg-white px-4 md:hidden dark:border-white/10 dark:bg-neutral-900">
        <Link href="/admin" className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="rounded-lg p-2 text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Mobile drawer. */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl dark:bg-neutral-900">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 px-4 dark:border-white/10">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            {nav}
            {account}
          </aside>
        </div>
      )}

      {/* Content — offset by the sidebar width on desktop. */}
      <div className="md:pl-60">
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">{children}</main>
      </div>
    </div>
  );
}
