import Link from "next/link";
import Image from "next/image";

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
          <Image
            src="/AIBL-logo-light-bg.svg"
            alt=""
            width={393}
            height={95}
            className="nav-home-logo"
            unoptimized
          />
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
