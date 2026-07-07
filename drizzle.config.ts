import { defineConfig } from "drizzle-kit";
import { existsSync, readFileSync } from "node:fs";

function envValue(name: string): string {
  if (process.env[name]) return process.env[name];
  const envPath = ".env.local";
  if (!existsSync(envPath)) return "";

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  if (!line) return "";

  const value = line.slice(name.length + 1).trim();
  return value.replace(/^['"]|['"]$/g, "");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: envValue("DATABASE_URL"),
  },
});
