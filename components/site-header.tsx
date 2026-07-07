import Link from "next/link";

type Section = "home" | "newsletters" | "talks";

export function SiteHeader({ active = "home" }: { active?: Section }) {
  return (
    <header className="site-header">
      <nav className="pill-nav" aria-label="Navegación principal">
        <Link
          className={`nav-home${active === "home" ? " is-active" : ""}`}
          href="/"
          aria-label="Home"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 10.5 9-7 9 7" />
            <path d="M5 10v10h14V10" />
            <path d="M9 20v-6h6v6" />
          </svg>
        </Link>
        <ul>
          <li>
            <Link
              className={active === "newsletters" ? "is-active" : undefined}
              href="/newsletters"
            >
              Ediciones anteriores
            </Link>
          </li>
          <li>
            <Link className={active === "talks" ? "is-active" : undefined} href="/talks">
              Charlas virtuales
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
