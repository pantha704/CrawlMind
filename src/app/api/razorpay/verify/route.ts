import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      plan,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    // Verify the payment signature
    const isValid = validatePaymentVerification(
      {
        subscription_id: razorpay_subscription_id,
        payment_id: razorpay_payment_id,
      },
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET!
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // Update user plan
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        plan: plan || "PRO",
        razorpayCustomerId: razorpay_payment_id,
        razorpaySubscriptionId: razorpay_subscription_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
