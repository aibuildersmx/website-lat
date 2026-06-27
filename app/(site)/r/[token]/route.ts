import { NextRequest, NextResponse } from "next/server";
import { resolveRedirect } from "@/lib/newsletter/links";
import { logEvent } from "@/lib/newsletter/tracking";

// Signed link redirector for the newsletter. Newsletter bodies link through here
// (aibuilders.mx/r/<token>?s=<sig>) instead of pasting raw third-party URLs, so
// every visible URL in the email stays on our reputable domain. See lib/newsletter/links.ts.
//
//   GET /r/<token>?s=<sig> -> 302 to the signed target URL, or 404 if invalid.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const sig = req.nextUrl.searchParams.get("s") ?? "";
  const target = resolveRedirect(token, sig);

  if (!target) {
    return new NextResponse("Enlace no válido o expirado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  // First-party click attribution. Best-effort: only when both params are present,
  // and never blocks the redirect (logEvent swallows its own errors).
  const contactId = req.nextUrl.searchParams.get("c");
  const issueId = req.nextUrl.searchParams.get("i");
  if (contactId && issueId) {
    await logEvent({
      issueId,
      contactId,
      type: "click",
      url: target,
      userAgent: req.headers.get("user-agent"),
    });
  }

  return NextResponse.redirect(target, { status: 302, headers: { "cache-control": "no-store" } });
}
