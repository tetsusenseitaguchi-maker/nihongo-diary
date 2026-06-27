import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated", authError: authError?.message });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, preferred_language, timezone")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    userId: user.id,
    userEmail: user.email,
    rawPlan: profile?.plan ?? null,
    normalizedPlan: normalizePlan(profile?.plan),
    profileError: profileError?.message ?? null,
    profileFound: !!profile,
  });
}
