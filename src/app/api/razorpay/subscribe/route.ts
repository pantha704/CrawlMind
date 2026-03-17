import { NextRequest, NextResponse } from "next/server";
import { razorpay, PLAN_IDS } from "@/lib/razorpay";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    let planId = "";
    if (plan === "PRO") planId = PLAN_IDS.PRO;
    else if (plan === "PRO_PLUS") planId = PLAN_IDS.PRO_PLUS;
    else if (plan === "SCALE") planId = PLAN_IDS.SCALE;

    if (!planId) {
      return NextResponse.json(
        { error: "Valid plan is required (PRO, PRO_PLUS, or SCALE)" },
        { status: 400 }
      );
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // 12 billing cycles (1 year)
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: session.user.id,
        plan: plan,
        email: session.user.email,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: unknown) {
    console.error("Razorpay Subscribe Error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
