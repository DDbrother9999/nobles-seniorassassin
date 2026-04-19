import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    UploadCloud, Users, RefreshCw, Shuffle, Eye, EyeOff, LogOut,
    FileText, User, Trash2, Heart, CheckCircle, XCircle, Clock,
    UserPlus, BookOpen, Search, X, AlertTriangle, Plus, ShieldCheck, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────
   Confirm Remove Modal
───────────────────────────────────────────────────────────── */
function ConfirmRemoveModal({ user, onConfirm, onCancel, loading }) {
    if (!user) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-sm w-full p-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Remove Player</h3>
                        <p className="text-xs text-slate-500">This action cannot be undone</p>
                    </div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                    <p className="font-bold text-slate-900 text-sm">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                </div>

                <p className="text-sm text-slate-600 mb-6">
                    Removing this player will delete their record from the game. Their target assignments and kill history will remain in the ledger.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Add Player Modal
───────────────────────────────────────────────────────────── */
function AddPlayerModal({ currentPlayers, onAdd, onClose, adding, apiFetch }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (!search.trim() || search.trim().length < 2) {
            setResults([]);
            return;
        }
        const handler = setTimeout(() => {
            performSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    const performSearch = async (q) => {
        setSearching(true);
        try {
            const res = await apiFetch(`/api/masterlist?q=${encodeURIComponent(q.trim())}`);
            const data = await res.json();
            if (res.ok) setResults(data.people || []);
        } catch (e) {
            console.error('Search failed', e);
        } finally {
            setSearching(false);
        }
    };

    const currentEmails = new Set(currentPlayers.map(u => u.email));
    const filtered = results.filter(p => !currentEmails.has(p.email));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full flex flex-col max-h-[80vh] animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-brand-blue" />
                        <h3 className="font-bold text-slate-900">Add Player</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        {searching ? (
                            <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-blue animate-spin" />
                        ) : (
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        )}
                        <input
                            type="text"
                            placeholder="Search by name or email (min 2 chars)…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        {search.trim().length < 2 
                            ? 'Type at least 2 characters to search roster'
                            : `${filtered.length} matching person${filtered.length !== 1 ? 's' : ''} available`
                        }
                    </p>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {search.trim().length < 2 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
                            <Search className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">Start typing to search the school directory</p>
                        </div>
                    ) : filtered.length === 0 && !searching ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Users className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">No matching people found</p>
                        </div>
                    ) : (
                        filtered.map(person => (
                            <button
                                key={person.email}
                                onClick={() => onAdd(person)}
                                disabled={adding}
                                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 transition-colors text-left group disabled:opacity-50"
                            >
                                <div>
                                    <p className="font-semibold text-sm text-slate-900">
                                        {person.firstName} {person.lastName}
                                    </p>
                                    <p className="text-xs text-slate-400">{person.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {person.grade && (
                                        <span className="text-xs font-semibold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                            {person.grade}
                                        </span>
                                    )}
                                    <Plus className="w-4 h-4 text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Main Admin Dashboard
───────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
    const { logOut, currentUser, apiFetch } = useAuth();
    const navigate = useNavigate();

    // ── Player state ─────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Upload state ─────────────────────────────────────────
    const [masterListUploading, setMasterListUploading] = useState(false);
    const [playersUploading, setPlayersUploading] = useState(false);
    const masterListFileRef = useRef();
    const playersFileRef = useRef();

    // ── Master list ──────────────────────────────────────────
    // masterList is no longer fetched on load; searches are server-side inside AddPlayerModal.

    // ── Modals ───────────────────────────────────────────────
    const [confirmRemoveUser, setConfirmRemoveUser] = useState(null); // user obj or null
    const [removeLoading, setRemoveLoading] = useState(false);
    const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
    const [addingPlayer, setAddingPlayer] = useState(false);

    // ── Settings & eliminations ──────────────────────────────
    const [isLedgerPublic, setIsLedgerPublic] = useState(false);
    const [pendingEliminations, setPendingEliminations] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);

    // ── Safety item ───────────────────────────────────────────
    const [safetyItem, setSafetyItem] = useState({ name: '', description: '', imageUrl: '' });
    const [safetyItemSaving, setSafetyItemSaving] = useState(false);
    const [showSafetyItemModal, setShowSafetyItemModal] = useState(false);

    // ── Sort ─────────────────────────────────────────────────
    const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });

    /* ── Effects ─────────────────────────────────────────── */
    useEffect(() => {
        if (!currentUser) return;
        fetchAll(); // Initial full fetch
        const interval = setInterval(() => fetchAll({ poll: true }), 60000);
        return () => clearInterval(interval);
    }, [currentUser]);

    const fetchAll = (options = {}) => {
        const force = options.force ? `?t=${Date.now()}` : '';
        fetchUsers(force);
        fetchSettings(force);
        
        // Removed fetchMasterList(force) to save bandwidth; AddPlayerModal now handles server-side search.
    };

    /* ── Data fetchers ───────────────────────────────────── */
    const fetchUsers = async (cacheBust = '') => {
        try {
            const res = await apiFetch(`/api/users${cacheBust}`);
            const data = await res.json();
            if (res.ok && data.users) {
                setUsers(data.users);
                setPendingEliminations(data.pendingEliminations || []);
            } else {
                throw new Error('Failed to load users array from API');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch registered users');
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterList = async (cacheBust = '') => {
        try {
            const res = await apiFetch(`/api/masterlist${cacheBust}`);
            const data = await res.json();
            if (res.ok && data.people) setMasterList(data.people);
        } catch (e) {
            console.error('Failed to fetch master list', e);
        }
    };

    const fetchSettings = async (cacheBust = '') => {
        try {
            const res = await apiFetch(`/api/settings${cacheBust}`);
            const data = await res.json();
            if (res.ok && data.settings) {
                setIsLedgerPublic(data.settings.isLedgerPublic || false);
                if (data.settings.safetyItem) {
                    setSafetyItem({
                        name: data.settings.safetyItem.name || '',
                        description: data.settings.safetyItem.description || '',
                        imageUrl: data.settings.safetyItem.imageUrl || '',
                    });
                }
            }
        } catch (e) {
            console.error('Failed to fetch settings', e);
        }
    };

    const saveSafetyItem = async () => {
        setSafetyItemSaving(true);
        try {
            const res = await apiFetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ safetyItem }),
            });
            if (!res.ok) throw new Error('Failed to save');
        } catch (err) {
            alert('Failed to save safety item: ' + err.message);
        } finally {
            setSafetyItemSaving(false);
        }
    };

    /* ── XML parser (shared) ─────────────────────────────── */
    const parseXML = (text) => {
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

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const persons = Array.from(xmlDoc.getElementsByTagName('person'));

        return persons.map(person => {
            const getVal = (tag) => person.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
            return {
                firstName: getVal('first'),
                lastName: getVal('last'),
                email: getVal('emailaddress').toLowerCase(),
                studentId: person.getAttribute('id') || '',
                grade: getGradeClass(getVal('studentgrade')),
            };
        });
    };

    /* ── Upload: Master List (XML) ───────────────────────── */
    const handleMasterListUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMasterListUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const people = parseXML(event.target.result);
                if (people.length === 0) throw new Error('No students found in the uploaded file.');

                const res = await apiFetch('/api/masterlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ people }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'API write failed');

                alert(data.message || `Imported ${people.length} people into Master List!`);
                fetchMasterList();
            } catch (err) {
                console.error(err);
                setError('Master List import failed: ' + err.message);
            } finally {
                setMasterListUploading(false);
                e.target.value = '';
            }
        };
        reader.onerror = () => { setError('Error reading file.'); setMasterListUploading(false); };
        reader.readAsText(file);
    };

    /* ── Upload: Players List (plain-text emails) ────────── */
    const handlePlayersUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPlayersUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                // Accept one email per line OR comma-separated
                const emails = text
                    .split(/[\n,]+/)
                    .map(l => l.trim().toLowerCase())
                    .filter(l => l.includes('@'));

                if (emails.length === 0) throw new Error('No valid emails found in the uploaded file.');

                // Cross-reference against master list
                const masterMap = Object.fromEntries(masterList.map(p => [p.email, p]));
                const matched = [];
                const unmatched = [];

                emails.forEach(email => {
                    if (masterMap[email]) {
                        matched.push({
                            ...masterMap[email],
                            status: 'alive',
                            targetEmail: null,
                            isAdmin: false,
                        });
                    } else {
                        unmatched.push(email);
                    }
                });

                if (matched.length === 0) {
                    throw new Error(
                        `None of the ${emails.length} emails matched the Master List. ` +
                        'Upload a Master List first, or check that emails match exactly.'
                    );
                }

                const res = await apiFetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ users: matched }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'API write failed');

                let msg = `Added ${matched.length} player${matched.length !== 1 ? 's' : ''} to the game!`;
                if (unmatched.length > 0) {
                    msg += `\n\n⚠️ ${unmatched.length} email${unmatched.length !== 1 ? 's' : ''} not found in Master List (skipped):\n${unmatched.join('\n')}`;
                }
                alert(msg);
                fetchUsers();
            } catch (err) {
                console.error(err);
                setError('Players import failed: ' + err.message);
            } finally {
                setPlayersUploading(false);
                e.target.value = '';
            }
        };
        reader.onerror = () => { setError('Error reading file.'); setPlayersUploading(false); };
        reader.readAsText(file);
    };

    /* ── Add single player from master list ──────────────── */
    const handleAddPlayer = async (person) => {
        setAddingPlayer(true);
        try {
            const res = await apiFetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    users: [{
                        ...person,
                        status: 'alive',
                        targetEmail: null,
                        isAdmin: false,
                    }],
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to add player');
            await fetchUsers();
            setShowAddPlayerModal(false);
        } catch (err) {
            alert('Failed to add player: ' + err.message);
        } finally {
            setAddingPlayer(false);
        }
    };

    /* ── Remove player ───────────────────────────────────── */
    const handleConfirmRemove = async () => {
        if (!confirmRemoveUser) return;
        setRemoveLoading(true);
        try {
            const res = await apiFetch(
                `/api/users?email=${encodeURIComponent(confirmRemoveUser.email)}`,
                { method: 'DELETE' }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove player');
            setConfirmRemoveUser(null);
            fetchUsers();
        } catch (err) {
            alert('Failed to remove player: ' + err.message);
        } finally {
            setRemoveLoading(false);
        }
    };

    /* ── Existing actions ────────────────────────────────── */
    const handleVerdict = async (id, action) => {
        setActionLoading(id);
        try {
            const res = await apiFetch('/api/eliminations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Action failed');
            }
            await fetchUsers();
        } catch (err) {
            alert('Failed: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleStatus = async (user) => {
        try {
            const newStatus = user.status === 'alive' ? 'dead' : 'alive';
            const res = await apiFetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, updates: { status: newStatus } }),
            });
            if (!res.ok) throw new Error('Backend failed to update status');
            fetchUsers();
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const reassignTarget = async (user) => {
        const newTarget = prompt("Enter the new target's email address (or leave empty to remove):");
        if (newTarget === null) return;
        try {
            const targetEmail = newTarget.trim() === '' ? null : newTarget.trim();
            const res = await apiFetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, updates: { targetEmail } }),
            });
            if (!res.ok) throw new Error('Backend failed to assign target');
            fetchUsers();
        } catch (err) {
            alert('Failed to assign target');
        }
    };

    const assignTargetsRandomly = async () => {
        if (!window.confirm('Are you sure? This will overwrite ALL current target assignments and create a single randomized ring stringing everyone alive together.')) return;
        try {
            const res = await apiFetch('/api/users?action=randomize', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Backend failed randomizing');
            alert(`Successfully assigned targets to ${data.count} players!`);
            fetchUsers();
        } catch (err) {
            alert('Failed to randomize targets.');
        }
    };

    const clearLedger = async () => {
        if (!window.confirm('Total Reset: This will permanently delete ALL eliminations — the public ledger AND every player\'s pending/approved/rejected history. This cannot be undone. Continue?')) return;
        try {
            const res = await apiFetch('/api/kills', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Backend failed to clear ledger');
            alert(`Total reset complete. ${data.count} record(s) deleted.`);
        } catch (err) {
            alert('Failed to clear ledger: ' + err.message);
        }
    };

    const reviveAll = async () => {
        if (!window.confirm("Are you sure you want to revive ALL players? Their status will all be set to 'alive'.")) return;
        try {
            const res = await apiFetch('/api/users?action=revive', { method: 'POST' });
            if (!res.ok) throw new Error('Backend failed to revive players');
            alert('Successfully revived all players!');
            fetchUsers();
        } catch (err) {
            alert('Failed to revive players');
        }
    };

    const unassignAllTargets = async () => {
        if (!window.confirm('Are you sure? This will remove ALL current target assignments.')) return;
        try {
            const res = await apiFetch('/api/users?action=unassign', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Backend failed unassigning');
            alert('Successfully unassigned all targets!');
            fetchUsers();
        } catch (err) {
            alert('Failed to unassign targets.');
        }
    };

    const removeAllPlayers = async () => {
        if (!window.confirm('⚠️ Remove ALL players? This will permanently delete every player from the roster. This cannot be undone. Continue?')) return;
        try {
            const res = await apiFetch('/api/users', { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Backend failed to remove players');
            alert(`Removed ${data.count} player${data.count !== 1 ? 's' : ''} from the roster.`);
            fetchUsers();
        } catch (err) {
            alert('Failed to remove players: ' + err.message);
        }
    };

    const resetRoundClock = async () => {
        if (!window.confirm('Are you sure you want to RESET the round clock? This will flag everyone who hasn\'t gotten a kill starting from NOW. Use this if a new round has begun but you aren\'t randomizing targets.')) return;
        try {
            const res = await apiFetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roundStartedAt: new Date().toISOString() }),
            });
            if (!res.ok) throw new Error('Failed to update on backend');
            alert('Round clock reset! Everyone is now un-flagged for the new round.');
            fetchUsers();
        } catch (err) {
            alert('Failed to reset round clock');
        }
    };

    const toggleLedgerProtection = async () => {
        try {
            const res = await apiFetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isLedgerPublic: !isLedgerPublic }),
            });
            if (!res.ok) throw new Error('Failed to update on backend');
            setIsLedgerPublic(!isLedgerPublic);
        } catch (err) {
            alert('Failed to toggle protection');
        }
    };

    /* ── Helpers ─────────────────────────────────────────── */
    const getTargetName = (email) => {
        const t = users.find(u => u.email === email);
        return t ? `${t.firstName} ${t.lastName}` : email;
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

    /* ── Render ──────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
            <div className="max-w-6xl mx-auto">

                {/* ── Header / Toolbar ───────────────────────────────── */}
                <header className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-3 flex-wrap">

                        {/* ── Upload group ───────────────────────────── */}
                        <div className="flex items-center gap-2 flex-wrap border-r border-slate-200 pr-4 mr-1">
                            {/* Master List upload */}
                            <button
                                onClick={() => masterListFileRef.current.click()}
                                disabled={masterListUploading}
                                title="Upload the full school roster XML as the Master List"
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {masterListUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                                Upload Master List
                            </button>
                            <input type="file" accept=".xml" ref={masterListFileRef} onChange={handleMasterListUpload} className="hidden" />

                            {/* Players List upload */}
                            <button
                                onClick={() => playersFileRef.current.click()}
                                disabled={playersUploading}
                                title="Upload a text file of player emails (one per line) to add them to the game"
                                className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {playersUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                Upload Players List
                            </button>
                            <input type="file" accept=".txt,.csv" ref={playersFileRef} onChange={handlePlayersUpload} className="hidden" />

                             {/* Master list count badge removed to save bandwidth */}
                        </div>

                        {/* ── Game actions ────────────────────────────── */}

                        <button
                            onClick={toggleLedgerProtection}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isLedgerPublic ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                            {isLedgerPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {isLedgerPublic ? 'Unprotect Ledger: ON' : 'Unprotect Ledger: OFF'}
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
                            onClick={() => setShowSafetyItemModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Modify Safety Item
                        </button>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all border border-slate-200"
                        >
                            <User className="w-4 h-4" />
                            Player Dashboard
                        </button>
                    </div>

                    <button onClick={logOut} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 text-sm transition">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </header>

                {error && (
                    <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* ── Verification Queue ─────────────────────────────── */}
                {pendingEliminations.length > 0 && (
                    <div className="mb-8 bg-white rounded-2xl border border-amber-200 shadow-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-6 border-b border-amber-100 bg-amber-50">
                            <Clock className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-bold text-amber-700">Verification Queue</h2>
                            <span className="bg-amber-100 px-3 py-1 rounded-full text-xs font-bold font-mono text-amber-600 border border-amber-200">
                                {pendingEliminations.length} Pending
                            </span>
                        </div>
                        <div className="divide-y divide-amber-50">
                            {pendingEliminations.map(e => (
                                <div key={e._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">
                                            <span className="text-green-700">{e.killerName}</span>
                                            <span className="text-slate-400 mx-2">eliminated</span>
                                            <span className="text-red-700">{e.victimName}</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">{e.killerEmail} → {e.victimEmail}</p>
                                        <p className="text-xs text-slate-400">Reported: {new Date(e.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-3 flex-shrink-0">
                                        <button
                                            onClick={() => handleVerdict(e._id, 'approve')}
                                            disabled={actionLoading === e._id}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                        >
                                            {actionLoading === e._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleVerdict(e._id, 'reject')}
                                            disabled={actionLoading === e._id}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* ── Player Registry ─────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-x-auto">
                    <div className="flex flex-col p-6 border-b border-slate-100 gap-6">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-brand-blue">
                                    <Users className="w-5 h-5" /> Player Registry
                                </h2>
                                <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold font-mono text-slate-500 border border-slate-200">
                                    {users.length} Players
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setShowAddPlayerModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add Player
                            </button>

                            <button
                                onClick={reviveAll}
                                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-sm font-bold transition-all"
                            >
                                <Heart className="w-4 h-4" />
                                Revive All
                            </button>

                            <button
                                onClick={assignTargetsRandomly}
                                title="Randomize targets for all alive players and start a new round"
                                className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                            >
                                <Shuffle className="w-4 h-4" />
                                Randomize Targets
                            </button>

                            <button
                                onClick={resetRoundClock}
                                title="Set the round start time to NOW without reshuffling targets"
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-all"
                            >
                                <Clock className="w-4 h-4" />
                                Reset Round
                            </button>

                            <button
                                onClick={unassignAllTargets}
                                className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold transition-all"
                            >
                                <X className="w-4 h-4" />
                                Unassign All
                            </button>

                            <button
                                onClick={removeAllPlayers}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-sm font-bold transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove All
                            </button>

                            <button
                                onClick={() => fetchAll({ force: true })}
                                title="Force a fresh data reload from the server (bypasses cache)"
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-all ms-auto"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh Data
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Player</th>
                                    <th
                                        className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                        onClick={() => handleSort('status')}
                                        title="Sort by Status"
                                    >
                                        Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th className="px-6 py-4 font-bold">Kill?</th>
                                    <th className="px-6 py-4 font-bold">Target</th>
                                    <th className="px-6 py-4 font-bold">Reassign</th>
                                    <th className="px-6 py-4 font-bold text-red-400">Remove</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers.map(u => (
                                    <tr key={u.email} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{u.firstName} {u.lastName}</div>
                                            <div className="text-xs text-slate-500">
                                                {u.email}
                                                {u.grade && (
                                                    <span className="ml-2 font-semibold text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                        {u.grade}
                                                    </span>
                                                )}
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
                                            {u.status === 'alive' && (
                                                u.hasKillThisRound ? (
                                                    <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-lg border border-green-100 w-fit">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        SAFE
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-lg border border-red-100 w-fit" title="No approved kills this round">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        MISSING
                                                    </div>
                                                )
                                            )}
                                            {u.status !== 'alive' && <span className="text-slate-300">—</span>}
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
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setConfirmRemoveUser(u)}
                                                title={`Remove ${u.firstName} ${u.lastName} from game`}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-transparent hover:border-red-200"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p>No players registered.</p>
                                            <p className="text-xs mt-1">Upload a Players List or use the Add Player button above.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Modals ─────────────────────────────────────────────── */}
            <ConfirmRemoveModal
                user={confirmRemoveUser}
                onConfirm={handleConfirmRemove}
                onCancel={() => setConfirmRemoveUser(null)}
                loading={removeLoading}
            />

            {showAddPlayerModal && (
                <AddPlayerModal
                    currentPlayers={users}
                    onAdd={handleAddPlayer}
                    onClose={() => setShowAddPlayerModal(false)}
                    adding={addingPlayer}
                    apiFetch={apiFetch}
                />
            )}

            {showSafetyItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full animate-fade-in">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-brand-blue" />
                                <h3 className="font-bold text-slate-900">Modify Safety Item</h3>
                            </div>
                            <button onClick={() => setShowSafetyItemModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Item Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. The Great Gatsby"
                                    value={safetyItem.name}
                                    onChange={e => setSafetyItem(s => ({ ...s, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Image URL <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={safetyItem.imageUrl}
                                    onChange={e => setSafetyItem(s => ({ ...s, imageUrl: e.target.value }))}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Description</label>
                                <textarea
                                    placeholder="Describe the safety item and any rules around it…"
                                    value={safetyItem.description}
                                    onChange={e => setSafetyItem(s => ({ ...s, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition resize-none"
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-1">
                                <button
                                    onClick={() => setShowSafetyItemModal(false)}
                                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => { await saveSafetyItem(); setShowSafetyItemModal(false); }}
                                    disabled={safetyItemSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                >
                                    {safetyItemSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {safetyItemSaving ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
