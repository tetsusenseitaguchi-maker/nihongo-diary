import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRICES, SITE_URL, parseCadence, type PaidPlan } from "@/lib/stripe";
import { isProEnabled } from "@/lib/plan-visibility";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body: { plan?: string; cadence?: string } = await req.json();
  const plan = body.plan as PaidPlan | undefined;

  if (plan !== "plus" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Pro off sale is refused here too, not only hidden in the UI — the same
  // reasoning as parseCadence and ?cadence=yearly: a flag that only removes a
  // button can be walked around with a hand-written POST. Checked before the
  // auth lookup, alongside the plan allowlist it belongs with, so the answer
  // does not depend on who is asking.
  //
  // This closes the Stripe side completely. It cannot close the IAP side: a
  // native purchase goes straight to a product that is still live in App Store
  // Connect, and keeping those products registered is what makes the flag
  // reversible without a review. Accepted — see lib/plan-visibility.ts.
  //
  // Nothing about an EXISTING Pro subscription passes through here. Renewals
  // arrive at the webhooks, which do not read this flag.
  if (plan === "pro" && !isProEnabled()) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Anything that is not exactly "yearly" bills monthly — the same one-item
  // allowlist the page uses on the query string, so a hand-edited request
  // cannot reach a price id that does not exist.
  const cadence = parseCadence(body.cadence);

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
    .select("stripe_customer_id, stripe_subscription_id, plan, billing_source")
    .eq("id", user.id)
    .single();

  // Don't allow downgrade via checkout (same plan)
  if (profile?.plan === plan) {
    return NextResponse.json({ error: "Already on this plan" }, { status: 409 });
  }

  // Don't create a second subscription for someone who already has one — a
  // fresh Checkout Session here would leave the old subscription active
  // alongside the new one (double billing), and the webhook has no way to
  // tell which subscription's events should win. Plan changes for existing
  // subscribers go through the billing portal instead, which updates the
  // existing subscription in place.
  if (profile?.stripe_subscription_id) {
    return NextResponse.json(
      {
        error: "You already have an active subscription. Manage your plan from the billing portal.",
        requiresPortal: true,
      },
      { status: 409 },
    );
  }

  // Same idea, cross-platform: someone paying via Apple IAP shouldn't be
  // able to start a separate Stripe subscription for the same account —
  // that's the gap the revenuecat/webhook + stripe/webhook billing_source
  // guards can't fully close on their own, since checkout/route.ts is the
  // only place that runs *before* Stripe has ever heard of this attempt.
  if (profile?.billing_source === "apple_iap") {
    return NextResponse.json(
      {
        error: "You already have an active subscription via the App Store. Manage your plan from your iOS device's subscription settings.",
        requiresPortal: false,
      },
      { status: 409 },
    );
  }

  try {
    const stripe = getStripe();
    const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: STRIPE_PRICES[plan][cadence], quantity: 1 }],
      client_reference_id: user.id,
      // plan is what the webhook reads back on checkout.session.completed;
      // cadence rides along for the audit trail, not for any branch.
      metadata: { userId: user.id, plan, cadence },
      success_url: `${SITE_URL}/upgrade/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/upgrade${cadence === "yearly" ? "?cadence=yearly" : ""}`,
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
