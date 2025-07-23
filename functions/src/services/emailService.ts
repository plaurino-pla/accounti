import mailgun from 'mailgun-js';
import * as functions from 'firebase-functions';

class EmailService {
  private mailgun: mailgun.Mailgun;
  private fromEmail: string;

  constructor() {
    const apiKey = functions.config().mailgun?.api_key || process.env.MAILGUN_API_KEY || '';
    const domain = functions.config().mailgun?.domain || process.env.MAILGUN_DOMAIN || '';

    if (!apiKey || !domain) {
      console.error("Mailgun API key or domain is not configured.");
      // In a real app, you might want to throw an error or handle this differently.
    }

    this.mailgun = mailgun({ apiKey, domain });
    this.fromEmail = `Accounti <mailgun@${domain}>`;
  }

  async sendInvoiceProcessedNotification(to: string, invoiceCount: number, vendorName?: string) {
    const subject = `New Invoice Processed: ${vendorName || 'Invoice'}`;
    const html = `
      <h1>New Invoice Processed!</h1>
      <p>Hello,</p>
      <p>We have successfully processed a new invoice for you.</p>
      <p><b>Vendor:</b> ${vendorName || 'N/A'}</p>
      <p>You can view all your processed invoices in your Accounti dashboard.</p>
      <br>
      <p>Thank you for using Accounti!</p>
    `;

    const data: mailgun.messages.SendData = {
      from: this.fromEmail,
      to,
      subject,
      html,
    };

    try {
      await this.mailgun.messages().send(data);
      console.log(`Invoice processed notification sent to ${to}`);
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
    }
  }
}

export default new EmailService(); 