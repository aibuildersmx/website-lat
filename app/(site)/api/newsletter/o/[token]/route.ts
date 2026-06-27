import { NextRequest, NextResponse } from "next/server";
import { logEvent, verifyTrackToken } from "@/lib/newsletter/tracking";

// First-party open pixel. The email embeds a signed 1×1 image at
//   /api/newsletter/o/<contactId>.gif?i=<issueId>&s=<sig>
// On a valid signature we log an `open` event; either way we return the GIF so the
// image never breaks. Resend's own open tracking stays OFF — we measure here.

// 43-byte fully transparent 1×1 GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function gif(): NextResponse {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "content-type": "image/gif",
      "content-length": String(PIXEL.length),
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      pragma: "no-cache",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const contactId = token.replace(/\.gif$/i, "");
  const issueId = req.nextUrl.searchParams.get("i") ?? "";
  const sig = req.nextUrl.searchParams.get("s") ?? "";

  if (verifyTrackToken(contactId, issueId, sig)) {
    await logEvent({
      issueId,
      contactId,
      type: "open",
      userAgent: req.headers.get("user-agent"),
    });
  }

  return gif();
}
