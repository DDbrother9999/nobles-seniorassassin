import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crosshair, AlertCircle } from 'lucide-react';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const userData = await loginWithGoogle();
      if (userData.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 relative overflow-hidden">
        {/* Decorative accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue opacity-10 rounded-bl-full translate-x-8 -translate-y-8 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-blue opacity-10 rounded-tr-full -translate-x-8 translate-y-8 blur-2xl"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border-2 border-brand-blue mb-4 shadow-[0_0_15px_rgba(0,51,102,0.3)]">
            <Crosshair className="w-8 h-8 text-brand-blue" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-brand-blue uppercase">Senior Assassin</h1>
          <p className="text-slate-500 mt-2 text-sm uppercase tracking-widest font-semibold">Dashboard Portal</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-brand-red text-red-200 p-4 rounded-lg mb-6 flex gap-3 text-sm animate-pulse-once">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="relative z-10">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-70 disabled:hover:bg-brand-blue disabled:active:scale-100 flex items-center justify-center gap-3 shadow-lg shadow-brand-blue/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
