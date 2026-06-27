import type { Metadata } from "next";
import "./admin.css";
import { ThemeProvider } from "@/components/theme-provider";
import { adminFontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Admin · AI Builders",
  description: "Panel de administración de AI Builders México.",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${adminFontVariables} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="aibm-admin-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
