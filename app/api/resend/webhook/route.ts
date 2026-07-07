import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { Resend, type WebhookEventPayload } from "resend";
import { db } from "@/lib/db/client";
import { contacts, newsletterSends } from "@/lib/db/schema";
import { logEvent } from "@/lib/newsletter/tracking";

function webhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET is not set");
  return secret;
}

function resendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

function eventType(type: WebhookEventPayload["type"]) {
  switch (type) {
    case "email.delivered":
      return "delivered";
    case "email.bounced":
    case "email.failed":
    case "email.suppressed":
      return "bounce";
    case "email.complained":
      return "complaint";
    default:
      return null;
  }
}

async function sendForEmailId(emailId: string) {
  const [row] = await db
    .select({
      issueId: newsletterSends.issueId,
      contactId: newsletterSends.contactId,
    })
    .from(newsletterSends)
    .where(eq(newsletterSends.resendId, emailId))
    .limit(1);
  return row ?? null;
}

async function suppressContact(contactId: string): Promise<void> {
  await db
    .update(contacts)
    .set({
      newsletterSubscribed: false,
      newsletterUnsubscribedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let event: WebhookEventPayload;
  try {
    const payload = await req.text();
    event = resendClient().webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: webhookSecret(),
    });
  } catch (error) {
    console.error("[resend-webhook] invalid webhook:", error);
    return new NextResponse("Invalid webhook", { status: 400 });
  }

  const type = eventType(event.type);
  if (!type || !("email_id" in event.data)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const send = await sendForEmailId(event.data.email_id);
  if (!send) {
    console.warn("[resend-webhook] send row not found:", event.type, event.data.email_id);
    return NextResponse.json({ ok: true, matched: false });
  }

  await logEvent({
    issueId: send.issueId,
    contactId: send.contactId,
    type,
    url: "click" in event.data ? event.data.click.link : null,
  });

  if (type === "complaint" || event.type === "email.suppressed") {
    await suppressContact(send.contactId);
  }

  return NextResponse.json({ ok: true });
}
