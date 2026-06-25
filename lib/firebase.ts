import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB2e5hXGmUVaV390OlX_pJHwSWNPLtMm0Ic",
  authDomain: "raileats-4be89.firebaseapp.com",
  projectId: "raileats-4be89",
  storageBucket: "raileats-4be89.firebasestorage.app",
  messagingSenderId: "22051437827",
  appId: "1:22051437827:web:fc242bc42ada9c0b74bd36",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
