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
| **Endpoint** | `https://aibuilders.mx/api/mcp` |
| **Auth** | `Authorization: Bearer <tu-token>` |
| **Token** | (te lo pasan por canal privado — empieza con `aibl_mcp_v1_`) |

El token vence en 90 días y es **solo-preview**: no puede leer, crear ni editar
borradores, mucho menos publicar. Si lo pierdes, avisa para revocarlo y generar
otro. **No lo subas a un repo ni lo pegues en chats públicos.**

## Cómo conectarlo

### Codex

```toml
[mcp_servers.build_log]
url = "https://aibuilders.mx/api/mcp"
bearer_token_env_var = "AI_BUILDERS_MCP_TOKEN"
```

### Claude Code

```bash
claude mcp add --transport http build-log https://aibuilders.mx/api/mcp \
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

## Límites

- 20 previews por minuto por token (y 120 requests/min en total).
- Issue de hasta 200 KB serializado.
- Cada request queda en el audit log del sitio.
