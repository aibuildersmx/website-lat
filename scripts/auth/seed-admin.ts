import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error("Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD before running.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "DATABASE_URL is not set. For a local run use Railway's public proxy:\n" +
        '  export DATABASE_URL="$(railway variables --service Postgres --kv | grep \'^DATABASE_PUBLIC_URL=\' | cut -d= -f2-)"',
    );
    process.exit(1);
  }

  const { db } = await import("../../lib/db/client");
  const { users } = await import("../../lib/db/schema");
  const { hashPassword } = await import("../../lib/auth/password");

  const passwordHash = await hashPassword(password);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existing[0]) {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email));
    console.log(`Updated admin password for ${email}.`);
  } else {
    await db.insert(users).values({ email, passwordHash, role: "admin" });
    console.log(`Created admin user ${email}.`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
