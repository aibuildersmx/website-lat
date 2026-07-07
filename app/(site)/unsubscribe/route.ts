import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { contacts } from "@/lib/db/schema";
import { verifyUnsub } from "@/lib/newsletter/unsubscribe";
import { logEvent } from "@/lib/newsletter/tracking";

// Self-hosted unsubscribe endpoint (replaces Resend Audiences).
//   GET  -> confirmation page. Does NOT unsubscribe — a bare visit (or a Gmail/
//           scanner link prefetch) must never drop someone. The page POSTs back.
//   POST -> actually unsubscribes. Fired by the confirmation button AND by the
//           RFC 8058 one-click header (Gmail/Yahoo native button, already a
//           deliberate action). Both verify the HMAC token first.

async function unsubscribe(contactId: string): Promise<void> {
  await db
    .update(contacts)
    .set({
      newsletterSubscribed: false,
      newsletterUnsubscribedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));
}

async function contactEmail(contactId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: contacts.email })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  return row?.email ?? null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Black-and-white shell matching the site: Instrument Serif headings, Geist Mono
// eyebrows/labels, near-black on white, AIBM wordmark at the top.
function shell(title: string, inner: string): NextResponse {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · AI Builders MX</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Instrument+Serif&display=swap" rel="stylesheet">
<style>
  :root{--ink:#212121;--muted:#6b7280;--line:rgba(0,0,0,.1);}
  *{box-sizing:border-box;}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
       background:#fff;color:var(--ink);
       font-family:'Geist','Geist Sans',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
       -webkit-font-smoothing:antialiased;}
  .card{width:100%;max-width:460px;text-align:center;}
  .logo{height:26px;width:auto;margin:0 auto 40px;display:block;}
  .eyebrow{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;font-weight:500;
           letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin:0 0 18px;}
  h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:42px;line-height:1.1;
     margin:0 0 18px;color:var(--ink);}
  p{font-size:16px;line-height:1.6;color:var(--muted);margin:0 auto 8px;max-width:380px;}
  p .em{color:var(--ink);font-weight:500;}
  .actions{margin-top:36px;display:flex;flex-direction:column;align-items:center;gap:18px;}
  button.confirm{appearance:none;border:none;cursor:pointer;background:var(--ink);color:#fff;
           font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;font-weight:500;
           letter-spacing:.12em;text-transform:uppercase;border-radius:9999px;padding:15px 30px;
           transition:opacity .15s ease;}
  button.confirm:hover{opacity:.82;}
  a.stay{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;
         text-transform:uppercase;color:var(--muted);text-decoration:none;border-bottom:1px solid var(--line);
         padding-bottom:2px;}
  a.stay:hover{color:var(--ink);}
  .home{margin-top:44px;}
  .home a{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;
          text-transform:uppercase;color:var(--muted);text-decoration:none;}
  .home a:hover{color:var(--ink);}
</style></head>
<body><div class="card">
  <img class="logo" src="/AIBM-logo-light-bg.svg" alt="AI Builders MX" width="120" height="26">
  ${inner}
</div></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const c = req.nextUrl.searchParams.get("c") ?? "";
  const i = req.nextUrl.searchParams.get("i") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";

  if (!verifyUnsub(c, t, i || null)) {
    return shell(
      "Enlace inválido",
      `<p class="eyebrow">The Build Log</p>
       <h1>Enlace inválido</h1>
       <p>No pudimos verificar este enlace de baja. Si quieres dejar de recibir el
       newsletter, responde a cualquier correo y lo hacemos manualmente.</p>
       <div class="home"><a href="https://aibuilders.mx">← Volver a aibuilders.mx</a></div>`,
    );
  }

  const email = await contactEmail(c);
  const where = email ? ` en <span class="em">${esc(email)}</span>` : "";
  const issue = i ? `&i=${encodeURIComponent(i)}` : "";
  const action = `/unsubscribe?c=${encodeURIComponent(c)}${issue}&t=${encodeURIComponent(t)}`;

  return shell(
    "¿Cancelar suscripción?",
    `<p class="eyebrow">The Build Log</p>
     <h1>¿Cancelar tu suscripción?</h1>
     <p>Estás a punto de dejar de recibir The Build Log${where}. No te enviaremos más correos.</p>
     <div class="actions">
       <form method="POST" action="${esc(action)}">
         <button type="submit" class="confirm">Sí, cancelar suscripción</button>
       </form>
       <a class="stay" href="https://aibuilders.mx">No, mantenerme suscrito</a>
     </div>`,
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const c = req.nextUrl.searchParams.get("c") ?? "";
  const i = req.nextUrl.searchParams.get("i") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!verifyUnsub(c, t, i || null)) {
    return new NextResponse(null, { status: 400 });
  }
  await unsubscribe(c);
  if (i) {
    await logEvent({
      issueId: i,
      contactId: c,
      type: "unsubscribe",
      userAgent: req.headers.get("user-agent"),
    });
  }
  return shell(
    "Suscripción cancelada",
    `<p class="eyebrow">The Build Log</p>
     <h1>Listo, suscripción cancelada</h1>
     <p>Ya no recibirás The Build Log. Puedes volver a suscribirte cuando quieras desde el sitio.</p>
     <div class="home"><a href="https://aibuilders.mx">← Volver a aibuilders.mx</a></div>`,
  );
}
