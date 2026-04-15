import React, { useState, useEffect, useRef } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { UploadCloud, Users, RefreshCw, Shuffle, Eye, EyeOff, LogOut, FileText, User, Trash2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const { logOut } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [isLedgerPublic, setIsLedgerPublic] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });
    const fileInputRef = useRef();

    useEffect(() => {
        fetchUsers();
        fetchSettings();

        // Polling to make up for lost firestore web sockets
        const interval = setInterval(() => {
            fetchUsers();
            fetchSettings();
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (res.ok && data.settings) {
                setIsLedgerPublic(data.settings.isLedgerPublic || false);
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (res.ok && data.users) {
                setUsers(data.users);
            } else {
                throw new Error("Failed to load users array from API");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch registered users");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, 'text/xml');

                const persons = Array.from(xmlDoc.getElementsByTagName('person'));
                const newRoster = [];

                const getGradeClass = (gradeNum) => {
                    switch (gradeNum) {
                        case '12': return 'Class I';
                        case '11': return 'Class II';
                        case '10': return 'Class III';
                        case '9': return 'Class IV';
                        case '8': return 'Class V';
                        case '7': return 'Class VI';
                        default: return gradeNum ? `Grade ${gradeNum}` : 'Unknown';
                    }
                };

                persons.forEach(person => {
                    const getVal = (tag) => person.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
                    const rawGrade = getVal('studentgrade');
                    
                    newRoster.push({
                        firstName: getVal('first'),
                        lastName: getVal('last'),
                        email: getVal('emailaddress').toLowerCase(),
                        studentId: person.getAttribute('id') || '',
                        grade: getGradeClass(rawGrade),
                        status: 'alive',
                        targetEmail: null,
                        isAdmin: false
                    });
                });

                if (newRoster.length === 0) {
                    throw new Error("No students found in the uploaded file.");
                }

                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ users: newRoster })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "API write failed");

                console.log("Successfully logged users:", newRoster.map(u => `${u.firstName} ${u.lastName} (ID: ${u.studentId})`));
                alert(data.message || `Successfully imported ${newRoster.length} players!`);
                fetchUsers();
            } catch (err) {
                console.error(err);
                setError("Import failed: " + err.message);
            } finally {
                setUploading(false);
                e.target.value = ''; 
            }
        };
        reader.onerror = () => {
            setError("Error reading file.");
            setUploading(false);
        };
        reader.readAsText(file);
    };

    const toggleStatus = async (user) => {
        try {
            const newStatus = user.status === 'alive' ? 'dead' : 'alive';
            const res = await fetch('/api/users/target', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, updates: { status: newStatus } })
            });

            if (!res.ok) throw new Error("Backend failed to update status");
            fetchUsers();
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status: " + err.message);
        }
    };

    const reassignTarget = async (user) => {
        const newTarget = prompt("Enter the new target's email address (or leave empty to remove):");
        if (newTarget === null) return; 

        try {
            const targetEmail = newTarget.trim() === '' ? null : newTarget.trim();
            const res = await fetch('/api/users/target', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, updates: { targetEmail } })
            });
            if (!res.ok) throw new Error("Backend failed to assign target");
            fetchUsers();
        } catch (err) {
            console.error("Failed to assign target", err);
            alert("Failed to assign target");
        }
    };

    const assignTargetsRandomly = async () => {
        if (!window.confirm("Are you sure? This will overwrite ALL current target assignments and create a single randomized ring stringing everyone alive together.")) {
            return;
        }

        try {
            const res = await fetch('/api/users/randomize', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Backend failed randomizing");
            
            alert(`Successfully assigned targets to ${data.count} players!`);
            fetchUsers();
        } catch (err) {
            console.error("Failed to randomize targets", err);
            alert("Failed to randomize targets.");
        }
    };

    const clearLedger = async () => {
        if (!window.confirm("Are you sure you want to clear the entire ledger? This action cannot be undone. All kill events will be deleted forever.")) return;

        try {
            const res = await fetch('/api/kills', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Backend failed to clear ledger");
            
            alert(`Ledger successfully cleared! (${data.count} events deleted)`);
        } catch (err) {
            console.error("Failed to clear ledger", err);
            alert("Failed to clear ledger: " + err.message);
        }
    };

    const reviveAll = async () => {
        if (!window.confirm("Are you sure you want to revive ALL players? Their status will all be set to 'alive'.")) return;
        try {
            const res = await fetch('/api/users/revive', { method: 'POST' });
            if (!res.ok) throw new Error("Backend failed to revive players");
            alert("Successfully revived all players!");
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert("Failed to revive players");
        }
    };

    const toggleLedgerProtection = async () => {
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isLedgerPublic: !isLedgerPublic })
            });
            if (!res.ok) throw new Error("Failed to update on backend");
            setIsLedgerPublic(!isLedgerPublic);
        } catch (err) {
            console.error("Failed to update ledger protection", err);
            alert("Failed to toggle protection");
        }
    };

    const getTargetName = (email) => {
        const targetUser = users.find(u => u.email === email);
        return targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : email;
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...users].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
            <div className="max-w-6xl mx-auto">
                <header className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <button 
                            onClick={() => fileInputRef.current.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                        >
                            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                            Upload XML
                        </button>
                        <input type="file" accept=".xml" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                        <button 
                            onClick={assignTargetsRandomly}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-lg text-sm font-bold transition-all"
                        >
                            <Shuffle className="w-4 h-4" />
                            Randomize Targets
                        </button>

                        <button 
                            onClick={toggleLedgerProtection}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isLedgerPublic ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                            {isLedgerPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {isLedgerPublic ? "Unprotect Ledger: ON" : "Unprotect Ledger: OFF"}
                        </button>

                        <button 
                            onClick={() => navigate('/ledger')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200"
                        >
                            <FileText className="w-4 h-4" />
                            View Ledger
                        </button>

                        <button 
                            onClick={clearLedger}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition-all border border-red-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear Ledger
                        </button>

                        <button 
                            onClick={reviveAll}
                            className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-bold transition-all border border-green-200"
                        >
                            <Heart className="w-4 h-4" />
                            Revive All
                        </button>

                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200"
                        >
                            <User className="w-4 h-4" />
                            Player Dashboard
                        </button>
                    </div>

                    <button onClick={logOut} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 text-sm transition">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </header>

                {error && (
                    <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-x-auto">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-brand-blue">
                                <Users className="w-5 h-5" /> Player Registry
                            </h2>
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold font-mono text-slate-500 border border-slate-200">
                                {users.length} Users
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8"><RefreshCw className="w-8 h-8 animate-spin text-slate-400" /></div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Player</th>
                                    <th className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('status')} title="Sort by Status">
                                        Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th className="px-6 py-4 font-bold">Target</th>
                                    <th className="px-6 py-4 font-bold">Reassign</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers.map(u => (
                                    <tr key={u.email} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{u.firstName} {u.lastName}</div>
                                            <div className="text-xs text-slate-500">
                                                {u.email}
                                                {u.grade && <span className="ml-2 font-semibold text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{u.grade}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(u)}
                                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-opacity hover:opacity-80 ${u.status === 'alive' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}
                                                title="Click to toggle status"
                                            >
                                                {u.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.targetEmail ? (
                                                <div className="flex flex-col">
                                                    <span className="text-slate-800 font-semibold">{getTargetName(u.targetEmail)}</span>
                                                    <span className="text-slate-400 text-xs">{u.targetEmail}</span>
                                                </div>
                                            ) : (
                                                <span className="italic text-slate-400">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => reassignTarget(u)}
                                                className="text-brand-blue hover:text-brand-blue-hover text-xs font-bold uppercase tracking-wider transition-colors"
                                            >
                                                Reassign
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>No players registered.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
