import dotenv from "dotenv";
import "colors";
import { verifyEmailConfig, sendEmail, getSenderEmail } from "./emailService";

dotenv.config();

const runEmailTest = async (): Promise<void> => {
  console.log("\n========================================".cyan);
  console.log("   Talk-A-Tive Nodemailer SMTP Test".cyan.bold);
  console.log("========================================\n".cyan);

  const emailUser = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD || "";
  const host = process.env.SMTP_HOST || (process.env.EMAIL_SERVICE ? `Service: ${process.env.EMAIL_SERVICE}` : "Default Gmail SMTP");

  console.log(`• Host/Service : ${host}`.gray);
  console.log(`• User / Sender : ${emailUser || "(Not set in .env)"}`.gray);
  console.log(`• Password set : ${rawPass ? "✓ Yes (hidden)" : "✗ No"}`.gray);
  console.log(`• From Header  : ${getSenderEmail()}`.gray);
  console.log("----------------------------------------".gray);

  console.log("1. Verifying SMTP connection...".yellow);
  const result = await verifyEmailConfig();

  if (!result.success) {
    console.error(`\n[Test Failed] Could not establish SMTP connection.`.red.bold);
    process.exit(1);
  }

  const recipient = process.argv[2] || emailUser;

  if (!recipient) {
    console.log(
      "\nSMTP connection verified! To test sending an actual email, provide a recipient address:".green
    );
    console.log("  npx tsx backend/config/testEmail.ts your_test_email@example.com\n".bold);
    process.exit(0);
  }

  console.log(`\n2. Sending test email to ${recipient}...`.yellow);

  try {
    const testInfo = await sendEmail({
      to: recipient,
      subject: "Talk-A-Tive Nodemailer SMTP App Test",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #2563EB; margin-top: 0;">SMTP Test Successful! 🎉</h2>
          <p style="color: #334155; line-height: 1.6;">
            Your Talk-A-Tive application is successfully configured with Nodemailer using the Email SMTP App.
          </p>
          <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px; color: #475569;">
            <strong>Timestamp:</strong> ${new Date().toISOString()}<br/>
            <strong>Sender:</strong> ${getSenderEmail()}<br/>
            <strong>Recipient:</strong> ${recipient}
          </div>
        </div>
      `,
      text: `Talk-A-Tive SMTP Test Successful!\n\nYour application is configured with Nodemailer and ready to send emails.\nTimestamp: ${new Date().toISOString()}`,
    });

    console.log("✓ Test email sent successfully!".green.bold);
    console.log(`Message ID: ${testInfo.messageId || "Sent"}`.gray);
  } catch (error: any) {
    console.error("✗ Failed to send test email:".red.bold, error.message);
    process.exit(1);
  }
};

runEmailTest();
