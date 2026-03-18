import { jsPDF } from "jspdf";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  paymentId: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set fonts and colors
  doc.setFont("helvetica");

  // Title
  doc.setFontSize(24);
  doc.setTextColor(6, 182, 212); // Primary cyan
  doc.text("CrawlMind", 20, 20);

  // Invoice Head
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", 150, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice Number: ${data.invoiceNumber}`, 150, 30);
  doc.text(`Date: ${data.date}`, 150, 35);
  doc.text(`Payment ID: ${data.paymentId}`, 150, 40);

  // Customer Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Billed To:", 20, 50);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(data.customerName, 20, 57);
  doc.text(data.customerEmail, 20, 62);

  // Line Items Header
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 80, 170, 10, "F");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Description", 25, 87);
  doc.text("Amount", 160, 87);

  // Line Items
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`CrawlMind ${data.planName} Subscription`, 25, 100);
  doc.text(`INR ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 160, 100);

  // Total
  doc.setLineWidth(0.5);
  doc.line(20, 110, 190, 110);
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Total", 130, 120);
  doc.text(`INR ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 160, 120);

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const footerText = "Thank you for subscribing to CrawlMind! For any queries, please reply to this email.";
  doc.text(footerText, 105, 280, { align: "center" });

  // Output as buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
