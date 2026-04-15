import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/users/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: user.email })
      });
      if (!response.ok) {
        if (response.status === 403) return null; // Denied by backend
        throw new Error('Failed to fetch user auth profile from backend');
      }
      const json = await response.json();
      return json.user;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const data = await fetchUserData(user);
      if (!data) {
        await signOut(auth);
        throw new Error('Access Denied: You are not on the official roster.');
      }
      setUserData(data);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logOut = () => {
    setUserData(null);
    return signOut(auth);
  };

  // Reload user data manually (e.g. after reporting a kill)
  const reloadUserData = async () => {
    if (currentUser) {
      const data = await fetchUserData(currentUser);
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
        Authorization: `Bearer ${token}`
      }
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const data = await fetchUserData(user);
        if (data) {
          setUserData(data);
          setCurrentUser(user);
        } else {
          await signOut(auth);
          setCurrentUser(null);
          setUserData(null);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
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
