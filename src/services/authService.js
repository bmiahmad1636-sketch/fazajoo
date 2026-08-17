import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

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
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }

    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
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

function makeSessionUser(backendUser, firebaseUser = null) {
  if (!backendUser) {
    return null;
  }

  const firebaseUid = firebaseUser?.uid || null;

  return {
    ...backendUser,

    backendId: backendUser.id,

    // Compatibility for pages that still expect Firebase's user.uid.
    // When the Firebase bridge is unavailable, uid falls back to backend id.
    uid: firebaseUid || backendUser.id,
    firebaseUid,

    displayName:
      backendUser.fullName ||
      backendUser.displayName ||
      "",

    phoneNormalized: backendUser.phone || "",

    email:
      backendUser.phone
        ? `${backendUser.phone}@${AUTH_EMAIL_DOMAIN}`
        : "",
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
  } catch (error) {
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

function withTimeout(promise, timeoutMs = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Firebase compatibility timeout"));
      }, timeoutMs);
    }),
  ]);
}

function waitForFirebaseUser(timeoutMs = 1200) {
  return new Promise((resolve) => {
    let finished = false;
    let unsubscribe = null;

    const finish = (user) => {
      if (finished) return;
      finished = true;

      if (unsubscribe) {
        unsubscribe();
      }

      resolve(user || null);
    };

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => finish(user),
      () => finish(null)
    );

    window.setTimeout(() => {
      finish(auth.currentUser);
    }, timeoutMs);
  });
}

async function getLegacyProfile(firebaseUser) {
  if (!firebaseUser?.uid) {
    return null;
  }

  try {
    const snapshot = await withTimeout(
      getDoc(doc(db, "users", firebaseUser.uid)),
      3000
    );

    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.warn("Legacy profile bridge unavailable:", error?.message || error);
    return null;
  }
}

async function tryFirebaseLoginBridge(phone, password) {
  try {
    const internalEmail = phoneToInternalEmail(phone);

    const credential = await withTimeout(
      signInWithEmailAndPassword(auth, internalEmail, password),
      4000
    );

    return credential.user;
  } catch (error) {
    console.warn(
      "Firebase login bridge unavailable; backend session remains active:",
      error?.code || error?.message || error
    );

    return null;
  }
}

async function tryFirebaseRegisterBridge({
  phone,
  password,
  displayName = "",
}) {
  const internalEmail = phoneToInternalEmail(phone);

  try {
    const credential = await withTimeout(
      createUserWithEmailAndPassword(auth, internalEmail, password),
      4000
    );

    const firebaseUser = credential.user;

    try {
      await withTimeout(
        setDoc(
          doc(db, "users", firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            phone,
            phoneNormalized: phone,
            phoneVerified: false,
            displayName: displayName.trim(),
            authMethod: "password",
            authProvider: "fazajoo-backend-primary",
            authVersion: 2,
            internalEmail,
            accountStatus: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
        4000
      );
    } catch (profileError) {
      console.warn(
        "Legacy Firebase profile bridge warning:",
        profileError?.message || profileError
      );
    }

    return firebaseUser;
  } catch (error) {
    if (error?.code === "auth/email-already-in-use") {
      return tryFirebaseLoginBridge(phone, password);
    }

    console.warn(
      "Firebase register bridge unavailable; backend account is already valid:",
      error?.code || error?.message || error
    );

    return null;
  }
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

async function tryMigrateLegacyFirebaseUser({ phone, password }) {
  const firebaseUser = await tryFirebaseLoginBridge(phone, password);

  if (!firebaseUser) {
    return null;
  }

  const legacyProfile = await getLegacyProfile(firebaseUser);

  try {
    const registration = await backendRegister({
      phone,
      password,
      displayName:
        legacyProfile?.displayName ||
        legacyProfile?.agentName ||
        "",
    });

    return {
      data: registration,
      firebaseUser,
    };
  } catch (error) {
    if (error?.status === 409) {
      const loginData = await backendLogin(phone, password);

      return {
        data: loginData,
        firebaseUser,
      };
    }

    throw error;
  }
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

    const firebaseUser = await waitForFirebaseUser();
    const sessionUser = makeSessionUser(data.user, firebaseUser);

    saveSession(token, sessionUser);
    notifyAuthListeners(sessionUser);

    return sessionUser;
  } catch (error) {
    console.warn("Stored backend session is invalid:", error?.message || error);
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
    throw new Error("شماره موبایل را به شکل 09123456789 وارد کنید.");
  }

  if (new TextEncoder().encode(password).length < 8) {
    throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد.");
  }

  const data = await backendRegister({
    phone: normalizedPhone,
    password,
    displayName,
  });

  saveSession(data.token, data.user);

  // Temporary compatibility bridge while Firestore sections are migrated.
  const firebaseUser = await tryFirebaseRegisterBridge({
    phone: normalizedPhone,
    password,
    displayName,
  });

  const sessionUser = makeSessionUser(data.user, firebaseUser);

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
    throw new Error("شماره موبایل را به شکل 09123456789 وارد کنید.");
  }

  let data;
  let firebaseUser = null;

  try {
    data = await backendLogin(normalizedPhone, password);

    // Best-effort bridge keeps existing Firestore features working during migration.
    firebaseUser = await tryFirebaseLoginBridge(
      normalizedPhone,
      password
    );
  } catch (error) {
    if (error?.status !== 401 && error?.status !== 404) {
      throw error;
    }

    // Existing Firebase users are lazily copied into PostgreSQL on first login.
    const migrated = await tryMigrateLegacyFirebaseUser({
      phone: normalizedPhone,
      password,
    });

    if (!migrated) {
      throw new Error("شماره موبایل یا رمز عبور اشتباه است.");
    }

    data = migrated.data;
    firebaseUser = migrated.firebaseUser;
  }

  const sessionUser = makeSessionUser(data.user, firebaseUser);

  saveSession(data.token, sessionUser);
  notifyAuthListeners(sessionUser);

  return sessionUser;
};

export const logoutUser = async () => {
  clearStoredSession();
  notifyAuthListeners(null);

  try {
    await withTimeout(signOut(auth), 2500);
  } catch (error) {
    console.warn("Firebase logout bridge warning:", error?.message || error);
  }
};
