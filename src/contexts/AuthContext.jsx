import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAIL = 'dyin27@nobles.edu';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user) => {
    const userDocRef = doc(db, 'users', user.email);
    const docSnap = await getDoc(userDocRef);
    
    if (!docSnap.exists() && user.email !== ADMIN_EMAIL) {
      return null; // Deny
    }
    
    let data = docSnap.exists() ? docSnap.data() : { 
      firstName: 'Admin', 
      lastName: 'Account',
      status: 'alive',
      targetEmail: null
    };
    
    if (user.email === ADMIN_EMAIL) {
      data.isAdmin = true;
    }
    
    return { ...data, email: user.email };
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
    reloadUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
