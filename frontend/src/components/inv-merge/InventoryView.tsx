"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Package,
    FileText,
    History,
    AlertTriangle,
    Tag,
    Camera,
    Sparkles,
    ArrowLeft,
    Boxes
} from 'lucide-react';
import ProductListView from '@/components/inv-merge/ProductListView';

interface InventoryModule {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    badgeBg: string;
}

const INVENTORY_MODULES: InventoryModule[] = [
    {
        id: 'product-list',
        name: 'Inventory List',
        description: 'View & manage product catalog, SKUs, and stock levels',
        icon: Package,
        color: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    },
    {
        id: 'stock-adjustment',
        name: 'Stock Adjustment',
        description: 'Manually adjust inventory counts and record stock reasons',
        icon: FileText,
        color: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    },
    {
        id: 'stock-ledger',
        name: 'Stock Ledger',
        description: 'Track detailed history of stock movements and audit trails',
        icon: History,
        color: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    },
    {
        id: 'damaged-stocks',
        name: 'Damaged Goods',
        description: 'Manage damaged items, write-offs, and damage resolutions',
        icon: AlertTriangle,
        color: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    },
    {
        id: 'wholesale-price',
        name: 'Wholesale Price',
        description: 'Set custom wholesale tier pricing and bulk rate locks',
        icon: Tag,
        color: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    },
    {
        id: 'mobile-uploads',
        name: 'Field Data Entry',
        description: 'Mobile camera scan and fast upload entry tools',
        icon: Camera,
        color: 'text-teal-600 dark:text-teal-400',
        badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400',
    },
    {
        id: 'daraz-product-management',
        name: 'Daraz Product Management',
        description: 'Sync Daraz product listings, stock & pricing updates',
        icon: Sparkles,
        color: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    },
];

export default function InventoryView() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentSubView = searchParams.get('subView');

    const handleSelectModule = (subViewId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'inventory');
        params.set('subView', subViewId);
        router.push(`/?${params.toString()}`);
    };

    const handleBackToHub = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'inventory');
        params.delete('subView');
        router.push(`/?${params.toString()}`);
    };

    if (currentSubView === 'product-list') {
        return <ProductListView />;
    }

    const selectedModule = INVENTORY_MODULES.find((m) => m.id === currentSubView);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-auto">
            {/* Header Bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {currentSubView && (
                        <button
                            onClick={handleBackToHub}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Back to Inventory Hub"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Boxes size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            {selectedModule ? selectedModule.name : 'Inventory Management'}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedModule
                                ? selectedModule.description
                                : 'Select an inventory module to access stock tools and catalog management.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6">
                {!currentSubView ? (
                    /* Module Action Cards Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {INVENTORY_MODULES.map((module) => {
                            const Icon = module.icon;
                            return (
                                <button
                                    key={module.id}
                                    onClick={() => handleSelectModule(module.id)}
                                    className="group flex flex-col items-start p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex items-center justify-between w-full mb-3">
                                        <div className={`p-3 rounded-xl ${module.badgeBg} transition-transform group-hover:scale-105`}>
                                            <Icon size={22} />
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {module.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                        {module.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    /* Module Sub-page Placeholder */
                    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 rounded-2xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        {selectedModule && (
                            <>
                                <div className={`p-4 rounded-2xl ${selectedModule.badgeBg} mb-4`}>
                                    <selectedModule.icon size={36} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                                    {selectedModule.name}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                                    This sub-module will be migrated in the next feature migration step.
                                </p>
                                <button
                                    onClick={handleBackToHub}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                                >
                                    Back to Inventory Management
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
