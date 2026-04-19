import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import PlayerDashboard from './pages/PlayerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Ledger from './pages/Ledger';
import SafetyItems from './pages/SafetyItems';
import { Analytics } from "@vercel/analytics/next"

function AppRoutes() {
  const { userData } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={userData ? <Navigate to={userData.isAdmin ? "/admin" : "/dashboard"} /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><PlayerDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/ledger" element={<Ledger />} />
      <Route path="/safety" element={<ProtectedRoute><SafetyItems /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
          <Analytics />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
