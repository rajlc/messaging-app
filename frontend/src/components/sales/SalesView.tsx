"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Store, TrendingUp, ShoppingCart } from 'lucide-react';
import { DarazSalesHub } from '@/components/sales/DarazSalesHub';

interface SalesModule {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    label: string | null;
}

const SALES_MODULES: SalesModule[] = [
    {
        id: 'daraz',
        name: 'E-commerce Sales & Orders',
        icon: Package,
        color: 'bg-orange-500',
        label: 'DARAZ',
    },
    {
        id: 'website-orders',
        name: 'Website Sales & Orders',
        icon: Store,
        color: 'bg-indigo-500',
        label: 'WEBSITE',
    },
    {
        id: 'store-sales',
        name: 'Physical Outlets Sales & Orders',
        icon: Store,
        color: 'bg-emerald-500',
        label: null,
    },
    {
        id: 'analytics',
        name: 'Sales Analytics',
        icon: TrendingUp,
        color: 'bg-purple-500',
        label: null,
    },
];

export default function SalesView() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const subView = searchParams.get('subView');

    const handleSelectModule = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'sales');
        params.set('subView', id);
        router.push(`/?${params.toString()}`);
    };

    if (subView === 'daraz' || subView?.startsWith('daraz-')) {
        return <DarazSalesHub />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-auto">
            {/* Header Bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Sales Management</h1>
            </div>

            {/* Main Content Area */}
            <div className="p-6 space-y-6">
                {/* Category Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SALES_MODULES.map((module) => {
                        const Icon = module.icon;
                        return (
                            <button
                                key={module.id}
                                onClick={() => handleSelectModule(module.id)}
                                className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
                            >
                                <div className={`${module.color} p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-105`}>
                                    <Icon size={22} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {module.name}
                                    </h3>
                                    {module.label && (
                                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block mt-0.5">
                                            {module.label}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-semibold">Total Orders Today</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">0</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-semibold">Pending Orders</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">0</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-semibold">Shipped Today</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">0</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-semibold">Today&apos;s Revenue</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Rs. 0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
