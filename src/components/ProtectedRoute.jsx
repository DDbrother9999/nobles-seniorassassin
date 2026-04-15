import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { userData, loading } = useAuth();

  if (loading) return null;

  if (!userData) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !userData.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
