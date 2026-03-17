import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { razorpaySubscriptionId: true },
    });

    if (!user?.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    await razorpay.subscriptions.cancel(user.razorpaySubscriptionId);

    // Revert to free plan
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        plan: "SPARK",
        razorpaySubscriptionId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Razorpay Cancel Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
