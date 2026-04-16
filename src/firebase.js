import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA9POAMMEVpF_4BoqgacYrkO72K-KABxsk",
  authDomain: "seniorassassin-ddbrother.firebaseapp.com",
  projectId: "seniorassassin-ddbrother",
  storageBucket: "seniorassassin-ddbrother.firebasestorage.app",
  messagingSenderId: "464388291912",
  appId: "1:464388291912:web:0b6f79e0fab1693b1e077d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// googleProvider is kept for any direct use, but login now goes through
// the server-side OAuth flow in /api/auth/google-start.
export const googleProvider = new GoogleAuthProvider();
