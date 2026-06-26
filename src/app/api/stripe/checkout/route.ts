import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRICES, SITE_URL, type PaidPlan } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body: { plan?: string } = await req.json();
  const plan = body.plan as PaidPlan | undefined;

  if (plan !== "plus" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch existing Stripe customer ID to consolidate billing history
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .single();

  // Don't allow downgrade via checkout (same plan)
  if (profile?.plan === plan) {
    return NextResponse.json({ error: "Already on this plan" }, { status: 409 });
  }

  try {
    const stripe = getStripe();
    const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: STRIPE_PRICES[plan], quantity: 1 }],
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      success_url: `${SITE_URL}/upgrade/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/upgrade`,
      allow_promotion_codes: true,
    };

    if (profile?.stripe_customer_id) {
      params.customer = profile.stripe_customer_id;
    } else {
      params.customer_email = user.email ?? undefined;
    }

    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
