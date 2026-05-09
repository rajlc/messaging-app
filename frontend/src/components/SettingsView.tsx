"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Settings, MessageSquare, CreditCard, Users, Bell, Database, Package, Zap, Truck, Globe, Bot, ArrowLeft } from 'lucide-react';
import MessageTemplates from './settings/MessageTemplates';
import QuickReplyTemplates from './settings/QuickReplyTemplates';
import InventorySettings from './settings/InventorySettings';
import InventoryProducts from './settings/InventoryProducts';
import LogisticIntegration from './settings/LogisticIntegration';
import PagesSettings from './settings/PagesSettings';
import StaffSettings from './settings/StaffSettings';
import AIAgentSettings from './settings/AIAgentSettings';
import AutoReplySettings from './settings/AutoReplySettings';
import { useAuth } from '@/context/AuthContext';

export default function SettingsView() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const activeSection = searchParams.get('section') || 'gallery';

    const setActiveSection = (sectionId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('section', sectionId);
        router.push(`${pathname}?${params.toString()}`);
    };

    const allSections = [
        { id: 'ai-messages', label: 'AI & Messages', icon: Bot, description: 'Manage AI Agent, Message Templates, Quick Replies, and Auto Reply' },
        { id: 'integrations', label: 'Integrations', icon: Globe, description: 'Manage Social Media, Inventory, and Logistic Integrations' },
        { id: 'products', label: 'Inventory Products', icon: Package, description: 'View synced products from Inventory App' },
        { id: 'team', label: 'Staff Management', icon: Users, description: 'Manage access and permissions' },
        { id: 'general', label: 'General Settings', icon: Settings, description: 'App preferences and defaults' },
        { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Manage subscription and payment methods' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Configure alerts and push notifications' }
    ];

    // Filter sections based on user role
    const allowedSectionIds = (() => {
        if (!user) return [];
        if (user.role === 'admin') return allSections.map(s => s.id);
        if (user.role === 'editor') return ['ai-messages', 'integrations', 'products'];
        return [];
    })();

    const sections = allSections.filter(s => allowedSectionIds.includes(s.id));

    const isImplemented = (id: string) =>
        ['ai-messages', 'integrations', 'products', 'team'].includes(id);

    // Breadcrumb helper
    const Breadcrumb = ({ label }: { label: string }) => (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span
                onClick={() => setActiveSection('gallery')}
                className="cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors"
            >
                Settings
            </span>
            <span>/</span>
            <span className="text-slate-800 dark:text-white font-semibold">{label}</span>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-full overflow-hidden transition-colors duration-200">
            {/* Header */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        {activeSection === 'gallery' ? (
                            <>
                                <Settings className="text-indigo-500 dark:text-slate-400" size={22} />
                                Settings
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span 
                                    onClick={() => setActiveSection('gallery')}
                                    className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                                >
                                    Settings
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">/</span>
                                <span className="text-slate-900 dark:text-white">
                                    {sections.find(s => s.id === activeSection)?.label}
                                </span>
                            </div>
                        )}
                    </h2>
                </div>

                {activeSection !== 'gallery' && (
                    <button 
                        onClick={() => setActiveSection('gallery')}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all flex items-center gap-2 group border border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 shadow-sm"
                    >
                        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                        <span className="text-xs font-black uppercase tracking-widest">Back</span>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden flex">

                {/* Main Content Area */}
                {activeSection === 'ai-messages' ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 flex overflow-hidden">
                            {/* Sub Sidebar */}
                            <div className="w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-col p-4 gap-2">
                                {[
                                    { id: 'ai-agent', label: 'AI Agent', icon: Bot },
                                    { id: 'quick-reply', label: 'Quick Reply Templates', icon: Zap },
                                    { id: 'auto-reply', label: 'Auto Reply', icon: MessageSquare },
                                    { id: 'templates', label: 'Message Templates', icon: MessageSquare }
                                ].map((sub) => {
                                    const subActive = (searchParams.get('sub') || 'ai-agent') === sub.id;
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.set('sub', sub.id);
                                                router.push(`${pathname}?${params.toString()}`);
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                                subActive 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                                : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <sub.icon size={18} />
                                            {sub.label}
                                        </button>
                                    );
                                })}
                            </div>

                                {/* Sub Content Area */}
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                    {(() => {
                                        const sub = searchParams.get('sub') || 'ai-agent';
                                        switch (sub) {
                                            case 'ai-agent': return <AIAgentSettings />;
                                            case 'quick-reply': return <QuickReplyTemplates />;
                                            case 'auto-reply': return <AutoReplySettings />;
                                            case 'templates': return <MessageTemplates />;
                                            default: return <AIAgentSettings />;
                                        }
                                    })()}
                                </div>
                        </div>
                    </div>
                ) : activeSection === 'integrations' ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 flex overflow-hidden">
                            {/* Integrations Sub Sidebar */}
                            <div className="w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-col p-4 gap-2">
                                {[
                                    { id: 'social', label: 'Social Media', icon: Globe },
                                    { id: 'inventory', label: 'Inventory Integration', icon: Database },
                                    { id: 'logistics', label: 'Logistic Integration', icon: Truck }
                                ].map((sub) => {
                                    const subActive = (searchParams.get('sub') || 'social') === sub.id;
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.set('sub', sub.id);
                                                router.push(`${pathname}?${params.toString()}`);
                                            }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                                subActive 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                                : 'text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                        >
                                            <sub.icon size={18} />
                                            {sub.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Integrations Content Area */}
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                {(() => {
                                    const sub = searchParams.get('sub') || 'social';
                                    switch (sub) {
                                        case 'social': return <PagesSettings />;
                                        case 'inventory': return <InventorySettings />;
                                        case 'logistics': return <LogisticIntegration />;
                                        default: return <PagesSettings />;
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                ) : activeSection === 'products' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <InventoryProducts />
                    </div>
                ) : activeSection === 'team' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <StaffSettings />
                    </div>
                ) : (
                    /* Gallery View */
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Settings Gallery</h3>
                            <p className="text-slate-500 dark:text-slate-400">Manage your application preferences and configurations.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sections.map((section) => (
                                <div
                                    key={section.id}
                                    onClick={() => isImplemented(section.id) ? setActiveSection(section.id) : null}
                                    className={`p-6 rounded-xl border transition-all group ${isImplemented(section.id)
                                        ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer'
                                        : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50 opacity-60 cursor-not-allowed'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors ${isImplemented(section.id)
                                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                                        : 'bg-gray-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                        }`}>
                                        <section.icon size={24} />
                                    </div>
                                    <h4 className="text-lg font-bold mb-2 text-slate-800 dark:text-white">{section.label}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
                                    {!isImplemented(section.id) && (
                                        <span className="inline-block mt-4 text-xs font-mono bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded text-slate-400 dark:text-slate-500">Coming Soon</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
                }
            </div>
        </div>
    );
}
