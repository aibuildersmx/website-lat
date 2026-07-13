CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"author" text DEFAULT 'Ben Kim' NOT NULL,
	"published_on" date NOT NULL,
	"read_time" text DEFAULT '5 min' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"content" jsonb DEFAULT '{"sections":[]}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "articles_status_date_idx" ON "articles" USING btree ("status","published_on");
--> statement-breakpoint
INSERT INTO "articles" (
	"slug", "title", "description", "author", "published_on", "read_time",
	"tags", "content", "status", "published_at"
) VALUES (
	'gpt-5-6-grok-4-5-carrera-modelos-ia',
	'GPT-5.6, Grok 4.5 y la nueva carrera de modelos de IA',
	'OpenAI y xAI dieron un salto visible, pero no revolucionario. La señal más importante es otra: más equipos se acercan a la frontera y más empresas tendrán que decidir qué datos están dispuestas a compartir.',
	'Ben Kim',
	'2026-07-12',
	'6 min',
	ARRAY['modelos de ia', 'openai', 'xai', 'estrategia'],
	$article${
  "sections": [
    {
      "id": "introduccion",
      "heading": "",
      "body": "Esta fue una semana enorme para la inteligencia artificial, y no es una hipérbole.\n\nOpenAI presentó tres nuevos modelos insignia: Sol, Terra y Luna. Poco después, xAI respondió con Grok 4.5. Los lanzamientos mostraron mejoras claras, pero la historia más importante no está solamente en los benchmarks. Está en cómo se está cerrando la distancia entre laboratorios, cuánto cuesta sostener ese progreso y qué tendrán que hacer las empresas cuyo futuro depende de sus propios modelos."
    },
    {
      "id": "tres-modelos-de-openai",
      "heading": "Los tres modelos de OpenAI",
      "body": "Sol es el modelo más potente de la nueva familia. Está pensado para investigación profunda, análisis, planeación y trabajo crítico. Terra es más rápido y económico, una mejor opción para las tareas cotidianas de programación. Luna es el modelo de frontera más veloz, aunque tiene menor rendimiento que sus hermanos.\n\nActualmente uso GPT-5.6 Sol Medium para la mayoría de mis tareas. Ultra ha sido demasiado exhaustivo —y lento— para casi todo lo que hago. Medium ofrece un mejor equilibrio entre profundidad y velocidad para el trabajo diario.\n\nEsta segmentación también dice algo sobre el estado del mercado: ya no basta con lanzar un solo modelo que intente servir para todo. Los laboratorios están construyendo familias completas para distintos niveles de costo, latencia y complejidad."
    },
    {
      "id": "respuesta-de-xai",
      "heading": "La respuesta de xAI",
      "body": "xAI contraatacó con Grok 4.5, desarrollado con apoyo del equipo de investigación de Cursor. Al mismo tiempo, Cursor continúa invirtiendo en sus modelos Composer basados en Kimi.\n\nEl contexto importa. Con talento importante saliendo este año de los equipos de investigación y fundadores de Grok, xAI necesita reforzar sus filas. La adquisición por parte de SpaceX vuelve a parecer una decisión estratégica: le da acceso a capital, infraestructura y una posición más fuerte para competir en una carrera que exige cada vez más recursos."
    },
    {
      "id": "tres-senales",
      "heading": "Las tres señales importantes",
      "body": "Hay tres cosas que vale la pena observar.\n\n1. **Los equipos y laboratorios más pequeños están alcanzando de manera significativa a OpenAI y Anthropic.** La frontera ya no pertenece únicamente a dos organizaciones. Cada lanzamiento competitivo reduce la distancia y aumenta la presión sobre los líderes.\n\n2. **La familia GPT sigue manteniendo una ligera ventaja entre los modelos de consumo de última generación.** La diferencia existe, pero es menos amplia y menos permanente de lo que solía parecer.\n\n3. **Las mejoras de GPT y Grok fueron perceptibles, pero no transformadoras.** Seguiremos viendo una desaceleración del rendimiento. Sin visibilidad sobre los márgenes, es difícil saber cuánto del avance depende de subsidios de cómputo y cuánto representa una mejora genuina del modelo.\n\nEsta última distinción será cada vez más importante. Un modelo puede mejorar en evaluaciones y aun así ser un peor negocio si cada punto adicional de rendimiento requiere una cantidad desproporcionada de infraestructura."
    },
    {
      "id": "dilema-de-los-datos",
      "heading": "El dilema de los datos",
      "body": "Como nota final, vimos a [Comma.ai](https://comma.ai/) unirse a Alibaba en su embargo a los modelos de Anthropic. La empresa citó preocupaciones de privacidad y competencia relacionadas con entregar datos propietarios a laboratorios que podrían convertirse en competidores.\n\nCreo que esta tendencia crecerá. Las empresas que ya entrenan modelos internos, que operan cerca de esta categoría o que dependen a largo plazo de desarrollar modelos propios tendrán que considerar un embargo a Claude y, potencialmente, a OpenAI.\n\nCursor encajaba perfectamente en esta categoría antes de apoyarse en Kimi y modelos de código abierto para entrar al mercado con Composer. Muchas compañías enfrentarán la misma decisión:\n\n> **¿Vale la pena entregar datos de entrenamiento altamente valiosos a los laboratorios de frontera a cambio de la productividad que ofrecen sus modelos, o conviene imponer un embargo ahora —y aceptar un menor desempeño organizacional— para conservar la posibilidad de competir después?**\n\nNo existe una respuesta universal. Pero a medida que los modelos se vuelvan más parecidos y los datos propietarios más valiosos, esta pregunta dejará de ser teórica. Se convertirá en una decisión estratégica para cualquier empresa que aspire a construir, y no solamente consumir, inteligencia artificial."
    }
  ]
}$article$::jsonb,
	'published',
	now()
) ON CONFLICT ("slug") DO NOTHING;
