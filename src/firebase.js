import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA9POAMMEVpF_4BoqgacYrkO72K-KABxsk",
  authDomain: "seniorassassin-ddbrother.firebaseapp.com",
  projectId: "seniorassassin-ddbrother",
  storageBucket: "seniorassassin-ddbrother.firebasestorage.app",
  messagingSenderId: "464388291912",
  appId: "1:464388291912:web:placeholder" // Added fallback for initialization if not provided
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
