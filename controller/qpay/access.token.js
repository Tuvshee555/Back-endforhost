import axios from "axios";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL;
let cachedToken = null;
let tokenExpiry = null;


export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const body = {
      username: process.env.QPAY_USERNAME,
      password: process.env.QPAY_PASSWORD,
    };

    const res = await axios.post(`${QPAY_BASE_URL}/auth/token`, body, {
      auth: {
        username: process.env.QPAY_USERNAME,
        password: process.env.QPAY_PASSWORD,
      },
      headers: { "Content-Type": "application/json" },
    });

    cachedToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 30) * 1000;

    console.log("✅ New QPay token backend:", cachedToken);
    return cachedToken;
  } catch (err) {
    console.error("❌ Failed to get QPay token:", err.response?.data || err.message);
    throw err;
  }
}