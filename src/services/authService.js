const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:6060/api";

const TOKEN_STORAGE_KEY = "fazajoo_auth_token";
const USER_STORAGE_KEY = "fazajoo_auth_user";
const AUTH_EMAIL_DOMAIN = "auth.fazajoo.local";

const authListeners = new Set();
let currentSessionUser = null;

export const convertDigitsToEnglish = (value = "") =>
  String(value)
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));

export const normalizePhoneNumber = (value = "") => {
  const digits = convertDigitsToEnglish(value).replace(/\D/g, "");

  if (digits.startsWith("0098")) {
    return `0${digits.slice(4, 14)}`;
  }

  if (digits.startsWith("98")) {
    return `0${digits.slice(2, 12)}`;
  }

  if (digits.startsWith("9") && digits.length <= 10) {
    return `0${digits}`;
  }

  return digits.slice(0, 11);
};

export const isValidIranianPhoneNumber = (phone) =>
  /^09\d{9}$/.test(normalizePhoneNumber(phone));

export const phoneToInternalEmail = (phone) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!isValidIranianPhoneNumber(normalizedPhone)) {
    throw new Error("شماره موبایل معتبر نیست.");
  }

  return `${normalizedPhone}@${AUTH_EMAIL_DOMAIN}`;
};

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn("Local auth storage warning:", error);
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.warn("Clear auth storage warning:", error);
  }
}

function notifyAuthListeners(user) {
  currentSessionUser = user;

  for (const listener of authListeners) {
    try {
      listener(user);
    } catch (error) {
      console.error("Auth listener error:", error);
    }
  }
}

export function subscribeToAuth(listener) {
  authListeners.add(listener);

  return () => {
    authListeners.delete(listener);
  };
}

export function getCurrentSessionUser() {
  return currentSessionUser || getStoredUser();
}

export function getAuthToken() {
  return getStoredToken();
}

function makeSessionUser(backendUser) {
  if (!backendUser) return null;

  return {
    ...backendUser,
    backendId: backendUser.id,
    uid: backendUser.id,
    firebaseUid: null,
    displayName:
      backendUser.fullName ||
      backendUser.displayName ||
      "",
    phoneNormalized: backendUser.phone || "",
    email:
      backendUser.email ||
      (backendUser.phone
        ? `${backendUser.phone}@${AUTH_EMAIL_DOMAIN}`
        : ""),
  };
}

class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "اتصال به سرور فضاجو برقرار نشد. مطمئن شوید Backend روی پورت 6060 روشن است."
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "پاسخ سرور فضاجو قابل خواندن نیست.",
      response.status
    );
  }

  if (!response.ok || data?.ok === false) {
    throw new ApiError(
      data?.message || "در انجام عملیات مشکلی پیش آمد.",
      response.status,
      data
    );
  }

  return data;
}

async function backendLogin(phone, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

async function backendRegister({ phone, password, displayName = "" }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      phone,
      password,
      fullName: displayName.trim(),
    }),
  });
}

export async function initializeAuthSession() {
  const token = getStoredToken();

  if (!token) {
    currentSessionUser = null;
    return null;
  }

  try {
    const data = await apiRequest("/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const sessionUser = makeSessionUser(data.user);

    saveSession(token, sessionUser);
    notifyAuthListeners(sessionUser);

    return sessionUser;
  } catch (error) {
    console.warn(
      "Stored backend session is invalid:",
      error?.message || error
    );

    clearStoredSession();
    notifyAuthListeners(null);
    return null;
  }
}

export const registerWithPhoneAndPassword = async ({
  phone,
  password,
  displayName = "",
}) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!isValidIranianPhoneNumber(normalizedPhone)) {
    throw new Error(
      "شماره موبایل را به شکل 09123456789 وارد کنید."
    );
  }

  if (new TextEncoder().encode(password).length < 8) {
    throw new Error(
      "رمز عبور باید حداقل ۸ کاراکتر باشد."
    );
  }

  const data = await backendRegister({
    phone: normalizedPhone,
    password,
    displayName,
  });

  const sessionUser = makeSessionUser(data.user);

  saveSession(data.token, sessionUser);
  notifyAuthListeners(sessionUser);

  return sessionUser;
};

export const loginWithPhoneAndPassword = async ({
  phone,
  password,
}) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!isValidIranianPhoneNumber(normalizedPhone)) {
    throw new Error(
      "شماره موبایل را به شکل 09123456789 وارد کنید."
    );
  }

  const data = await backendLogin(
    normalizedPhone,
    password
  );

  const sessionUser = makeSessionUser(data.user);

  saveSession(data.token, sessionUser);
  notifyAuthListeners(sessionUser);

  return sessionUser;
};

export const logoutUser = async () => {
  clearStoredSession();
  notifyAuthListeners(null);
};
