import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email: string, code: string, purpose: string) {
  const purposeLabel: Record<string, string> = {
    login: "Login",
    register: "Registrasi",
    "change-password": "Ganti Password",
    oauth: "Login OAuth",
  };

  const label = purposeLabel[purpose] ?? purpose;

  await transporter.sendMail({
    from: `"Fin-Techno" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Kode OTP ${label} Anda`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Kode OTP ${label}</h2>
        <p style="color: #444;">Gunakan kode berikut untuk melanjutkan:</p>
        <div style="background: #f4f4f4; border-radius: 8px; padding: 16px 24px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #1a1a1a;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px; margin-top: 16px;">Kode berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.</p>
      </div>
    `,
  });
}
