import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert, Crosshair, ArrowLeft, Clock, Download, Trophy } from 'lucide-react';

export default function History() {
  const { userData, loading: authLoading, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchHistoryData = async () => {
    try {
      const fetcher = userData ? apiFetch : fetch;
      const [settingsRes, killsRes] = await Promise.all([
        fetch('/api/settings'),
        fetcher('/api/kills')
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const publicState = data.settings && data.settings.isLedgerPublic === true;
        setIsPublic(publicState);

        // If it's not public, and user is not admin, deny access
        if (!publicState && (!userData || !userData.isAdmin)) {
          setAccessDenied(true);
        } else {
          setAccessDenied(false);
        }
      }

      if (killsRes.ok) {
        const data = await killsRes.json();
        setEvents(data.kills || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {
      console.error("Failed to fetch history data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchHistoryData();
    const interval = setInterval(fetchHistoryData, 15000);
    return () => clearInterval(interval);
  }, [userData, authLoading]);

  if (authLoading || loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Loading History Data...</div>;
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase">Access Restricted</h1>
          <p className="text-slate-500 mb-8 font-medium">Purposely not visible.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-brand-blue text-white font-bold rounded-lg shadow-md hover:bg-brand-blue-hover transition"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider flex items-center gap-3 text-brand-blue">
              <FileTextIcon /> History
            </h1>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate(userData?.isAdmin ? '/admin' : '/dashboard')}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-100 font-semibold text-slate-700 text-sm transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Base
            </button>
          </div>
        </header>

        {leaderboard.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" /> Leaderboard (Top 5)
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {leaderboard.map((player, idx) => {
                let badgeClass = "bg-slate-100 text-slate-500";
                if (idx === 0) badgeClass = "bg-yellow-100 text-yellow-700 border border-yellow-300 shadow-sm";
                else if (idx === 1) badgeClass = "bg-gray-200 text-gray-700 border border-gray-300 shadow-sm";
                else if (idx === 2) badgeClass = "bg-orange-100 text-orange-800 border border-orange-300 shadow-sm";

                return (
                  <div key={player.killerEmail} className="p-4 md:p-6 flex items-center gap-4 hover:bg-slate-50 transition">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${badgeClass}`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-slate-900">{player.killerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-brand-blue">{player.killCount}</span>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Kills</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {events.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Crosshair className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-bold text-lg">No eliminations recorded yet.</p>
              <p className="text-sm">The game is just beginning.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {events.map((evt, idx) => {
                const date = new Date(evt.timestamp);
                return (
                  <div key={evt._id || idx} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Crosshair className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 font-medium">
                          <strong className="font-black text-brand-blue uppercase">{evt.killerName}</strong> eliminated <strong className="font-bold text-slate-800">{evt.victimName}</strong>
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            <Clock className="w-3.5 h-3.5" />
                            {date.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" x2="8" y1="13" y2="13"></line>
      <line x1="16" x2="8" y1="17" y2="17"></line>
      <line x1="10" x2="8" y1="9" y2="9"></line>
    </svg>
  );
}
