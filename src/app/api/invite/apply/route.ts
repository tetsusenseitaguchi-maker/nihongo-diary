import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("code" in body) || typeof (body as { code: unknown }).code !== "string") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const code = (body as { code: string }).code.trim();
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: result, error } = await supabase.rpc("apply_invite", {
    p_inviter_code: code,
  });

  if (error) {
    console.error("[invite/apply]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ result });
}
