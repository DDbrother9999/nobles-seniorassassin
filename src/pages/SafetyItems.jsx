import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function SafetyItems() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-100 shadow-sm transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase text-brand-blue tracking-widest">Safety Items + Rules</h1>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">

          {/* Placeholder image */}
          <div className="w-full aspect-video bg-slate-100 flex flex-col items-center justify-center border-b border-slate-200">
            <ShieldCheck className="w-16 h-16 text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">yeah idk what to put here</p>
          </div>

          {/* Text content */}
          <div className="p-8 md:p-10">
            <h2 className="text-xl font-black text-slate-900 mb-4">Rules</h2>
            <p className="text-slate-500 leading-relaxed">
              blah blah blah
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
