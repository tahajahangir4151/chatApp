import nodemailer from "nodemailer";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  // 1. Check custom SMTP configuration in .env
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("[Email Service] Configured with custom SMTP host".cyan);
    return transporter;
  }

  // 2. Check service-based SMTP (e.g. Gmail) in .env
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log("[Email Service] Configured with EMAIL_USER service".cyan);
    return transporter;
  }

  // 3. Fallback: Ethereal test account for seamless local testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(
      `[Email Service] Using Ethereal test mailer (No credentials set in .env)`.yellow
    );
    return transporter;
  } catch (err) {
    console.warn("[Email Service] Could not initialize Ethereal. Mocking send.", err.message);
    // Mock fallback
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`[Email Service Mock] To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
        return { messageId: "mock-" + Date.now() };
      },
    };
    return transporter;
  }
};

/**
 * Send email verification link to new user
 */
export const sendVerificationEmail = async (email, name, verificationToken) => {
  const mailer = await getTransporter();
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${verificationToken}`;
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Talk-A-Tive" <no-reply@talkative.com>';

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Talk-A-Tive</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Verify your email address</p>
      </div>
      <div style="padding: 32px 28px; color: #1e293b;">
        <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${name || "there"}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          Thank you for joining Talk-A-Tive! To activate your account and start chatting with friends, please verify your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 24px 0 0 0;">
          Or copy and paste this link in your browser:<br/>
          <a href="${verifyUrl}" style="color: #2563EB; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        If you did not sign up for Talk-A-Tive, you can safely ignore this email.
      </div>
    </div>
  `;

  const info = await mailer.sendMail({
    from: senderEmail,
    to: email,
    subject: "Verify your email address for Talk-A-Tive",
    html,
  });

  if (nodemailer.getTestMessageUrl && info) {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`[Email Preview] Verification Link: ${verifyUrl}`);
      console.log(`[Email Preview Ethereal]: ${preview}`.cyan.bold);
    }
  }

  return info;
};

/**
 * Send chat invite link (1-on-1 or Group Chat)
 */
export const sendInviteEmail = async ({
  recipientEmail,
  inviterName,
  inviteType = "direct",
  chatName,
  token,
}) => {
  const mailer = await getTransporter();
  const inviteUrl = `${CLIENT_URL}/invite/${token}`;
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Talk-A-Tive" <no-reply@talkative.com>';

  const isGroup = inviteType === "group";
  const title = isGroup
    ? `${inviterName} invited you to join "${chatName}"`
    : `${inviterName} invited you to chat on Talk-A-Tive`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, ${isGroup ? '#7C3AED 0%, #2563EB 100%' : '#2563EB 0%, #10B981 100%'}); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Talk-A-Tive</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">You received a chat invitation!</p>
      </div>
      <div style="padding: 32px 28px; color: #1e293b;">
        <p style="font-size: 16px; margin: 0 0 16px 0;">Hello,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          <strong>${inviterName}</strong> has invited you to ${isGroup ? `join the group chat <strong>"${chatName}"</strong>` : `start a conversation`} on Talk-A-Tive.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            ${isGroup ? `👥 Group: <strong>${chatName}</strong>` : `💬 Direct Message with <strong>${inviterName}</strong>`}
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
            Accept Invite & Start Chatting
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 24px 0 0 0;">
          If you don't have an account yet, you will be prompted to quickly set one up and jump right into the chat!<br/>
          Direct link: <a href="${inviteUrl}" style="color: #2563EB; word-break: break-all;">${inviteUrl}</a>
        </p>
      </div>
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        This invitation is valid for 7 days.
      </div>
    </div>
  `;

  const info = await mailer.sendMail({
    from: senderEmail,
    to: recipientEmail,
    subject: title,
    html,
  });

  if (nodemailer.getTestMessageUrl && info) {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`[Email Preview] Invite Link: ${inviteUrl}`);
      console.log(`[Email Preview Ethereal]: ${preview}`.cyan.bold);
    }
  }

  return info;
};
