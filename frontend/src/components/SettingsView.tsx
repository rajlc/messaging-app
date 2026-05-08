"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Settings, MessageSquare, CreditCard, Users, Bell, Database, Package, Zap, Truck, Globe, Bot } from 'lucide-react';
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
        { id: 'templates', label: 'Message Templates', icon: MessageSquare, description: 'Customize auto-replies for order statuses' },
        { id: 'quick-reply', label: 'Quick Reply Templates', icon: Zap, description: 'Create quick response templates for common inquiries' },
        { id: 'pages', label: 'Connected Pages', icon: Globe, description: 'Manage Facebook/Instagram page connections' },
        { id: 'ai-agent', label: 'AI Agent', icon: Bot, description: 'Configure AI auto-replies' },
        { id: 'auto-reply', label: 'Auto Reply', icon: MessageSquare, description: 'Set up automatic responses for keywords and phone numbers' },
        { id: 'inventory', label: 'Inventory Integration', icon: Database, description: 'Connect to external inventory system' },
        { id: 'logistics', label: 'Logistic Integration', icon: Truck, description: 'Configure Pathao and Pick & Drop credentials' },
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
        if (user.role === 'editor') return ['templates', 'quick-reply', 'products', 'ai-agent', 'auto-reply'];
        return [];
    })();

    const sections = allSections.filter(s => allowedSectionIds.includes(s.id));

    const isImplemented = (id: string) =>
        ['templates', 'quick-reply', 'inventory', 'products', 'logistics', 'pages', 'team', 'ai-agent', 'auto-reply'].includes(id);

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
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center px-6 flex-shrink-0 shadow-sm">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Settings className="text-indigo-500 dark:text-slate-400" size={22} />
                    Settings
                </h2>
            </div>

            <div className="flex-1 overflow-hidden flex">

                {/* Main Content Area */}
                {activeSection === 'templates' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Message Templates" />
                        <MessageTemplates />
                    </div>
                ) : activeSection === 'quick-reply' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Quick Reply Templates" />
                        <QuickReplyTemplates />
                    </div>
                ) : activeSection === 'pages' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Connected Pages" />
                        <PagesSettings />
                    </div>
                ) : activeSection === 'ai-agent' ? (
                    <div className="flex-1 p-6 h-full overflow-y-auto flex flex-col">
                        <Breadcrumb label="AI Agent Configuration" />
                        <AIAgentSettings />
                    </div>
                ) : activeSection === 'auto-reply' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Auto Reply Rules" />
                        <AutoReplySettings />
                    </div>
                ) : activeSection === 'inventory' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Inventory Integration" />
                        <InventorySettings />
                    </div>
                ) : activeSection === 'products' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Inventory Products" />
                        <InventoryProducts />
                    </div>
                ) : activeSection === 'logistics' ? (
                    <div className="flex-1 p-6 h-full overflow-y-auto flex flex-col">
                        <Breadcrumb label="Logistic Integration" />
                        <LogisticIntegration />
                    </div>
                ) : activeSection === 'team' ? (
                    <div className="flex-1 p-6 h-full overflow-hidden flex flex-col">
                        <Breadcrumb label="Staff Management" />
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
