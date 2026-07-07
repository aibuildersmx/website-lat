import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

async function main() {
  await db.execute(sql`
    insert into virtual_talks (title, event_date, href, position, published)
    values
      (
        'How I Use AI: Juan Martinez',
        '2026-07-09',
        'https://luma.com/3iyi3bsr',
        10,
        true
      ),
      (
        'How I Use AI #7: WhatsApp Voicebots',
        '2026-06-24',
        'https://luma.com/vhwcyvjr',
        20,
        true
      ),
      (
        'How I Use AI - Vol 2',
        '2026-02-12',
        'https://luma.com/lgd37763',
        30,
        true
      ),
      (
        'How I Use AI #3: Midjourney',
        '2026-02-19',
        'https://luma.com/d342anny',
        40,
        true
      ),
      (
        'How I Use AI #4: OpenClaw',
        '2026-03-05',
        'https://luma.com/5ivardas',
        50,
        true
      ),
      (
        'How I Use AI #5: Image Manipulation',
        '2026-04-01',
        'https://luma.com/wsj293yt',
        60,
        true
      ),
      (
        'How I Use AI #6: Scaling to 1M users',
        '2026-04-16',
        'https://luma.com/11fz6ef5',
        70,
        true
      ),
      (
        'How I Use AI - Vol 1',
        '2025-10-07',
        'https://luma.com/pi3ebsn2',
        80,
        true
      )
    on conflict (href) do nothing
  `);

  const count = await db.execute(sql`select count(*)::int as count from virtual_talks`);
  console.log(`Seed complete. virtual_talks rows: ${count[0]?.count ?? 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$client.end();
});
