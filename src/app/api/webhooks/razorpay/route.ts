import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  try {
    const isValid = validateWebhookSignature(body, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Signature validation failed" }, { status: 400 });
  }

  const event = JSON.parse(body);

  switch (event.event) {
    case "subscription.cancelled":
    case "subscription.halted": {
      const subscriptionId = event.payload?.subscription?.entity?.id;
      if (subscriptionId) {
        await prisma.user.updateMany({
          where: { razorpaySubscriptionId: subscriptionId },
          data: {
            plan: "SPARK",
            razorpaySubscriptionId: null,
          },
        });
      }
      break;
    }

    case "subscription.activated": {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id && sub?.notes?.userId && sub?.notes?.plan) {
        await prisma.user.update({
          where: { id: sub.notes.userId },
          data: {
            plan: sub.notes.plan,
            razorpaySubscriptionId: sub.id,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
