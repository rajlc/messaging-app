"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    MessageCircle, MessageSquare, User, ShoppingBag,
    Settings, LogOut, BarChart3, Truck, Home, Store, Boxes, Rss,
    ChevronDown, Tag
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
    const isMarketplaceActive = (activeView === 'messages' && activeType === 'marketplace') || activeView === 'marketplace-listing';
    const [marketplaceOpen, setMarketplaceOpen] = useState(isMarketplaceActive);

    useEffect(() => {
        if (isMarketplaceActive) {
            setMarketplaceOpen(true);
        }
    }, [isMarketplaceActive]);

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

        // Reset inventory/sales view to main hub when clicking sidebar link
        if (view === 'inventory' || view === 'sales') {
            params.delete('subView');
        }

        router.push(`/?${params.toString()}`);
    };

    return (
        <div
            style={{
                width: '218px',
                minWidth: '218px',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                zIndex: 50,
                paddingTop: '16px',
                paddingBottom: '16px',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
            }}
            className="bg-white border-r border-slate-100 dark:bg-slate-900 dark:border-slate-800 [&::-webkit-scrollbar]:hidden select-none"
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
                    whiteSpace: 'nowrap',
                }}
                    className="text-[#1E1B4B] dark:text-white"
                >
                    MsgOrder
                </span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', margin: '8px 16px' }} className="bg-slate-100 dark:bg-slate-700" />

            {/* Top Nav Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Home" icon={<Home size={18} />} active={activeView === 'home'} onClick={() => navigateTo('home')} />
            </div>

            {/* Section Label */}
            <div style={{ padding: '14px 16px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}
                className="text-slate-400 dark:text-slate-600"
            >
                Facebook & Marketplace
            </div>

            {/* Facebook & Marketplace Nav Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Messages"    icon={<MessageCircle size={18} />} active={activeView === 'messages' && activeType === 'messages'}         onClick={() => navigateTo('messages', 'messages')} />
                <NavButton label="Comments"    icon={<MessageSquare size={18} />} active={activeView === 'messages' && activeType === 'comments'}         onClick={() => navigateTo('messages', 'comments')} />
                
                {/* Marketplace Dropdown Parent */}
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => {
                            if (!marketplaceOpen && !isMarketplaceActive) {
                                navigateTo('messages', 'marketplace');
                            }
                            setMarketplaceOpen(!marketplaceOpen);
                        }}
                        className={`w-full h-11 flex items-center justify-between rounded-xl px-3 transition-all duration-200 text-left border-none cursor-pointer
                            ${isMarketplaceActive 
                                ? 'bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-900/40 dark:text-indigo-400 font-semibold' 
                                : 'bg-transparent text-[#374151] hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50 font-medium'
                            }`}
                    >
                        <div className="flex items-center gap-[10px] min-w-0">
                            <span className="flex items-center justify-center w-5 h-5 shrink-0">
                                <Store size={18} />
                            </span>
                            <span className="text-[13px] tracking-[0.1px] font-sans leading-none truncate">
                                Marketplace
                            </span>
                        </div>
                        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${marketplaceOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    </button>

                    {/* Submenu: Message and M. Listing */}
                    {marketplaceOpen && (
                        <div className="flex flex-col gap-1 pl-4 pr-1 py-1 ml-3.5 border-l-2 border-slate-100 dark:border-slate-800 transition-all">
                            {/* 1. Message */}
                            <button
                                onClick={() => navigateTo('messages', 'marketplace')}
                                className={`w-full h-8 flex items-center gap-2 rounded-lg px-2.5 text-left transition-all text-xs font-medium cursor-pointer border-none
                                    ${(activeView === 'messages' && activeType === 'marketplace')
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <MessageCircle size={13} className="shrink-0" />
                                <span className="truncate">Message</span>
                            </button>

                            {/* 2. M. Listing */}
                            <button
                                onClick={() => navigateTo('marketplace-listing')}
                                className={`w-full h-8 flex items-center gap-2 rounded-lg px-2.5 text-left transition-all text-xs font-medium cursor-pointer border-none
                                    ${activeView === 'marketplace-listing'
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                                title="Marketplace Listing"
                            >
                                <Tag size={13} className="shrink-0" />
                                <span className="truncate">M. Listing</span>
                            </button>
                        </div>
                    )}
                </div>

                <NavButton label="Manage Post" icon={<Rss size={18} />}           active={activeView === 'manage-post'}                                  onClick={() => navigateTo('manage-post')} />
            </div>

            {/* Section Label */}
            <div style={{ padding: '14px 16px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}
                className="text-slate-400 dark:text-slate-600"
            >
                Operations
            </div>

            {/* Operations Nav Group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Orders"   icon={<ShoppingBag size={18} />}   active={activeView === 'orders'}   onClick={() => navigateTo('orders')} />
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavButton label="Finance"  icon={<BarChart3 size={18} />}      active={activeView === 'finance'}  onClick={() => navigateTo('finance')} />
                )}
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <NavButton label="Settings" icon={<Settings size={18} />}       active={activeView === 'settings'} onClick={() => navigateTo('settings')} />
                )}
            </div>

            {/* INV Merge Section Header */}
            <div style={{ padding: '14px 16px 6px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}
                className="text-slate-400 dark:text-slate-600"
            >
                INV Merge
            </div>

            {/* INV Merge Nav Group (Modular Placeholder for future migrated features) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 10px' }}>
                <NavButton label="Inventory" icon={<Boxes size={18} />} active={activeView === 'inventory'} onClick={() => navigateTo('inventory')} />
                <NavButton label="Sales & Orders" icon={<ShoppingBag size={18} />} active={activeView === 'sales'} onClick={() => navigateTo('sales')} />
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
                className={`text-[13px] tracking-[0.1px] font-sans leading-none whitespace-nowrap
                    ${active ? 'font-semibold' : 'font-medium'}`}
            >
                {label}
            </span>
        </button>
    );
}
