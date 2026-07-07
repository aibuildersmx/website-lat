import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { searchAudienceSubscribers } from "@/lib/newsletter/subscriber-metrics";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const search = await searchAudienceSubscribers(query);
  return NextResponse.json(search);
}
