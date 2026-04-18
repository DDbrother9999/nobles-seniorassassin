import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '../firebase';
import { signInWithCustomToken, signOut, onAuthStateChanged } from 'firebase/auth';

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
      console.error('Fetch user data error:', err);
      return null;
    }
  }, []);

  // Redirect to the server-side OAuth flow.
  // Google's account picker runs server-to-server so no browser storage
  // is needed — Chrome profile switching can no longer break it.
  const loginWithGoogle = () => {
    setAuthError(null);
    window.location.href = '/api/auth/google-start';
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setCurrentUser(null);
      setAuthError(null);
    } catch (error) {
      console.error('Logout Error:', error);
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

    const init = async () => {
      // Check if we just came back from the OAuth callback with a custom token.
      const params = new URLSearchParams(window.location.search);
      const customToken = params.get('token');
      const authError = params.get('auth_error');

      // Clean the token/error from the URL immediately so it can't be bookmarked.
      if (customToken || authError) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (authError) {
        setAuthError(`Sign-in failed: ${authError.replace(/_/g, ' ')}`);
      }

      if (customToken) {
        try {
          // Exchange the server-issued custom token for a full Firebase session.
          await signInWithCustomToken(auth, customToken);
          // onAuthStateChanged below will fire and pick up the new user.
        } catch (err) {
          console.error('signInWithCustomToken failed:', err);
          setAuthError('Sign-in failed. Please try again.');
        }
      }

      // Primary auth state listener.
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;

        if (user) {
          setCurrentUser(user);
          const data = await fetchUserData(user);
          if (data) {
            setUserData(data);
            setAuthError(null);
          } else {
            setUserData(null);
            setAuthError('Record not found. Try signing in with your @nobles.edu account. If that still doesn\'t work, contact dyin27@nobles.edu.');
          }
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    let unsubscribe;
    init().then(unsub => {
      if (isMounted) unsubscribe = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
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
