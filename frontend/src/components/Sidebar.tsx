"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, MessageSquare, User, ShoppingBag, Settings, LogOut, BarChart3, Truck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
    activeView?: 'messages' | 'orders' | 'settings' | 'profile' | 'finance' | 'delivery';
}

export default function Sidebar({ activeView = 'messages' }: SidebarProps) {
    const router = useRouter();
    const { user, logout } = useAuth();

    const navigateTo = (view: string) => {
        router.push(`/?view=${view}`);
    };

    return (
        <div className="w-20 bg-white dark:bg-slate-800 flex flex-col items-center py-6 border-r border-gray-200 dark:border-slate-700 h-screen flex-shrink-0 z-50 shadow-sm">
            <div className="flex flex-col gap-4 mb-8">
                {/* Messages Nav */}
                <div
                    onClick={() => navigateTo('messages')}
                    title="Messages"
                    className={`p-3 rounded-2xl cursor-pointer hover:scale-110 transition-transform border shadow-sm ${activeView === 'messages'
                        ? 'bg-indigo-600 border-indigo-500 shadow-indigo-500/30 text-white'
                        : 'bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                        }`}
                >
                    <MessageCircle className={`${activeView === 'messages' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                </div>

                {/* Comments Nav */}
                <div
                    onClick={() => navigateTo('messages')}
                    title="Comments"
                    className="p-3 rounded-2xl cursor-pointer hover:scale-110 transition-transform border shadow-sm bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                >
                    <MessageSquare className="text-slate-500 dark:text-slate-400" />
                </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex flex-col gap-2 w-full px-2">
                <NavButton
                    label="Profile"
                    icon={<User size={18} />}
                    active={activeView === 'profile'}
                    onClick={() => navigateTo('profile')}
                />
                <NavButton
                    label="Orders"
                    icon={<ShoppingBag size={18} />}
                    active={activeView === 'orders'}
                    onClick={() => navigateTo('orders')}
                />
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavButton
                        label="Finance"
                        icon={<BarChart3 size={18} />}
                        active={activeView === 'finance'}
                        onClick={() => navigateTo('finance')}
                    />
                )}
                <NavButton
                    label="Delivery"
                    icon={<Truck size={18} />}
                    active={activeView === 'delivery'}
                    onClick={() => navigateTo('delivery')}
                />
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavButton
                        label="Settings"
                        icon={<Settings size={18} />}
                        active={activeView === 'settings'}
                        onClick={() => navigateTo('settings')}
                    />
                )}

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-slate-700 my-1" />

                {/* User avatar */}
                <div className="flex flex-col items-center gap-1 p-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                        {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-full px-1 text-center leading-tight">
                        {user?.full_name?.split(' ')[0] || 'User'}
                    </span>
                </div>

                <button
                    onClick={logout}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                    <LogOut size={18} />
                    <span className="text-[11px] font-bold">Logout</span>
                </button>
            </div>
        </div>
    );
}

function NavButton({ label, icon, active, onClick }: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all w-full ${active
                ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700/60'
                }`}
        >
            {icon}
            <span className={`text-[11px] font-bold ${active
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-900 dark:text-white'
                }`}>
                {label}
            </span>
        </button>
    );
}
