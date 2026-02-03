import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, text } = {}) {
  if (!to) return;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const mailOptions = {
    from,
    to,
    subject,
    ...(html ? { html } : { text }),
  };
  await transporter.sendMail(mailOptions);
}
