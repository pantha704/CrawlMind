import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, message, page } = await req.json();

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        rating,
        message: message || null,
        page: page || null,
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error: unknown) {
    console.error("Feedback POST Error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check last feedback timestamp to enforce 3-day cooldown
    const lastFeedback = await prisma.feedback.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    let canPrompt = true;
    if (lastFeedback) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      if (lastFeedback.createdAt > threeDaysAgo) {
        canPrompt = false;
      }
    }

    return NextResponse.json({ canPrompt });
  } catch (error: unknown) {
    console.error("Feedback GET Error:", error);
    return NextResponse.json({ canPrompt: false }, { status: 500 });
  }
}
