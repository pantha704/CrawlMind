import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only allow the owner of the invoice to download it
    if (invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine plan name based on DB
    let planName = "Pro";
    if (invoice.plan === "PRO_PLUS") planName = "Pro+";
    if (invoice.plan === "SCALE") planName = "Scale";

    // Generate the PDF
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.createdAt.toLocaleDateString(),
      customerName: invoice.user.name || "Customer",
      customerEmail: invoice.user.email,
      planName,
      amount: invoice.amountPaise / 100, // Convert back to standard currency
      paymentId: invoice.razorpayPaymentId,
    });

    // Return the PDF buffer as a downloadable response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`,
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
