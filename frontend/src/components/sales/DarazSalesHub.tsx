"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Package,
    BarChart2,
    FileText,
    TrendingUp,
    User,
    ArrowLeft
} from 'lucide-react';
import { DarazOrderEntryView } from '@/components/sales/DarazOrderEntryView';
import { DarazOrderSummaryView } from '@/components/sales/DarazOrderSummaryView';

interface DarazModule {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
}

const DARAZ_MODULES: DarazModule[] = [
    {
        id: 'daraz-entry',
        name: 'Order Entry',
        icon: Package,
        color: 'bg-orange-500',
    },
    {
        id: 'daraz-summary',
        name: 'Order Summary',
        icon: BarChart2,
        color: 'bg-emerald-500',
    },
    {
        id: 'daraz-update-status',
        name: 'Update Order Status',
        icon: FileText,
        color: 'bg-blue-500',
    },
    {
        id: 'daraz-asp',
        name: 'Average Sales Price',
        icon: TrendingUp,
        color: 'bg-purple-500',
    },
    {
        id: 'daraz-report',
        name: 'Daraz Order Report',
        icon: FileText,
        color: 'bg-indigo-500',
    },
    {
        id: 'daraz-customers',
        name: 'Daraz Customer Details',
        icon: User,
        color: 'bg-teal-500',
    },
];

export function DarazSalesHub() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const subView = searchParams.get('subView');

    const handleSelectSubView = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'sales');
        params.set('subView', id);
        router.push(`/?${params.toString()}`);
    };

    const handleBackToSales = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'sales');
        params.delete('subView');
        router.push(`/?${params.toString()}`);
    };

    if (subView === 'daraz-entry') {
        return <DarazOrderEntryView />;
    }

    if (subView === 'daraz-summary') {
        return <DarazOrderSummaryView />;
    }

    const selectedModule = DARAZ_MODULES.find((m) => m.id === subView);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-auto">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Daraz Sales</h1>
                <button
                    onClick={handleBackToSales}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                    <ArrowLeft size={14} /> Back to Sales
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {!subView || subView === 'daraz' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {DARAZ_MODULES.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectSubView(item.id)}
                                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
                                >
                                    <div className={`${item.color} p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-105`}>
                                        <Icon size={22} className="text-white" />
                                    </div>
                                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-orange-500 transition-colors">
                                        {item.name}
                                    </h3>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 rounded-2xl bg-white dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                        {selectedModule && (
                            <>
                                <div className={`p-4 rounded-2xl ${selectedModule.color} text-white mb-4`}>
                                    <selectedModule.icon size={36} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                                    {selectedModule.name}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                                    This sub-module will be migrated in the next feature migration step.
                                </p>
                                <button
                                    onClick={() => handleSelectSubView('')}
                                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
                                >
                                    Back to Daraz Sales Hub
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
