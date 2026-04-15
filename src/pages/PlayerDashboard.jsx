import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Skull, Target, AlertTriangle, LogOut } from 'lucide-react';

export default function PlayerDashboard() {
  const { userData, logOut, reloadUserData, apiFetch } = useAuth();
  const [targetData, setTargetData] = useState(null);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [eliminating, setEliminating] = useState(false);

  useEffect(() => {
    // Force a fresh reload of the user profile immediately on mount
    reloadUserData();

    // Set up continuous polling so it updates even if left open
    const interval = setInterval(() => {
      reloadUserData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Set target automatically when userData updates (from the interval above)
  useEffect(() => {
    if (userData && userData.status === 'alive' && userData.targetProfile) {
      setTargetData({
        _id: userData.targetEmail,
        email: userData.targetEmail,
        ...userData.targetProfile
      });
    } else {
      setTargetData(null);
    }
    setLoadingTarget(false);
  }, [userData]);

  const handleEliminate = async () => {
    if (!targetData) return;
    try {
      setEliminating(true);

      const killEvent = {
        killerEmail: userData.email,
        killerName: `${userData.firstName} ${userData.lastName}`,
        victimEmail: targetData.email,
        victimName: `${targetData.firstName} ${targetData.lastName}`,
        timestamp: new Date().toISOString()
      };

      const res = await apiFetch('/api/kills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: targetData._id,
          userId: userData._id,
          killEvent
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Backend failed to log elimination");
      }

      // Refresh
      setTargetData(null);
      await reloadUserData();
      setShowConfirm(false);
    } catch (err) {
      console.error("Failed to eliminate target", err);
      alert("Error killing: " + err.message);
    } finally {
      setEliminating(false);
    }
  };

  if (userData?.status === 'dead') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="text-center">
          <Skull className="w-24 h-24 text-slate-800 mx-auto mb-6" />
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-wider mb-2">Eliminated</h1>
          <p className="text-slate-500">Better luck next year.</p>
          <button onClick={logOut} className="mt-8 flex items-center gap-2 mx-auto text-slate-500 hover:text-slate-800 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black uppercase text-brand-blue tracking-widest">Dashboard</h1>
            <p className="text-slate-600 font-bold text-sm tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Status: Alive
            </p>
          </div>
          <button onClick={logOut} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 shadow-sm transition">
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <h2 className="text-slate-500 uppercase tracking-widest font-bold text-sm mb-6 flex items-center justify-center gap-2">
            <Target className="w-4 h-4 text-brand-blue" /> Current Target
          </h2>

          {loadingTarget ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-48 h-48 bg-slate-100 rounded-2xl mb-6"></div>
              <div className="w-40 h-6 bg-slate-100 rounded"></div>
            </div>
          ) : targetData ? (
            <div className="relative z-10">
              <div className="relative inline-block mb-6">
                <img
                  src={`https://nobilis.nobles.edu/images_sitewide/Photos/${targetData.studentId}.jpeg`}
                  alt={`${targetData.firstName} ${targetData.lastName}`}
                  className="w-48 h-48 object-cover rounded-2xl shadow-xl border-4 border-white bg-slate-100"
                  onError={(e) => {
                    e.target.src = 'https://ui-avatars.com/api/?name=' + targetData.firstName + '+' + targetData.lastName + '&background=f8fafc&color=0f172a&size=200';
                  }}
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-900/10 pointer-events-none"></div>
              </div>
              <h3 className="text-3xl font-black text-slate-900">{targetData.firstName} {targetData.lastName}</h3>
            </div>
          ) : (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-2xl shadow-inner bg-slate-50 relative z-10">
              <p className="text-slate-500 font-semibold uppercase tracking-widest text-sm">No target assigned yet</p>
            </div>
          )}
        </div>

        {targetData && (
          <div className="mt-12 flex justify-center pb-12">
            <button
              onClick={() => setShowConfirm(true)}
              className="text-brand-red hover:text-brand-red-hover font-bold tracking-widest uppercase text-sm border-b border-dashed border-brand-red/50 pb-1 hover:border-brand-red-hover transition-colors"
            >
              Report Target Elimination
            </button>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && targetData && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full text-center">
              <AlertTriangle className="w-12 h-12 text-brand-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-wide">Confirm Elimination</h3>
              <p className="text-slate-500 text-sm mb-6">Are you sure you successfully eliminated <strong>{targetData.firstName} {targetData.lastName}</strong>? This will permanently mark them as dead and assign their target to you.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEliminate}
                  disabled={eliminating}
                  className="flex-1 px-4 py-3 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-hover transition disabled:opacity-50 flex justify-center items-center shadow-lg shadow-brand-red/20"
                >
                  {eliminating ? <Target className="w-5 h-5 animate-spin" /> : "Eliminated"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
