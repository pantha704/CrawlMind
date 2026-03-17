import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook error: ${errorMessage}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.customer_details?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.customer_details.email },
        });

        if (user) {
          // Stripe checkout session doesn't include line_items by default in the payload unless expanded
          // But we passed the plan via metadata in checkout route!
          const plan = session.metadata?.plan || "PRO";

          const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: plan,
              stripeCustomerId: customerId as string,
            },
          });
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

      // Revert to free tier
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId as string },
        data: { plan: "SPARK" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
