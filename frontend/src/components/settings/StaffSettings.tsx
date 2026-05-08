"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle, Save, X } from 'lucide-react';

interface StaffUser {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'editor' | 'user' | 'rider';
    status: 'pending' | 'active' | 'deactive';
    platforms: string[];
    accounts: string[];
    is_delivery_person: boolean;
    created_at: string;
}

export default function StaffSettings() {
    const { user } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<StaffUser>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    const platforms = ['facebook', 'instagram', 'tiktok', 'store']; // Hardcoded for now
    const [availableAccounts, setAvailableAccounts] = useState<{ id: string, name: string, platform: string }[]>([]);

    useEffect(() => {
        // Only admins can access this page
        if (user && user.role !== 'admin') {
            router.push('/');
            return;
        }

        fetchUsers();
        fetchAccounts();
    }, [user, router]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/users/staff`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccounts = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableAccounts(data.map((p: any) => ({
                    id: p.page_id,
                    name: p.page_name,
                    platform: 'facebook'
                })));
            }
        } catch (e) { }
    };

    const handleEdit = (u: StaffUser) => {
        setEditingId(u.id);
        setEditForm({
            role: u.role,
            status: u.status,
            platforms: u.platforms || [],
            accounts: u.accounts || [],
            is_delivery_person: u.is_delivery_person || false
        });
        setSaveStatus('idle');
    };

    const handleSave = async (id: string) => {
        setSaveStatus('saving');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/users/staff/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ id, ...editForm })
            });

            if (res.ok) {
                setSaveStatus('success');
                setUsers(prev => prev.map(u => u.id === id ? { ...u, ...editForm } as StaffUser : u));
                setTimeout(() => setEditingId(null), 1000);
            } else {
                setSaveStatus('error');
            }
        } catch (e) {
            setSaveStatus('error');
        }
    };

    const toggleArrayItem = (field: 'platforms' | 'accounts', value: string) => {
        setEditForm(prev => {
            const arr = prev[field] || [];
            if (arr.includes(value)) {
                return { ...prev, [field]: arr.filter(i => i !== value) };
            } else {
                return { ...prev, [field]: [...arr, value] };
            }
        });
    };

    // Derived state for filtered accounts
    const filteredAccounts = availableAccounts.filter(acc =>
        editForm.platforms?.includes(acc.platform)
    );

    if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

    return (
        <div className="p-6 max-w-full mx-auto h-full flex flex-col">
            <div className="mb-6 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">Staff Management</h1>
                <p className="text-slate-400">Manage users, roles, and access permissions</p>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-300 text-sm">Staff Info</th>
                                <th className="px-6 py-4 font-semibold text-slate-300 text-sm">Role</th>
                                <th className="px-6 py-4 font-semibold text-slate-300 text-sm">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-300 text-sm">Platforms & Accounts</th>
                                <th className="px-6 py-4 font-semibold text-slate-300 text-sm w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{u.full_name}</div>
                                        <div className="text-sm text-slate-400">{u.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300 border border-slate-600`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border 
                                            ${u.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                u.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {u.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {u.platforms && u.platforms.length > 0 ? u.platforms.map(p => (
                                                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20">{p}</span>
                                                )) : <span className="text-xs text-slate-500">No platforms</span>}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {u.accounts && u.accounts.length > 0 ? `${u.accounts.length} accounts allowed` : 'No specific accounts'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleEdit(u)}
                                            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-white">Edit User Permissions</h3>
                                <p className="text-sm text-slate-400">Update role, status, and platform access</p>
                            </div>
                            <button
                                onClick={() => setEditingId(null)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

                            {/* Row 1: Role & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Role</label>
                                    <select
                                        value={editForm.role}
                                        onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="user">User</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                        <option value="rider">Rider</option>
                                    </select>
                                    <p className="text-xs text-slate-500">Admins have full access. Editors can manage content. Riders can manage deliveries.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="active">Active</option>
                                        <option value="deactive">Deactive</option>
                                    </select>
                                    <p className="text-xs text-slate-500">Only Active users can login.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300">Delivery Person</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setEditForm({ ...editForm, is_delivery_person: true })}
                                            className={`px-6 py-2 rounded-lg border transition-all font-medium ${editForm.is_delivery_person
                                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                                }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={() => setEditForm({ ...editForm, is_delivery_person: false })}
                                            className={`px-6 py-2 rounded-lg border transition-all font-medium ${!editForm.is_delivery_person
                                                ? 'bg-red-600/20 border-red-500 text-red-400'
                                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                                }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">Enable this to allow rider assignment for this staff.</p>
                                </div>
                            </div>

                            <hr className="border-slate-700" />

                            {/* Row 2: Platforms & Accounts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Platforms Column */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-slate-300">Allowed Platforms</label>
                                        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Select platforms to see related accounts</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {platforms.map(p => (
                                            <div
                                                key={p}
                                                onClick={() => toggleArrayItem('platforms', p)}
                                                className={`cursor-pointer p-3 rounded-lg border transition-all flex items-center gap-3 ${editForm.platforms?.includes(p)
                                                        ? 'bg-indigo-600/20 border-indigo-500/50 ring-1 ring-indigo-500/50'
                                                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${editForm.platforms?.includes(p) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                                                    }`}>
                                                    {editForm.platforms?.includes(p) && <CheckCircle size={14} className="text-white" />}
                                                </div>
                                                <span className={`text-sm font-medium capitalize ${editForm.platforms?.includes(p) ? 'text-white' : 'text-slate-400'}`}>
                                                    {p}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Accounts Column - Filtered */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-slate-300">Allowed Accounts</label>
                                        <span className="text-xs text-slate-500">
                                            {editForm.accounts?.length || 0} selected
                                        </span>
                                    </div>

                                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-1 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {availableAccounts.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-slate-500 text-sm italic p-4">
                                                No connected pages found.
                                            </div>
                                        ) : filteredAccounts.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic p-8 text-center">
                                                <AlertCircle className="mb-2 opacity-50" />
                                                <p>Select a platform to view available accounts.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 p-2">
                                                {filteredAccounts.map(acc => (
                                                    <label
                                                        key={acc.id}
                                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${editForm.accounts?.includes(acc.id) ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${editForm.accounts?.includes(acc.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                                                            {editForm.accounts?.includes(acc.id) && <CheckCircle size={14} className="text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.accounts?.includes(acc.id)}
                                                            onChange={() => toggleArrayItem('accounts', acc.id)}
                                                            className="hidden"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-slate-200 truncate font-medium">{acc.name}</div>
                                                            <div className="text-xs text-slate-500 capitalize">{acc.platform}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => editingId && handleSave(editingId)}
                                disabled={saveStatus === 'saving'}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
