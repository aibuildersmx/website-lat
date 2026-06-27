import Link from "next/link";

// Tarjeta de métrica. Si recibe `href`, toda la tarjeta es un link con hover.
export function StatCard({
  eyebrow,
  value,
  sublabel,
  href,
}: {
  eyebrow: string;
  value: string;
  sublabel?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
        {eyebrow}
      </p>
      <p className="mt-2 text-3xl font-medium text-gray-800 dark:text-gray-100">{value}</p>
      {sublabel && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>
      )}
    </>
  );

  const base =
    "block rounded-2xl border border-black/5 bg-white p-6 transition dark:border-white/10 dark:bg-neutral-900";

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} hover:border-black/20 dark:hover:border-white/25`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
