"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
    const { user, login } = useAuth();
    const [formData, setFormData] = useState({
        fullName: user?.full_name || '',
        phone: user?.phone || '',
        password: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    fullName: formData.fullName,
                    phone: formData.phone,
                    ...(formData.password ? { password: formData.password } : {})
                }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to update user');

            // Update local user state
            // login method updates context and localStorage
            login(localStorage.getItem('token')!, { ...user!, full_name: formData.fullName, phone: formData.phone });

            setStatus('success');
            setMessage('Profile updated successfully');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
                <p className="text-slate-500">Manage your account settings</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'success' && (
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 border border-green-100">
                                <CheckCircle className="w-5 h-5" />
                                {message}
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-5 h-5" />
                                {message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-slate-400">Email cannot be changed</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Role</label>
                                <input
                                    type="text"
                                    value={user?.role?.toUpperCase() || ''}
                                    disabled
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Change Password
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">New Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        placeholder="Leave blank to keep current"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
