import bcrypt from "bcrypt";
import { prisma } from "../prismaClient.js";

// Persistent, brute-force-resistant email OTP store.
// Replaces the previous in-memory Map, which silently broke across
// serverless / multi-instance deployments (code set on one instance was
// never visible on another).

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5; // lock the code after this many wrong guesses

/**
 * Store a freshly generated OTP for an email (hashed, single active code).
 */
export async function saveOtp(email, code) {
  const codeHash = await bcrypt.hash(String(code), 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.emailOtp.upsert({
    where: { email },
    update: { codeHash, expiresAt, attempts: 0 },
    create: { email, codeHash, expiresAt, attempts: 0 },
  });
}

/**
 * Verify an OTP. Consumes the code on success, increments the attempt
 * counter on failure, and locks the code after OTP_MAX_ATTEMPTS.
 *
 * @returns {Promise<{ ok: boolean, reason?: "not_found"|"expired"|"locked"|"mismatch" }>}
 */
export async function checkOtp(email, code) {
  const record = await prisma.emailOtp.findUnique({ where: { email } });

  if (!record) return { ok: false, reason: "not_found" };

  if (Date.now() > new Date(record.expiresAt).getTime()) {
    await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
    return { ok: false, reason: "locked" };
  }

  const matches = await bcrypt.compare(String(code), record.codeHash);

  if (!matches) {
    await prisma.emailOtp
      .update({ where: { email }, data: { attempts: { increment: 1 } } })
      .catch(() => {});
    return { ok: false, reason: "mismatch" };
  }

  // success — consume the code so it can't be reused
  await prisma.emailOtp.delete({ where: { email } }).catch(() => {});
  return { ok: true };
}
