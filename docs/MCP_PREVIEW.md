# Build Log MCP — Guía para el autor del newsletter

Este servidor MCP valida y renderiza issues de **The Build Log** para que puedas
iterar el contenido desde tu terminal y entregar un JSON listo para subir.

> **Tu entregable es el `Issue` JSON validado, no el HTML.** El HTML que te
> devuelve el preview es solo para que veas tu trabajo renderizado; quien sube
> el draft y publica es el editor (Ben) desde el composer web.

---

## Tus credenciales

| Campo | Valor |
|---|---|
| **Endpoint** | `https://aibuilders.lat/api/mcp` |
| **Auth** | `Authorization: Bearer <tu-token>` |
| **Token** | (te lo pasan por canal privado — empieza con `aibl_mcp_v1_`) |

El token vence en 90 días y es **solo-preview**: no puede leer, crear ni editar
borradores, mucho menos publicar. Si lo pierdes, avisa para revocarlo y generar
otro. **No lo subas a un repo ni lo pegues en chats públicos.**

## Cómo conectarlo

### Codex

```toml
[mcp_servers.build_log]
url = "https://aibuilders.lat/api/mcp"
bearer_token_env_var = "AI_BUILDERS_MCP_TOKEN"
```

### Claude Code

```bash
claude mcp add --transport http build-log https://aibuilders.lat/api/mcp \
  --header "Authorization: Bearer aibl_mcp_v1_TU_TOKEN"
```

## La tool

**`preview_newsletter_issue({ issue })`**

- Si el issue es **inválido** → `{ valid: false, errors: [...] }` con la ruta
  exacta de cada problema (`issue.stories[2].href: debe ser URL https://, mailto:
  o cadena vacía`). Corrige y reintenta.
- Si es **válido** → `{ valid: true, warnings: [...], html: "..." }`. Guarda el
  `html` en un archivo y ábrelo en el navegador — es el mismo render del envío
  real. Los `warnings` no bloquean, pero atiéndelos (links vacíos, secciones
  vacías, subject demasiado largo).

El esquema completo del `Issue` viene en el `inputSchema` de la tool — tu agente
lo ve solo. Escribe el issue base en el idioma que te acomode (spanglish OK); la
versión en español que se envía la genera el editor en el composer.

## Workflow semanal

1. Conecta también el **MCP de Aiby** y arranca con `get_weekly_digest` (ver su
   guía: `aibuilders-bot/docs/MCP_NEWSLETTER.md`).
2. Arma el `Issue` con ese material: `stories`, `essay`, `useCases`, `projects`
   (del showcase), `events`, `community`, `jobs`.
3. Itera con `preview_newsletter_issue` hasta que se vea bien y sin warnings
   importantes.
4. Entrega el `Issue` JSON final (archivo `.json`) al editor. Fin de tu parte.

## Encabezados editables del Build Log

El título (`title`), el subtítulo (`subtitle`) y los encabezados de sección ya
no están fijos. Campos opcionales del `Issue` (vacío u omitido = el default de
siempre):

| Campo | Default |
|---|---|
| `storiesLabel` | Esta semana en IA |
| `essayLabel` | Pensamiento de la semana |
| `projectsLabel` | Proyectos de la comunidad |
| `eventsLabel` | Próximos eventos |
| `buildersLabel` | Desde AI Builders México |
| `communityLabel` | Comunidad |

En el composer web también se editan directo sobre el canvas.

## Emails sueltos

Para anuncios o invitaciones que **no** son The Build Log: un email libre con
título, cuerpo y un botón opcional. Sale a la misma lista y por el mismo
pipeline (envío por tandas, tracking, link de baja), pero no aparece en el
archivo público ni en el RSS. Es un solo idioma: escríbelo ya en el idioma
final.

```json
{
  "subject": "Hackathon este sábado",
  "preview": "Quedan 20 lugares",
  "title": "Nos vemos el sábado",
  "subtitle": "Build night en CDMX",
  "body": "Hola **builders**.\n\n## Agenda\n\n- 10:00 Kickoff\n- 18:00 Demos\n\nDetalles en [el sitio](https://aibuilders.mx).",
  "cta": { "text": "Regístrate", "href": "https://aibuilders.mx/eventos" }
}
```

`body` acepta markdown restringido: párrafos (línea en blanco), `## encabezado`,
`- lista`, `**negritas**`, `*itálicas*` y `[texto](https://…)` o `mailto:`.
Cualquier otra cosa (incluido HTML) sale como texto literal. No mandes `slug`:
lo asigna el servidor.

| Tool | Quién la ve | Qué hace |
|---|---|---|
| `preview_standalone_email({ email })` | tokens solo-preview y editor completo | valida y devuelve el HTML; no guarda nada |
| `create_standalone_email({ email })` | editor completo | crea el borrador |
| `update_standalone_email({ id, expected_revision, email })` | editor completo | reemplaza el borrador si nadie lo cambió desde que lo leíste |

`list_newsletter_drafts` acepta `kind: "standalone"` y `get_newsletter_draft`
devuelve `email` (en vez de `issue`) para estos borradores.

**Ninguna tool envía.** El envío lo hace una persona desde `/admin/newsletter`
con "Enviar prueba" / "Enviar por tandas".

## Límites

- 20 previews por minuto por token (y 120 requests/min en total).
- Issue de hasta 200 KB serializado.
- Cada request queda en el audit log del sitio.
