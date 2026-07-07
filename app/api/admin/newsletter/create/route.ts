import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createIssueDraft } from "@/lib/actions/newsletter";

export async function POST(): Promise<NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await createIssueDraft();
  return NextResponse.json({ id });
}
