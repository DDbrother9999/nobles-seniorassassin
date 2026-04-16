import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchUserData = useCallback(async (user) => {
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/users/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: user.email })
      });

      if (!response.ok) {
        console.warn(`Backend auth failed: ${response.status}`);
        return null;
      }
      const json = await response.json();
      return json.user;
    } catch (err) {
      console.error("Fetch user data error:", err);
      return null;
    }
  }, []);

  // Kicks off a full-page redirect to Google.
  // On mobile this is the ONLY flow that survives account switching.
  // The result is picked up by getRedirectResult when the page reloads.
  const loginWithGoogle = () => {
    setAuthError(null);
    return signInWithRedirect(auth, googleProvider);
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setCurrentUser(null);
      setAuthError(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const reloadUserData = async () => {
    if (auth.currentUser) {
      const data = await fetchUserData(auth.currentUser);
      if (data) setUserData(data);
    }
  };

  const apiFetch = async (url, options = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  };

  useEffect(() => {
    let isMounted = true;

    // 1) Check if we just returned from a redirect sign-in.
    //    This fires ONCE after the page reloads from Google's redirect.
    getRedirectResult(auth)
      .then(async (result) => {
        if (!isMounted) return;
        if (result?.user) {
          const data = await fetchUserData(result.user);
          if (!data) {
            // Signed into Google but not on the roster — sign them out.
            await signOut(auth);
            setAuthError('Access Denied: You are not on the official roster.');
          }
          // If data exists, onAuthStateChanged below will handle setting state.
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Redirect sign-in error:', err);
        // Don't surface user-cancellation errors.
        if (err.code !== 'auth/popup-closed-by-user' &&
            err.code !== 'auth/cancelled-popup-request') {
          setAuthError(err.message || 'Sign-in failed. Please try again.');
        }
      });

    // 2) Primary auth state listener — fires on initial load AND after redirect sign-in.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      if (user) {
        const data = await fetchUserData(user);
        if (data) {
          setUserData(data);
          setCurrentUser(user);
        } else {
          // Firebase-authed but not on roster. Don't call signOut here
          // to avoid loops — getRedirectResult handles that case.
          setCurrentUser(null);
          setUserData(null);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserData]);

  const value = {
    currentUser,
    userData,
    loading,
    authError,
    loginWithGoogle,
    logOut,
    reloadUserData,
    apiFetch
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
