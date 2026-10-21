import { API_BASE_URL } from "../config/api";
import { getAuthToken } from "./authService";

async function readWallet(path) {
  const token = getAuthToken();
  if (!token) throw new Error("برای مشاهده کیف پول وارد حساب شوید.");
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/wallet${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("اتصال به سرور فضاجو برقرار نشد.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true) {
    throw new Error(data?.message || "دریافت اطلاعات کیف پول ناموفق بود.");
  }
  return data;
}

export const getWalletBalance = () => readWallet("/balance");
export const getWalletHistory = () => readWallet("/history?limit=30");

// Local test only; the backend rejects these routes outside fazajoo_restore_test.
export const getTopupRequests = () => readWallet("/topup-requests");
export async function createTopupRequest(amountRial, idempotencyKey) {
  const token = getAuthToken();
  if (!token) throw new Error("برای ادامه وارد حساب شوید.");
  const response = await fetch(`${API_BASE_URL}/wallet/topup-requests`, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amountRial, idempotencyKey }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true) throw new Error(data?.message || "ثبت درخواست شارژ ناموفق بود.");
  return data;
}

// Local demo credit, gated again on the server and actual database identity.
export const getDemoCreditConfig = () => readWallet("/demo-credit/config");
export async function creditDemoWallet(amountRial, idempotencyKey) {
  const token = getAuthToken();
  if (!token) throw new Error("برای ادامه وارد حساب شوید.");
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/wallet/demo-credit`, {
      method: "POST", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amountRial, idempotencyKey }),
    });
  } catch { throw new Error("اتصال به سرور فضاجو برقرار نشد."); }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true) throw new Error(data?.message || "شارژ آزمایشی ناموفق بود.");
  return data;
}
