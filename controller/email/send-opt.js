import { transporter } from "../../utils/mailer.js";
import { otpStore } from "../../utils/otp-store.js";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Имэйл оруулна уу" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 1000 * 300, // 5 minutes
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Таны баталгаажуулах код",
      html: `<h1>${otp}</h1>`,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.log("SEND OTP ERROR:", err);
    return res.status(500).json({ message: "Имэйл илгээхэд алдаа" });
  }
};