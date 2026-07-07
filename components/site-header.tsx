import Link from "next/link";
import Image from "next/image";

type Section = "home" | "newsletters" | "blog" | "talks";

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
              Newsletter
            </Link>
          </li>
          <li className="nav-blog-item">
            <Link className={active === "blog" ? "is-active" : undefined} href="/blog">
              Blog
            </Link>
          </li>
          <li>
            <Link className={active === "talks" ? "is-active" : undefined} href="/talks">
              Charlas
            </Link>
          </li>
          <li>
            <a href="https://vacantes.lat" target="_blank" rel="noreferrer">
              Vacantes
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
