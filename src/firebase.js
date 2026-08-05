import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBUs8i5uwetfHXDDHmFylxA4Z3UZRa7iNU",
  authDomain: "fazajoo-6616d.firebaseapp.com",
  projectId: "fazajoo-6616d",
  storageBucket: "fazajoo-6616d.firebasestorage.app",
  messagingSenderId: "393488201193",
  appId: "1:393488201193:web:0fc0addd5a77508d59c778",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;