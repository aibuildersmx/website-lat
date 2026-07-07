ALTER TABLE "virtual_talks" ADD COLUMN IF NOT EXISTS "event_date" date;
--> statement-breakpoint
UPDATE "virtual_talks"
SET "event_date" = CASE "href"
  WHEN 'https://luma.com/3iyi3bsr' THEN '2026-07-09'::date
  WHEN 'https://luma.com/vhwcyvjr' THEN '2026-06-24'::date
  WHEN 'https://luma.com/lgd37763' THEN '2026-02-12'::date
  WHEN 'https://luma.com/d342anny' THEN '2026-02-19'::date
  WHEN 'https://luma.com/5ivardas' THEN '2026-03-05'::date
  WHEN 'https://luma.com/wsj293yt' THEN '2026-04-01'::date
  WHEN 'https://luma.com/11fz6ef5' THEN '2026-04-16'::date
  WHEN 'https://luma.com/pi3ebsn2' THEN '2025-10-07'::date
  ELSE COALESCE("event_date", "created_at"::date)
END
WHERE "event_date" IS NULL;
--> statement-breakpoint
ALTER TABLE "virtual_talks" ALTER COLUMN "event_date" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "virtual_talks" DROP COLUMN IF EXISTS "body";
--> statement-breakpoint
ALTER TABLE "virtual_talks" DROP COLUMN IF EXISTS "meta";
