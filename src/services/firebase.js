import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: " ",
  authDomain: "lifeline-connect-d1e89.firebaseapp.com",
  projectId: "lifeline-connect-d1e89",
  storageBucket: "lifeline-connect-d1e89.firebasestorage.app",
  messagingSenderId: "796048873674",
  appId: "1:796048873674:web:4faaab6c663db7c354fc33"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

