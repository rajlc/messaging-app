"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import {
    MessageCircle, MessageSquare, User, ShoppingBag,
    Settings, LogOut, BarChart3, Truck, Home, Store
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
    activeView?: string;
}

export default function Sidebar({ activeView = 'messages' }: SidebarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, logout } = useAuth();

    const activeType = searchParams.get('type') || 'messages';

    const navigateTo = (view: string, type?: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', view);
        if (type) {
            params.set('type', type);
        } else {
            params.delete('type');
        }

        // Reset settings view to gallery when clicking sidebar link
        if (view === 'settings') {
            params.delete('section');
            params.delete('sub');
        }

        router.push(`/?${params.toString()}`);
    };

    return (
        <div
            style={{
                width: '200px',
                minWidth: '200px',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                zIndex: 50,
                paddingTop: '16px',
                paddingBottom: '16px',
                overflowY: 'auto',
                overflowX: 'hidden',
            }}
            className="bg-white border-r border-slate-100 dark:bg-slate-900 dark:border-slate-800"
        >
            {/* Logo / Brand at top */}
            <div style={{ padding: '0 16px 4px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
                        flexShrink: 0,
                    }}
                >
                    <MessageCircle size={18} color="#ffffff" />
                </div>
                <span style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    fontFamily: "'Inter', sans-serif",
                }}
                    className="text-[#1E1B4B] dark:text-white"
                >
                    MsgOrder
                </span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', margin: '12px 16px' }} className="bg-slate-100 dark:bg-slate-700" />

            {/* Top Nav Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Home"        icon={<Home size={18} />}          active={activeView === 'home'}                                          onClick={() => navigateTo('home')} />
                <NavButton label="Messages"    icon={<MessageCircle size={18} />} active={activeView === 'messages' && activeType === 'messages'}         onClick={() => navigateTo('messages', 'messages')} />
                <NavButton label="Marketplace" icon={<Store size={18} />}         active={activeView === 'messages' && activeType === 'marketplace'}      onClick={() => navigateTo('messages', 'marketplace')} />
                <NavButton label="Comments"    icon={<MessageSquare size={18} />} active={activeView === 'messages' && activeType === 'comments'}         onClick={() => navigateTo('messages', 'comments')} />
            </div>

            {/* Section Label */}
            <div style={{ padding: '18px 18px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}
                className="text-slate-400 dark:text-slate-600"
            >
                Operations
            </div>

            {/* Operations Nav Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Orders"   icon={<ShoppingBag size={18} />}   active={activeView === 'orders'}   onClick={() => navigateTo('orders')} />
                <NavButton label="Delivery" icon={<Truck size={18} />}          active={activeView === 'delivery'} onClick={() => navigateTo('delivery')} />
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavButton label="Finance"  icon={<BarChart3 size={18} />}      active={activeView === 'finance'}  onClick={() => navigateTo('finance')} />
                )}
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavButton label="Settings" icon={<Settings size={18} />}       active={activeView === 'settings'} onClick={() => navigateTo('settings')} />
                )}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Divider */}
            <div style={{ height: '1px', margin: '8px 16px' }} className="bg-slate-100 dark:bg-slate-700" />

            {/* Bottom Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>

                {/* Profile */}
                <NavButton label="Profile" icon={<User size={18} />} active={activeView === 'profile'} onClick={() => navigateTo('profile')} />

                {/* User row + Logout */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    marginTop: '4px',
                }}>
                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #EEF2FF 0%, #C7D2FE 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#4F46E5',
                                fontSize: '12px',
                                fontWeight: 700,
                                flexShrink: 0,
                                border: '2px solid #E0E7FF',
                            }}
                        >
                            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Inter', sans-serif",
                        }}
                            className="text-slate-500 dark:text-slate-400"
                        >
                            {user?.full_name || 'User'}
                        </span>
                    </div>

                    {/* Logout button */}
                    <button
                        onClick={logout}
                        title="Logout"
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 active:scale-95 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 flex items-center justify-center transition-all duration-200 shrink-0"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
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
            className={`w-full h-11 flex items-center gap-[10px] rounded-xl px-3 transition-all duration-200 text-left border-none cursor-pointer
                ${active 
                    ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-900/40 dark:text-indigo-400' 
                    : 'bg-transparent text-[#374151] hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                }`}
        >
            {/* Icon */}
            <span className="flex items-center justify-center w-5 h-5 shrink-0">
                {icon}
            </span>

            {/* Label */}
            <span
                className={`text-[13px] tracking-[0.1px] font-sans leading-none
                    ${active ? 'font-semibold' : 'font-medium'}`}
            >
                {label}
            </span>
        </button>
    );
}
