import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { generateInvoicePDF } from "@/lib/invoice-pdf";
import { resend } from "@/lib/resend";

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
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        plan: plan || "PRO",
        razorpayCustomerId: razorpay_payment_id,
        razorpaySubscriptionId: razorpay_subscription_id,
      },
    });

    // Determine amount based on plan (mocked mapping, ideally fetch from DB/Config)
    let amount = 0;
    let planName = "Pro";
    if (plan === "PRO") { amount = 999; planName = "Pro"; }
    else if (plan === "PRO_PLUS") { amount = 1999; planName = "Pro+"; }
    else if (plan === "SCALE") { amount = 3299; planName = "Scale"; }

    // Generate unique invoice number
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    const invoiceNumber = `CM-${dateStr}-${randomHex.toUpperCase()}`;

    // Create Invoice in DB
    const invoice = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySubscriptionId: razorpay_subscription_id,
        plan: plan || "PRO",
        amountPaise: amount * 100,
        currency: "INR",
        status: "PAID",
        invoiceNumber,
      },
    });

    // Generate PDF Buffer
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      date: new Date().toLocaleDateString(),
      customerName: updatedUser.name || "Customer",
      customerEmail: updatedUser.email,
      planName,
      amount,
      paymentId: razorpay_payment_id,
    });

    // Send Email via Resend
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: updatedUser.email,
      subject: `Your CrawlMind ${planName} Subscription Invoice`,
      html: `
        <p>Hi ${updatedUser.name || "there"},</p>
        <p>Thank you for subscribing to the CrawlMind <strong>${planName}</strong> plan!</p>
        <p>Your subscription is now active. Please find your receipt attached below.</p>
        <br/>
        <p>Happy Crawling,</p>
        <p>The CrawlMind Team</p>
      `,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return NextResponse.json({ success: true, invoiceId: invoice.id });
  } catch (error: unknown) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
