import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA9POAMMEVpF_4BoqgacYrkO72K-KABxsk",
  // Use our own Vercel domain so the auth handler runs on the same origin.
  // vercel.json proxies /__/* to Firebase, avoiding cross-origin storage partitioning.
  authDomain: "seniorassassin26.vercel.app",
  projectId: "seniorassassin-ddbrother",
  storageBucket: "seniorassassin-ddbrother.firebasestorage.app",
  messagingSenderId: "464388291912",
  appId: "1:464388291912:web:placeholder"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Force account picker on every sign-in so users can switch from personal
// to org account without triggering auto-switch redirects that cause 400 errors.
// hd hints Google to prioritize nobles.edu accounts in the picker.
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: 'nobles.edu',
});
