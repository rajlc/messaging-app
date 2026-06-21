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
        router.push(`/?${params.toString()}`);
    };

    return (
        <div
            style={{
                width: '200px',
                minWidth: '200px',
                background: '#FFFFFF',
                borderRight: '1px solid #F1F5F9',
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
            className="dark:bg-slate-900 dark:border-slate-800"
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
                    color: '#1E1B4B',
                    letterSpacing: '-0.3px',
                    fontFamily: "'Inter', sans-serif",
                }}
                    className="dark:text-white"
                >
                    MsgOrder
                </span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#F1F5F9', margin: '12px 16px' }} className="dark:bg-slate-700" />

            {/* Top Nav Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Home"        icon={<Home size={18} />}          active={activeView === 'home'}                                          onClick={() => navigateTo('home')} />
                <NavButton label="Messages"    icon={<MessageCircle size={18} />} active={activeView === 'messages' && activeType === 'messages'}         onClick={() => navigateTo('messages', 'messages')} />
                <NavButton label="Marketplace" icon={<Store size={18} />}         active={activeView === 'messages' && activeType === 'marketplace'}      onClick={() => navigateTo('messages', 'marketplace')} />
                <NavButton label="Comments"    icon={<MessageSquare size={18} />} active={activeView === 'messages' && activeType === 'comments'}         onClick={() => navigateTo('messages', 'comments')} />
            </div>

            {/* Section Label */}
            <div style={{ padding: '18px 18px 6px', fontSize: '10px', fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}
                className="dark:text-slate-600"
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
            <div style={{ height: '1px', background: '#F1F5F9', margin: '8px 16px' }} className="dark:bg-slate-700" />

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
                            color: '#6B7280',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Inter', sans-serif",
                        }}
                            className="dark:text-slate-400"
                        >
                            {user?.full_name || 'User'}
                        </span>
                    </div>

                    {/* Logout button */}
                    <button
                        onClick={logout}
                        title="Logout"
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                        }}
                        className="dark:bg-red-900/20 dark:text-red-400"
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                        }}
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
            style={{
                width: '100%',
                height: '44px',
                display: 'flex',
                flexDirection: 'row',       /* ← horizontal: icon + text side by side */
                alignItems: 'center',
                gap: '10px',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                padding: '0 12px',
                background: active ? '#EEF2FF' : 'transparent',
                color: active ? '#4F46E5' : '#374151',
                textAlign: 'left',
            }}
            className={active ? 'dark:bg-indigo-900/40 dark:text-indigo-400' : 'dark:text-slate-400 dark:hover:text-white'}
            onMouseEnter={e => {
                if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC';
                }
            }}
            onMouseLeave={e => {
                if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
            }}
        >
            {/* Icon */}
            <span
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    flexShrink: 0,
                    color: active ? '#4F46E5' : 'inherit',
                }}
            >
                {icon}
            </span>

            {/* Label */}
            <span
                style={{
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '0.1px',
                    color: active ? '#4F46E5' : '#374151',
                    fontFamily: "'Inter', sans-serif",
                    lineHeight: 1,
                }}
                className={active ? 'dark:text-indigo-400' : 'dark:text-slate-400'}
            >
                {label}
            </span>
        </button>
    );
}
