import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STRIPE_PRICES } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Which Stripe price IDs this deployment actually has.
 *
 * The gap this closes: an unset STRIPE_PRICE_* variable cannot fail a build
 * (the `!` in lib/stripe.ts is compile-time only) and cannot fail a boot
 * (getStripe is lazy). Before this route the first sign of a missing one was
 * a webhook arriving with a price nothing matched.
 *
 * Booleans only. A price ID is not a secret in the way a key is, but it is
 * still configuration, and an endpoint that prints configuration is one that
 * gets pasted into a bug report. Presence is the entire question here.
 *
 * Auth is the same as debug/plan: any signed-in user. That is enough for
 * something whose whole output is four true/false values, and it keeps this
 * route the same shape as its sibling.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const isSet = (v: string | undefined) => typeof v === "string" && v.length > 0;

  const configured = {
    plus: {
      monthly: isSet(STRIPE_PRICES.plus.monthly),
      yearly: isSet(STRIPE_PRICES.plus.yearly),
    },
    pro: {
      monthly: isSet(STRIPE_PRICES.pro.monthly),
      yearly: isSet(STRIPE_PRICES.pro.yearly),
    },
  };

  const allConfigured = Object.values(configured).every((plan) =>
    Object.values(plan).every(Boolean),
  );

  return NextResponse.json({ configured, allConfigured });
}
