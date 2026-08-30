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

// تأیید مشاور
export async function approveAgent(userId) {
  return request(
    `/admin/users/${userId}/approve-agent`,
    {
      method: "PATCH",
    }
  );
}

// رد درخواست مشاور
export async function rejectAgent(userId) {
  return request(
    `/admin/users/${userId}/reject-agent`,
    {
      method: "PATCH",
    }
  );
}

export async function getAdminDocumentBlob(userId, documentType, download = false) {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/admin/users/${encodeURIComponent(userId)}/documents/${encodeURIComponent(documentType)}${download ? "?download=1" : ""}`,
    {
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message ||
        "دریافت مدرک از سرور مدیریت فضاجو انجام نشد."
    );
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("Content-Disposition") || "",
  };
}


// سهمیه فرصت‌های شبکه مشاوران تأییدشده
export async function getAdminNetworkAgents() {
  const data = await request("/admin/network/agents");
  return data.agents || [];
}

// شارژ دستی بسته فرصت شبکه برای یک مشاور
export async function grantAdminNetworkCredits(userId, amount) {
  return request(`/admin/network/agents/${encodeURIComponent(userId)}/grant`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}
