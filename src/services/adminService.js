import { getAuthToken } from "./authService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:6060/api";


async function request(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );


  const data = await response
    .json()
    .catch(() => null);


  if (!response.ok || data?.ok === false) {
    throw new Error(
      data?.message ||
      "خطا در ارتباط با سرور مدیریت فضاجو"
    );
  }


  return data;
}


// دریافت همه کاربران برای پنل مدیریت
export async function getAdminUsers() {
  const data = await request(
    "/admin/users"
  );

  return data.users || [];
}


// تایید مشاور
export async function approveAgent(userId) {
  return await request(
    `/admin/users/${userId}/approve`,
    {
      method: "PATCH",
    }
  );
}


// رد درخواست مشاور
export async function rejectAgent(userId) {
  return await request(
    `/admin/users/${userId}/reject`,
    {
      method: "PATCH",
    }
  );
}