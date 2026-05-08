"use client";

import { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, Save, Loader2, CheckCircle, AlertCircle, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ProfileView() {
    const { user, login, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [formData, setFormData] = useState({
        fullName: user?.full_name || '',
        phone: user?.phone || '',
        password: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: FormEvent) => {
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

            // If password was changed, logout immediately
            if (formData.password) {
                logout();
                return;
            }

            // Otherwise, update local user state
            login(localStorage.getItem('token')!, { ...user!, full_name: formData.fullName, phone: formData.phone });

            setStatus('success');
            setMessage('Profile updated successfully');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    const themeOptions = [
        {
            id: 'light',
            label: 'Light',
            icon: Sun,
            description: 'Clean and bright',
            iconColor: 'text-amber-500',
            activeBg: 'bg-amber-50 dark:bg-amber-500/10',
            activeBorder: 'border-amber-400 dark:border-amber-500',
            activeText: 'text-amber-700 dark:text-amber-400',
        },
        {
            id: 'dark',
            label: 'Dark',
            icon: Moon,
            description: 'Easy on the eyes',
            iconColor: 'text-indigo-500',
            activeBg: 'bg-indigo-50 dark:bg-indigo-500/10',
            activeBorder: 'border-indigo-400 dark:border-indigo-500',
            activeText: 'text-indigo-700 dark:text-indigo-400',
        },
        {
            id: 'system',
            label: 'System',
            icon: Monitor,
            description: 'Follows your OS',
            iconColor: 'text-slate-500 dark:text-slate-400',
            activeBg: 'bg-slate-100 dark:bg-slate-700/50',
            activeBorder: 'border-slate-400 dark:border-slate-500',
            activeText: 'text-slate-700 dark:text-slate-300',
        },
    ];

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-full overflow-hidden transition-colors duration-200">
            {/* Header */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <User className="text-indigo-500" size={22} />
                    Profile
                </h2>
                <div className="flex items-center gap-3">
                    {/* Quick theme toggle */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title="Toggle theme"
                        className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600"
                    >
                        {theme === 'dark'
                            ? <Sun size={18} className="text-amber-400" />
                            : <Moon size={18} className="text-indigo-500" />
                        }
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-4 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-500/20"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Profile Info Card */}
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Card Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            <User size={16} className="text-indigo-500" />
                            Account Information
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Update your personal details</p>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Status Messages */}
                            {status === 'success' && (
                                <div className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 p-4 rounded-lg flex items-center gap-2 border border-green-200 dark:border-green-500/20">
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-500/20">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{message}</span>
                                </div>
                            )}

                            {/* User Avatar / Info Banner */}
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-lg shadow-indigo-500/30">
                                    {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-white">{user?.full_name || 'User'}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full">
                                        {user?.role?.toUpperCase() || 'USER'}
                                    </span>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                                        placeholder="Your full name"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                                        placeholder="Your phone number"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Email cannot be changed</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                                    <input
                                        type="text"
                                        value={user?.role?.toUpperCase() || ''}
                                        disabled
                                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-slate-700" />

                            {/* Change Password */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-indigo-500" />
                                        Change Password
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Leave blank to keep your current password</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Appearance Card */}
                <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Card Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                        <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            {theme === 'dark'
                                ? <Moon size={16} className="text-indigo-400" />
                                : <Sun size={16} className="text-amber-500" />
                            }
                            Appearance
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choose how the app looks to you</p>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-3">
                            {themeOptions.map((option) => {
                                const Icon = option.icon;
                                const isActive = theme === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => setTheme(option.id)}
                                        className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                                            ${isActive
                                                ? `${option.activeBg} ${option.activeBorder} shadow-sm`
                                                : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {/* Theme Preview */}
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                                            ${isActive
                                                ? `${option.activeBg} border-2 ${option.activeBorder}`
                                                : 'bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600'
                                            }`}
                                        >
                                            <Icon size={22} className={isActive ? option.iconColor : 'text-slate-400 dark:text-slate-500'} />
                                        </div>

                                        <div className="text-center">
                                            <p className={`text-sm font-semibold transition-colors ${isActive ? option.activeText : 'text-slate-600 dark:text-slate-400'}`}>
                                                {option.label}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{option.description}</p>
                                        </div>

                                        {/* Active indicator dot */}
                                        {isActive && (
                                            <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${option.iconColor.replace('text-', 'bg-')}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                            Your theme preference is saved automatically
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
