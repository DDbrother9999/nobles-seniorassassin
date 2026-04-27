import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Droplets, MapPin, Clock, Flag, AlertTriangle, Calendar } from 'lucide-react';

const Section = ({ icon: Icon, title, color, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-lg font-black uppercase tracking-widest text-slate-800">{title}</h2>
    </div>
    <ul className="space-y-2.5">
      {children}
    </ul>
  </div>
);

const Rule = ({ text, valid }) => (
  <li className={`flex items-start gap-3 p-3 rounded-xl text-sm leading-relaxed ${
    valid === true
      ? 'bg-green-50 text-green-800'
      : valid === false
      ? 'bg-red-50 text-red-800'
      : 'bg-slate-50 text-slate-700'
  }`}>
    {valid === true && <span className="text-base leading-5 shrink-0">✅</span>}
    {valid === false && <span className="text-base leading-5 shrink-0">❌</span>}
    <span>{text}</span>
  </li>
);

export default function Rules() {
  const navigate = useNavigate();
  const [safetyItem, setSafetyItem] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data?.settings?.safetyItem) {
          setSafetyItem(data.settings.safetyItem);
        }
      })
      .catch(() => {});
  }, []);

  const rounds = [
    { round: 'Round 1', date: 'April 21 @ 8:20 AM' },
    { round: 'Round 2', date: 'April 28 @ 8:20 AM' },
    { round: 'Round 3', date: 'May 4 @ 8:20 AM' },
    { round: 'Round 4', date: 'May 11 @ 8:20 AM' },
  ];

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

        {/* Safety Item Card */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl mb-6">
          {safetyItem?.imageUrl ? (
            <img
              src={safetyItem.imageUrl}
              alt={safetyItem.name || 'Safety item'}
              className="w-full aspect-video object-cover"
            />
          ) : (
            <div className="w-full aspect-video bg-slate-100 flex flex-col items-center justify-center border-b border-slate-200">
              <ShieldCheck className="w-16 h-16 text-slate-300 mb-3" />
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Safety Item Image</p>
            </div>
          )}
          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-blue mb-1">This Round's Safety Item</p>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              {safetyItem?.name || 'TBA'}
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              {safetyItem?.description || 'The safety item for this round has not been announced yet. Check back soon or follow @noblesseniorassassin2026 on Instagram for updates.'}
            </p>
          </div>
        </div>

        {/* Rules card */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl p-8 md:p-10">

          {/* Round Schedule */}
          <Section icon={Calendar} title="Round Schedule" color="bg-indigo-500">
            {rounds.map(({ round, date }) => (
              <li key={round} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-sm">
                <span className="font-bold text-slate-800">{round}</span>
                <span className="text-slate-500 font-medium">{date}</span>
              </li>
            ))}
            <Rule text="A round ends when the next round begins." />
          </Section>

          {/* Assassination Rules */}
          <Section icon={Droplets} title="Assassination Rules" color="bg-sky-500">
            <Rule text="Any form of water is valid — water bottle, water balloon, water gun, etc." />
            <Rule text="ALL assassinations must be videoed to count." />
            <Rule text="You must take a photo with your victim." />
            <Rule text="Submit your video to @noblesseniorassassin2026 on Instagram." />
            <Rule text="You cannot be eliminated while holding the designated round safety item." />
          </Section>

          {/* Location Rules */}
          <Section icon={MapPin} title="Location Rules" color="bg-rose-500">
            <Rule text="NO assassinations on the academic campus (24/7, not just during the school day)." valid={false} />
            <Rule text="NO assassinations within 10ft of a moving car or bus on Nobles campus." valid={false} />
            <Rule text="NO assassinations indoors." valid={false} />
            <Rule text="Assassinations CAN take place in parking lots." valid={true} />
            <Rule text="Assassinations CAN take place in cars or buses, as long as they are off, or in park." valid={true} />
            <Rule text="The academic campus includes: Henderson, Shattuck, Baker, Academic Center, Beach, Castle, and the walk to the castle." />
          </Section>

          {/* Time Rules */}
          <Section icon={Clock} title="Time Rules" color="bg-amber-500">
            <Rule text="NO assassinations during sports practices or games." valid={false} />
            <Rule text="NO assassinations during rehearsals." valid={false} />
            <Rule text="Assassinations CAN take place during the school day, but NOT on the academic campus (eg. off campus assassinations during frees are allowed)." valid={true} />
            <Rule text="Practice time includes: time on fields + walk to field from MAC + walk back from field to MAC." />
          </Section>

          {/* Updates */}
          <Section icon={Flag} title="Updates & Disputes" color="bg-purple-500">
            <Rule text="All updates (safety items, eliminations, etc.) posted on @noblesseniorassassin2026 on Instagram." />
            <Rule text="Safety items are also listed on this website — check it regularly!" />
            <Rule text="All rule disputes can be brought to a senior SLC member." />
          </Section>

          {/* Final Rule */}
          <div className="mt-2 p-5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-700 uppercase tracking-wide text-sm mb-1">Important Final Rule</p>
              <p className="text-red-600 text-sm leading-relaxed">
                Please be smart. If you intentionally endanger yourself or others during the game, you will be eliminated.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
