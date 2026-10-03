import { API_BASE_URL } from "../config/api";
export async function getPublicAgencyProfile(userId) {
  const response = await fetch(
    `${API_BASE_URL}/agency/public/${encodeURIComponent(userId)}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.ok === false) {
    throw new Error(
      data?.message || "دریافت پروفایل عمومی مشاور انجام نشد."
    );
  }

  return data?.profile || null;
}
