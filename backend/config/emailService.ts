import nodemailer from "nodemailer";
import type { Transporter, SentMessageInfo } from "nodemailer";
import "colors";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

let transporter: Transporter | null = null;

const sanitizePassword = (pass: string | undefined): string => {
  if (!pass) return "";
  return String(pass).trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");
};

export const getTransporter = async (): Promise<Transporter> => {
  if (transporter) return transporter;

  const emailUser = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD || "";
  const emailPass = sanitizePassword(rawPass);

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const emailService = process.env.EMAIL_SERVICE?.trim();

  // 1. Custom SMTP Configuration
  if (smtpHost && emailUser) {
    const isPort465 = smtpPort === 465;
    const isSecure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === "true"
        : isPort465;

    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || (isSecure ? 465 : 587),
      secure: isSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    console.log(
      `[Email Service] Configured with SMTP Host: ${smtpHost}:${smtpPort || (isSecure ? 465 : 587)} (${emailUser})`.cyan
    );
    return transporter;
  }

  // 2. Email Service-based SMTP App (e.g. Gmail App Password)
  if (emailUser && emailPass) {
    const serviceName = emailService || (emailUser.toLowerCase().includes("@gmail.com") ? "gmail" : undefined);

    if (serviceName) {
      transporter = nodemailer.createTransport({
        service: serviceName,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log(
        `[Email Service] Configured with ${serviceName.toUpperCase()} SMTP App (${emailUser})`.cyan
      );
      return transporter;
    }

    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    console.log(`[Email Service] Configured with default Gmail SMTP (${emailUser})`.cyan);
    return transporter;
  }

  // 3. Fallback for development if no SMTP credentials are provided in .env
  console.warn(
    `[Email Service] ⚠️  No SMTP credentials found in .env (EMAIL_USER / EMAIL_PASS).`.yellow
  );

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
    console.log(`[Email Service] Temporary Ethereal test account initialized: ${testAccount.user}`.cyan);
    return transporter;
  } catch (err: any) {
    console.warn("[Email Service] Could not initialize Ethereal. Using mock fallback.", err.message);
    const mockTransporter: any = {
      verify: async () => true,
      sendMail: async (mailOptions: any) => {
        console.log(`[Email Service Mock] To: ${mailOptions.to}, Subject: ${mailOptions.subject}`);
        return { messageId: "mock-" + Date.now() };
      },
    };
    transporter = mockTransporter as Transporter;
    return transporter;
  }
};

export interface VerifyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export const verifyEmailConfig = async (): Promise<VerifyResult> => {
  try {
    const mailer = await getTransporter();
    if (mailer && typeof mailer.verify === "function") {
      await mailer.verify();
      console.log("[Email Service] ✓ SMTP connection verified and ready to send emails.".green.bold);
      return { success: true };
    }
    return { success: true, message: "Mock transporter active" };
  } catch (error: any) {
    console.error("[Email Service] ✗ SMTP connection verification failed:".red.bold, error.message);
    if (error.code === "EAUTH" || (error.message && error.message.includes("535"))) {
      console.error(
        "[Email Service] 💡 Hint: Authentication failed. For Gmail, ensure you have enabled 2-Step Verification and generated a 16-character App Password.".yellow
      );
    }
    return { success: false, error: error.message };
  }
};

export const getSenderEmail = (): string => {
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
    return process.env.EMAIL_FROM.trim();
  }
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  if (user) {
    return `"Talk-A-Tive" <${user}>`;
  }
  return '"Talk-A-Tive" <no-reply@talkative.com>';
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<SentMessageInfo> => {
  const mailer = await getTransporter();
  const senderEmail = getSenderEmail();

  const mailOptions = {
    from: senderEmail,
    to,
    subject,
    text: text || html?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html,
  };

  const info = await mailer.sendMail(mailOptions);

  if (nodemailer.getTestMessageUrl && info) {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log(`[Email Preview Ethereal]: ${preview}`.cyan.bold);
    }
  }

  return info;
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string
): Promise<SentMessageInfo> => {
  const verifyUrl = `${CLIENT_URL}/verify-email?token=${verificationToken}`;

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

  const text = `Hello ${name || "there"},\n\nThank you for joining Talk-A-Tive! Please verify your email address using the following link:\n${verifyUrl}\n\nIf you did not sign up, please ignore this email.`;

  return sendEmail({
    to: email,
    subject: "Verify your email address for Talk-A-Tive",
    html,
    text,
  });
};

export const sendVerificationCodeEmail = async (
  email: string,
  name: string,
  code: string
): Promise<SentMessageInfo> => {
  console.log(`[Email Service] 6-digit verification code for ${email}: ${code}`.green.bold);

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Talk-A-Tive</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Account Verification Code</p>
      </div>
      <div style="padding: 32px 28px; color: #1e293b;">
        <p style="font-size: 16px; margin: 0 0 16px 0;">Hello <strong>${name || "there"}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
          Thank you for joining Talk-A-Tive! Please enter the 6-digit verification code below to verify your email and complete your account creation:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #2563EB; border-radius: 12px; padding: 18px 32px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563EB; margin-bottom: 6px;">
              Verification Code
            </div>
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; padding-left: 8px;">
              ${code}
            </div>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
          ⏱️ This code will expire in <strong>10 minutes</strong>.<br/>
          If you did not request this verification code, please ignore this email.
        </p>
      </div>
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Never share this code with anyone. Talk-A-Tive will never ask for your verification code.
      </div>
    </div>
  `;

  const text = `Hello ${name || "there"},\n\nYour 6-digit verification code for Talk-A-Tive is:\n\n${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, you can safely ignore this email.`;

  return sendEmail({
    to: email,
    subject: `Your 6-Digit Verification Code: ${code} - Talk-A-Tive`,
    html,
    text,
  });
};

export interface SendInviteEmailOptions {
  recipientEmail: string;
  inviterName: string;
  inviteType?: "direct" | "group";
  chatName?: string;
  token: string;
}

export const sendInviteEmail = async ({
  recipientEmail,
  inviterName,
  inviteType = "direct",
  chatName,
  token,
}: SendInviteEmailOptions): Promise<SentMessageInfo> => {
  const inviteUrl = `${CLIENT_URL}/invite/${token}`;
  const isGroup = inviteType === "group";
  const title = isGroup
    ? `${inviterName} invited you to join "${chatName}"`
    : `${inviterName} invited you to chat on Talk-A-Tive`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, ${isGroup ? "#7C3AED 0%, #2563EB 100%" : "#2563EB 0%, #10B981 100%"}); padding: 32px 24px; text-align: center; color: #ffffff;">
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

  const text = `Hello,\n\n${inviterName} has invited you to ${isGroup ? `join the group chat "${chatName}"` : "start a conversation"} on Talk-A-Tive.\n\nAccept your invitation here:\n${inviteUrl}\n\nThis invitation is valid for 7 days.`;

  return sendEmail({
    to: recipientEmail,
    subject: title,
    html,
    text,
  });
};

