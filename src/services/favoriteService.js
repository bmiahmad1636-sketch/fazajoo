import { getAuthToken } from "./authService";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:6060/api";

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    const error = new Error("برای ادامه باید وارد حساب شوید.");
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.ok === false) {
    const error = new Error(
      data?.message || "ارتباط با سرور فضاجو ناموفق بود."
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function changed() {
  window.dispatchEvent(
    new Event("fazajoo:favorites-changed")
  );
}

export async function getFavorites() {
  const data = await request("/favorites");
  return data.favorites || [];
}

export async function getFavoriteStatus(spaceId) {
  const data = await request(`/favorites/${spaceId}/status`);
  return Boolean(data.isFavorite);
}

export async function addFavorite(spaceId) {
  const data = await request(`/favorites/${spaceId}`, {
    method: "POST",
  });
  changed();
  return data;
}

export async function removeFavorite(spaceId) {
  const data = await request(`/favorites/${spaceId}`, {
    method: "DELETE",
  });
  changed();
  return data;
}
