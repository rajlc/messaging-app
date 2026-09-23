"use client";

import React, { useState } from 'react';
import {
    Sparkles,
    Flame,
    Clock,
    ShoppingBag,
    Calendar,
    Award,
    Lightbulb,
    FileText,
    TrendingUp,
    Bot
} from 'lucide-react';
import { GrowthOverview } from './GrowthOverview';
import { DailyRoutineTab } from './DailyRoutineTab';
import { DailyPlanTab } from './DailyPlanTab';
import { OrderProgressReportTab } from './OrderProgressReportTab';
import { PlanIdeaTab } from './PlanIdeaTab';
import { PlatformScorecard } from './PlatformScorecard';
import { StrategyBoard } from './StrategyBoard';
import { AiReportTab } from './AiReportTab';
import { HolidayModal } from './HolidayModal';

export function GrowthHubView() {
    const [activeSubTab, setActiveSubTab] = useState<string>('overview');
    const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

    const subTabs = [
        { id: 'overview', label: 'Overview', icon: Sparkles },
        { id: 'routine', label: 'Daily Routine', icon: Clock },
        { id: 'daily-plan', label: 'Daily Plan', icon: Calendar },
        { id: 'order-report', label: 'Order Report', icon: ShoppingBag },
        { id: 'plan-idea', label: 'Plan / Idea', icon: Lightbulb, isNew: true },
        { id: 'scorecard', label: 'Platform Scorecard', icon: Award },
        { id: 'strategy', label: 'Strategy Board', icon: TrendingUp },
        { id: 'ai-report', label: 'AI Report', icon: Bot, isNew: true },
    ];

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {subTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeSubTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                                {tab.isNew && (
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                                        isActive ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                    }`}>
                                        AI
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sub-tab Views */}
            <div className="transition-opacity duration-200">
                {activeSubTab === 'overview' && (
                    <GrowthOverview
                        onNavigateTab={(tab) => setActiveSubTab(tab)}
                        onOpenHolidayModal={() => setIsHolidayModalOpen(true)}
                        onStartFocusTimer={() => setActiveSubTab('daily-plan')}
                    />
                )}

                {activeSubTab === 'routine' && <DailyRoutineTab />}

                {activeSubTab === 'daily-plan' && <DailyPlanTab />}

                {activeSubTab === 'order-report' && <OrderProgressReportTab />}

                {activeSubTab === 'plan-idea' && <PlanIdeaTab />}

                {activeSubTab === 'scorecard' && <PlatformScorecard />}

                {activeSubTab === 'strategy' && <StrategyBoard />}

                {activeSubTab === 'ai-report' && <AiReportTab />}
            </div>

            {/* Holiday Modal */}
            <HolidayModal
                isOpen={isHolidayModalOpen}
                onClose={() => setIsHolidayModalOpen(false)}
            />
        </div>
    );
}
