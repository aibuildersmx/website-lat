CREATE TABLE "virtual_talks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"meta" text DEFAULT 'Virtual Talk' NOT NULL,
	"href" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "virtual_talks_href_idx" ON "virtual_talks" USING btree ("href");--> statement-breakpoint
CREATE INDEX "virtual_talks_position_idx" ON "virtual_talks" USING btree ("position");--> statement-breakpoint
INSERT INTO "virtual_talks" ("title", "body", "meta", "href", "position", "published") VALUES
  (
    'How I Use AI: Juan Martinez',
    'Chat y Q&A con Juan Martinez, ex ingeniero de QA en Cursor y founder de Workfly, con demo en vivo y aprendizajes de su camino hacia Silicon Valley.',
    'Virtual Talk · 09 Jul 2026',
    'https://luma.com/3iyi3bsr',
    10,
    true
  ),
  (
    'How I Use AI #7: WhatsApp Voicebots',
    'Daniel Torres muestra cómo programa su agente de voz Geeky para resumir mensajes de grupos de WhatsApp en formato de voicenote.',
    'Virtual Talk · 24 Jun 2026',
    'https://luma.com/vhwcyvjr',
    20,
    true
  ),
  (
    'How I Use AI - Vol 2',
    'Diana Padilla muestra cómo integrar Claude Code con SQL para conversar con tus datos y obtener respuestas sin escribir queries manualmente.',
    'Virtual Talk · 12 Feb 2026',
    'https://luma.com/lgd37763',
    30,
    true
  ),
  (
    'How I Use AI #3: Midjourney',
    'Sesión práctica para explorar Midjourney desde cero: Style References, Moodboards, Style Creator y formas de sacarle más jugo a la herramienta.',
    'Virtual Talk · 19 Feb 2026',
    'https://luma.com/d342anny',
    40,
    true
  ),
  (
    'How I Use AI #4: OpenClaw',
    'Ricardo Garcia explica qué es OpenClaw, cómo instalarlo, conectar proveedores de modelos, usar skills y mantener una instalación segura.',
    'Virtual Talk · 05 Mar 2026',
    'https://luma.com/5ivardas',
    50,
    true
  ),
  (
    'How I Use AI #5: Image Manipulation',
    'Sesión sobre creación, manipulación y edición de imágenes con herramientas como Reve, incluyendo edición in-frame, filtros, annotations y objetos.',
    'Virtual Talk · 01 Apr 2026',
    'https://luma.com/wsj293yt',
    60,
    true
  ),
  (
    'How I Use AI #6: Scaling to 1M users',
    'Esteban Constante comparte el motor de crecimiento usado en Leonardo AI para llegar de cero a un millón de usuarios y cómo pensar como growth hacker.',
    'Virtual Talk · 16 Apr 2026',
    'https://luma.com/11fz6ef5',
    70,
    true
  ),
  (
    'How I Use AI - Vol 1',
    'Foro virtual de demos cortas para ver cómo personas de distintas industrias usan ChatGPT, Claude, Perplexity, Gemini y otras herramientas en su trabajo diario.',
    'Virtual Talk · 07 Oct 2025',
    'https://luma.com/pi3ebsn2',
    80,
    true
  )
ON CONFLICT ("href") DO NOTHING;
