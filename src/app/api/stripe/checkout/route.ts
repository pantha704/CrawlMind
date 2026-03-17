import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    let priceId = "";
    if (plan === "PRO") priceId = PRICE_IDS.PRO_MONTHLY;
    else if (plan === "SCALE") priceId = PRICE_IDS.SCALE_MONTHLY;

    if (!priceId) {
      return NextResponse.json({ error: "Valid plan is required (PRO or SCALE)" }, { status: 400 });
    }

    // Attempt to get user's existing Stripe customer ID
    // If we wanted to keep track, we could fetch from user
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: dbUser?.stripeCustomerId || undefined,
      customer_email: dbUser?.stripeCustomerId ? undefined : session.user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan: plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
