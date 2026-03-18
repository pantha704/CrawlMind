import { generateInvoicePDF } from "./src/lib/invoice-pdf";
import { resend } from "./src/lib/resend";

async function main() {
  const invoiceNumber = "CM-" + new Date().toISOString().split("T")[0].replace(/-/g, "") + "-TEST1";
  const planName = "Scale";
  
  const pdfBuffer = await generateInvoicePDF({
    invoiceNumber,
    date: new Date().toLocaleDateString(),
    customerName: "Pratham Jaiswal",
    customerEmail: "prathamjaiswal204@gmail.com",
    planName,
    amount: 3299,
    paymentId: "pay_testing_67890",
  });

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
      <div style="text-align: center; padding: 32px 0;">
        <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">CrawlMind</h1>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
        <h2 style="color: #0f172a; margin-top: 0;">Payment Successful</h2>
        <p>Hi Pratham,</p>
        <p>Thank you for subscribing to the <strong>CrawlMind ${planName}</strong> plan. Your payment has been successfully processed.</p>
        <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Amount Paid:</span>
            <strong style="color: #0f172a;">INR 3,299.00</strong>
          </p>
        </div>
        <p>You can find your official receipt attached to this email.</p>
        <p style="margin-top: 32px; margin-bottom: 0;">Best regards,<br>The CrawlMind Team</p>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "prathamjaiswal204@gmail.com",
    subject: "Your CrawlMind Subscription Receipt",
    html: htmlContent,
    attachments: [
      {
        filename: `Receipt-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error("Error sending email:", error);
  } else {
    console.log("Email sent successfully:", data);
  }
}

main().catch(console.error);
