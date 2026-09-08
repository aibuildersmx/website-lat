import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/app/(admin)/admin/components/theme-toggle";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-stone-100 px-4 dark:bg-neutral-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Link href="/">
            <Image
              src="/aibl-logo.svg"
              alt="AI Builders Latam"
              width={393}
              height={95}
              className="mx-auto h-6 w-auto brightness-0 dark:invert"
              unoptimized
            />
          </Link>
        </div>
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-medium text-gray-800 dark:text-gray-100">
            Nueva contraseña
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Usa al menos 10 caracteres.
          </p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
