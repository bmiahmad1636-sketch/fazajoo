import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const AUTH_EMAIL_DOMAIN = "auth.fazajoo.local";

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

const getFirebaseAuthErrorMessage = (error) => {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "این شماره موبایل قبلاً ثبت‌نام کرده است.";

    case "auth/invalid-email":
      return "شماره موبایل واردشده معتبر نیست.";

    case "auth/weak-password":
      return "رمز عبور باید حداقل ۶ کاراکتر باشد.";

    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "شماره موبایل یا رمز عبور اشتباه است.";

    case "auth/too-many-requests":
      return "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";

    case "auth/network-request-failed":
      return "اتصال اینترنت برقرار نیست.";

    case "auth/operation-not-allowed":
      return "ورود با رمز عبور در Firebase فعال نشده است.";

    default:
      return error?.message || "در انجام عملیات مشکلی پیش آمد.";
  }
};

export const registerWithPhoneAndPassword = async ({
  phone,
  password,
  displayName = "",
}) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!isValidIranianPhoneNumber(normalizedPhone)) {
    throw new Error("شماره موبایل را به شکل 09123456789 وارد کنید.");
  }

  if (password.length < 6) {
    throw new Error("رمز عبور باید حداقل ۶ کاراکتر باشد.");
  }

  const internalEmail = phoneToInternalEmail(normalizedPhone);

  let credential = null;

  try {
    credential = await createUserWithEmailAndPassword(
      auth,
      internalEmail,
      password
    );

    const { user } = credential;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,

      phone: normalizedPhone,
      phoneNormalized: normalizedPhone,
      phoneVerified: false,

      displayName: displayName.trim(),

      authMethod: "password",
      authProvider: "firebase-password",
      authVersion: 1,

      internalEmail,

      accountStatus: "active",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return user;
  } catch (error) {
    if (credential?.user) {
      try {
        await deleteUser(credential.user);
      } catch (rollbackError) {
        console.error("Register rollback error:", rollbackError);
      }
    }

    throw new Error(getFirebaseAuthErrorMessage(error));
  }
};

export const loginWithPhoneAndPassword = async ({
  phone,
  password,
}) => {
  try {
    const internalEmail = phoneToInternalEmail(phone);

    const credential = await signInWithEmailAndPassword(
      auth,
      internalEmail,
      password
    );

    return credential.user;
  } catch (error) {
    throw new Error(getFirebaseAuthErrorMessage(error));
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getFirebaseAuthErrorMessage(error));
  }
};