import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { supabaseService } from '../supabase/supabase.service';

export const HOURLY_WORK_SLOTS = [
    { time_block: '9:00 AM - 10:00 AM', label: 'Order Processing & Priority Dispatch' },
    { time_block: '10:00 AM - 11:00 AM', label: 'Listing SEO, Catalog & Inventory Sync' },
    { time_block: '11:00 AM - 12:00 PM', label: 'Voucher Setup, Bundles & Campaign Operations' },
    { time_block: '12:00 PM - 1:00 PM', label: 'Customer Care, Inquiries & Chat Broadcast' },
    // 1:00 PM - 2:00 PM LUNCH & MENTAL BREAK (PROTECTED - SKIPPED FROM WORK ROUTINE)
    { time_block: '2:00 PM - 3:00 PM', label: 'Creative Studio: Images, Graphics & Video Demonstration' },
    { time_block: '3:00 PM - 4:00 PM', label: 'Sponsored Ads, Bid Tuning & Flash Deals Submission' },
    { time_block: '4:00 PM - 5:00 PM', label: 'Courier Handover, Manifest Verification & Tracking' },
    { time_block: '5:00 PM - 6:00 PM', label: 'Daily Margin Audit, P&L & Evening Performance Review' },
];

export interface RoutineTask {
    id: string;
    time_block: string;
    task_name: string;
    category: 'morning' | 'work' | 'evening';
    auto_rollover: boolean;
    sort_order: number;
    completed?: boolean;
    rolled_from?: string | null;
    rollover_count?: number;
}

export interface HolidayItem {
    id: string;
    start_date: string;
    end_date: string;
    label: string;
    mode: 'full' | 'reduced';
    store_closed: boolean;
}

export interface IdeaItem {
    id: string;
    title: string;
    description?: string;
    status: 'idea' | 'in_progress' | 'completed';
    created_at: string;
    completed_at?: string;
}

export interface ProjectVault {
    id: string;
    name: string;
    description?: string;
    color?: string;
    created_at: string;
    ideas: IdeaItem[];
}

// Initial Default Master Routine Template
const DEFAULT_ROUTINE_TASKS: Omit<RoutineTask, 'id'>[] = [
    { time_block: '6:30 AM - 7:30 AM', task_name: '🌅 Morning Routine: Walk / Workout, Healthy Breakfast, Zero Screen Time', category: 'morning', auto_rollover: false, sort_order: 1 },
    { time_block: '7:30 AM - 8:30 AM', task_name: '🧠 Daily Goal Planning: Review today\'s strategy & target priorities', category: 'morning', auto_rollover: false, sort_order: 2 },
    { time_block: '9:00 AM - 11:30 AM', task_name: '📦 Multi-Channel Order Processing: Confirm Daraz, FB, TikTok & Website orders', category: 'work', auto_rollover: true, sort_order: 3 },
    { time_block: '11:30 AM - 1:00 PM', task_name: '🚀 High-Impact Growth Sprint: Product listing, Daraz Flash Sale, Ads optimization', category: 'work', auto_rollover: true, sort_order: 4 },
    { time_block: '2:00 PM - 3:30 PM', task_name: '🎬 Content & Creative: Film 1 TikTok/Reels video or test new ad creative', category: 'work', auto_rollover: true, sort_order: 5 },
    { time_block: '3:30 PM - 5:00 PM', task_name: '📊 Dispatch, Logistics & Branch Handover: Manifest check & courier tracking', category: 'work', auto_rollover: true, sort_order: 6 },
    { time_block: '5:00 PM - 6:00 PM', task_name: '📈 Daily Review & Cash Flow: Check orders vs target, log ad spend & summary', category: 'work', auto_rollover: false, sort_order: 7 },
    { time_block: '7:30 PM - 10:00 PM', task_name: '🌙 Personal Time: Family dinner, reading, unwind, 7+ hours sleep commitment', category: 'evening', auto_rollover: false, sort_order: 8 },
];

@Injectable()
export class GrowthService {
    private readonly logger = new Logger(GrowthService.name);

    private getClient() {
        return supabaseService.getClient();
    }

    // ─────────────────────────────────────────────────────────────
    // NEPAL TIME (NPT: UTC+5:45) HELPERS
    // ─────────────────────────────────────────────────────────────

    getNepalTime(baseDate = new Date()): Date {
        const utcMs = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
        const nepalOffsetMs = (5 * 60 + 45) * 60000;
        return new Date(utcMs + nepalOffsetMs);
    }

    getNepalDateStr(d?: Date): string {
        const npt = this.getNepalTime(d || new Date());
        const y = npt.getFullYear();
        const m = String(npt.getMonth() + 1).padStart(2, '0');
        const day = String(npt.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    isPastNepalMidnight(dateStr: string): boolean {
        const todayNepal = this.getNepalDateStr();
        return dateStr < todayNepal;
    }

    // ─────────────────────────────────────────────────────────────
    // STORAGE HELPERS (Strictly User-Scoped)
    // ─────────────────────────────────────────────────────────────

    private async getStorageKey(key: string): Promise<any> {
        try {
            const { data, error } = await this.getClient()
                .from('settings')
                .select('value')
                .eq('key', key)
                .single();

            if (error || !data?.value) return null;
            return JSON.parse(data.value);
        } catch (e) {
            return null;
        }
    }

    private async setStorageKey(key: string, value: any): Promise<boolean> {
        try {
            const { error } = await this.getClient()
                .from('settings')
                .upsert({
                    key,
                    value: JSON.stringify(value),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'key' });

            if (error) {
                this.logger.error(`Failed setting key ${key}: ${error.message}`);
                return false;
            }
            return true;
        } catch (e) {
            this.logger.error(`Error saving ${key}`, e);
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. OVERVIEW & STREAK
    // ─────────────────────────────────────────────────────────────

    async getOverview(userId: string) {
        const today = this.getNepalDateStr();
        const holidays = await this.getHolidays(userId);
        const isHolidayToday = holidays.some(h => today >= h.start_date && today <= h.end_date);
        const currentHoliday = holidays.find(h => today >= h.start_date && today <= h.end_date) || null;

        const routineData = await this.getRoutineForDate(userId, today);
        const totalRoutineTasks = routineData.tasks.length;
        const completedRoutineTasks = routineData.tasks.filter(t => t.completed).length;

        const streak = await this.calculateStreak(userId, today);
        const activeStrategy = await this.getStrategy(userId);

        return {
            today,
            isHolidayToday,
            currentHoliday,
            streakDays: streak,
            activeGoal: activeStrategy?.targetedGoal || 'Multi-Channel Freedom (40% Daraz / 35% FB / 15% TikTok / 10% IG)',
            routineProgress: {
                total: totalRoutineTasks,
                completed: completedRoutineTasks,
                percent: totalRoutineTasks > 0 ? Math.round((completedRoutineTasks / totalRoutineTasks) * 100) : 0,
            },
        };
    }

    private async calculateStreak(userId: string, todayStr: string): Promise<number> {
        const logsKey = `growth_streak_meta_${userId}`;
        const streakMeta = await this.getStorageKey(logsKey);
        if (streakMeta && streakMeta.streak !== undefined) {
            return streakMeta.streak;
        }
        return 7;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. DAILY ROUTINE & NEPAL MIDNIGHT LOCK
    // ─────────────────────────────────────────────────────────────

    async getRoutineTasks(userId: string): Promise<RoutineTask[]> {
        const key = `growth_routine_tasks_${userId}`;
        let tasks = await this.getStorageKey(key);

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            tasks = DEFAULT_ROUTINE_TASKS.map((t, index) => ({
                id: `rt_${Date.now()}_${index}`,
                ...t,
            }));
            await this.setStorageKey(key, tasks);
        }

        return tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    async saveRoutineTasks(userId: string, tasks: RoutineTask[]): Promise<RoutineTask[]> {
        const key = `growth_routine_tasks_${userId}`;
        await this.setStorageKey(key, tasks);
        return tasks;
    }

    async getRoutineForDate(userId: string, dateStr: string) {
        // Date-specific overrides take precedence if saved, otherwise fallback to template
        const dateSpecificKey = `growth_routine_override_${userId}_${dateStr}`;
        const dateOverride = await this.getStorageKey(dateSpecificKey);

        const templateTasks = await this.getRoutineTasks(userId);
        const baseTasks = dateOverride && Array.isArray(dateOverride) ? dateOverride : templateTasks;

        const logKey = `growth_routine_log_${userId}_${dateStr}`;
        const logMap = (await this.getStorageKey(logKey)) || {};

        const isLocked = this.isPastNepalMidnight(dateStr);

        const enrichedTasks = baseTasks.map(t => {
            const logEntry = logMap[t.id] || {};
            return {
                ...t,
                completed: !!logEntry.completed,
                rolled_from: logEntry.rolled_from || null,
                rollover_count: logEntry.rollover_count || 0,
            };
        });

        // Also fetch daily summary for this date
        const summaryKey = `growth_summary_${userId}_${dateStr}`;
        const summaryData = (await this.getStorageKey(summaryKey)) || {};

        // Fetch active strategy for header banner
        const strategy = await this.getStrategy(userId);

        // Fetch day plan metadata if this date was scheduled by AI strategy
        const dayMetaKey = `growth_day_plan_meta_${userId}_${dateStr}`;
        const dayMeta = await this.getStorageKey(dayMetaKey);

        return {
            date: dateStr,
            isLocked,
            activeGoal: strategy?.targetedGoal || 'Build disciplined sales across Daraz, Facebook, TikTok & Website',
            priorityFocus: strategy?.priorityWork || 'Maintain daily dispatch speed and creative testing',
            dayTheme: dayMeta?.dayTheme || null,
            dayTarget: dayMeta?.dailyTarget || null,
            dayNumber: dayMeta?.dayNumber || null,
            totalDays: dayMeta?.totalDays || null,
            tasks: enrichedTasks,
            dailySummary: summaryData.summary || '',
        };
    }

    async toggleRoutineTask(userId: string, dateStr: string, taskId: string, completed: boolean) {
        if (this.isPastNepalMidnight(dateStr)) {
            throw new Error('This routine date is locked after midnight Nepal Time and cannot be modified.');
        }

        const logKey = `growth_routine_log_${userId}_${dateStr}`;
        const logMap = (await this.getStorageKey(logKey)) || {};

        if (!logMap[taskId]) {
            logMap[taskId] = {};
        }
        logMap[taskId].completed = completed;
        logMap[taskId].updated_at = new Date().toISOString();

        await this.setStorageKey(logKey, logMap);
        return { taskId, completed, date: dateStr };
    }

    async rolloverTask(userId: string, fromDateStr: string, toDateStr: string, taskId: string) {
        const fromLogKey = `growth_routine_log_${userId}_${fromDateStr}`;
        const fromMap = (await this.getStorageKey(fromLogKey)) || {};
        const count = (fromMap[taskId]?.rollover_count || 0) + 1;

        fromMap[taskId] = {
            ...fromMap[taskId],
            completed: false,
            is_rolled: true,
            rolled_to: toDateStr,
            rollover_count: count,
        };
        await this.setStorageKey(fromLogKey, fromMap);

        const toLogKey = `growth_routine_log_${userId}_${toDateStr}`;
        const toMap = (await this.getStorageKey(toLogKey)) || {};
        toMap[taskId] = {
            completed: false,
            rolled_from: fromDateStr,
            rollover_count: count,
        };
        await this.setStorageKey(toLogKey, toMap);

        return { taskId, fromDate: fromDateStr, toDate: toDateStr, rolloverCount: count };
    }

    // ─────────────────────────────────────────────────────────────
    // 3. DAILY WORK SUMMARY
    // ─────────────────────────────────────────────────────────────

    async getDailySummary(userId: string, dateStr: string) {
        const key = `growth_summary_${userId}_${dateStr}`;
        const data = await this.getStorageKey(key);
        return data || { date: dateStr, summary: '' };
    }

    async saveDailySummary(userId: string, dateStr: string, summary: string) {
        const key = `growth_summary_${userId}_${dateStr}`;
        const payload = {
            date: dateStr,
            summary,
            updated_at: new Date().toISOString(),
        };
        await this.setStorageKey(key, payload);
        return payload;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. STRATEGY BOARD & AI GENERATOR WITH CONFLICT RESOLUTION
    // ─────────────────────────────────────────────────────────────

    async getStrategy(userId: string) {
        const key = `growth_strategy_${userId}`;
        const data = await this.getStorageKey(key);
        return data || {
            targetedGoal: 'Reduce Daraz dependence to 40% while scaling FB Ads (35%) and TikTok (15%)',
            priorityWork: '1. Film 3-hook video ads\n2. Maintain 90%+ Daraz store rating\n3. Launch 1 Advantage+ ad campaign',
            platform: 'All Platforms',
            updatedAt: null,
        };
    }

    async saveStrategy(userId: string, data: any) {
        const key = `growth_strategy_${userId}`;
        const payload = {
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await this.setStorageKey(key, payload);
        return payload;
    }

    /**
     * AI Strategy Generator with Work Constraints, Hourly Day-by-Day Generation & Smart Conflict Resolution
     */
    async generateAiStrategy(userId: string, params: {
        instruction: string;
        platform: string;
        startDate: string;
        days: number;
        resolution?: 'merge' | 'overwrite';
    }) {
        const todayNepal = this.getNepalDateStr();
        if (params.startDate < todayNepal) {
            throw new Error('Cannot schedule strategy for past dates. Please select today or a future date.');
        }

        const holidays = await this.getHolidays(userId);
        const templateTasks = await this.getRoutineTasks(userId);

        // Determine target dates (skipping Saturdays & holidays)
        const activeDates: string[] = [];
        const skippedDates: { date: string; reason: string }[] = [];

        const startParts = params.startDate.split('-').map(Number);
        const curr = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0);

        for (let i = 0; i < params.days; i++) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            // Check Saturday
            if (curr.getDay() === 6) {
                skippedDates.push({ date: dateStr, reason: 'Saturday Holiday (Store Closed / Team Off)' });
            } else {
                // Check user holidays
                const hol = holidays.find(h => dateStr >= h.start_date && dateStr <= h.end_date);
                if (hol) {
                    skippedDates.push({ date: dateStr, reason: `Holiday Mode: ${hol.label}` });
                } else {
                    activeDates.push(dateStr);
                }
            }
            curr.setDate(curr.getDate() + 1);
        }

        if (activeDates.length === 0) {
            return {
                status: 'error',
                message: 'No active working days found in the selected period (all selected dates fall on Saturdays or holidays).',
                activeDates: [],
                skippedDates,
            };
        }

        const platform = params.platform || 'Daraz';
        const instruction = params.instruction || 'Scale multi-channel orders';

        // 1. Try Calling Gemini LLM for Day-by-Day Hourly Generation
        let generatedPlan: { targetedGoal: string; priorityWork: string; days: any[] } | null = null;
        try {
            const { data: geminiKeyRow } = await this.getClient()
                .from('settings')
                .select('value')
                .eq('key', 'gemini_api_key')
                .single();
            const geminiKey = geminiKeyRow?.value;

            if (geminiKey && geminiKey.trim()) {
                generatedPlan = await this.callGeminiStrategyGenerator(
                    geminiKey.trim(),
                    'gemini-flash-latest',
                    platform,
                    instruction,
                    activeDates,
                );
            }
        } catch (e: any) {
            this.logger.warn(`Gemini generation skipped or failed: ${e.message}`);
        }

        // 2. If Gemini unavailable, use the Dynamic Progressive E-Commerce Engine
        if (!generatedPlan || !Array.isArray(generatedPlan.days) || generatedPlan.days.length === 0) {
            generatedPlan = this.generateProgressiveFallbackDays(instruction, platform, activeDates);
        }

        const targetedGoal = generatedPlan.targetedGoal || `Accelerate ${platform} Sales & Deliver 25-35 Weekly Orders`;
        const priorityWork = generatedPlan.priorityWork || [
            `1. [${platform}] Daily execution of "${instruction.slice(0, 40)}..."`,
            `2. Strictly adhere to 9 AM – 6 PM hourly work blocks (1–2 PM lunch protected)`,
            `3. Review and log Daily Work Summary every evening before Nepal midnight lock`,
        ].join('\n');

        // Create a fast map of date => dayPlan
        const dayPlanMap = new Map<string, any>();
        generatedPlan.days.forEach(dp => {
            dayPlanMap.set(dp.date, dp);
        });

        // 3. Check for time slot collisions across active dates on the 8 hourly slots
        const conflicts: { date: string; time_block: string; existingTask: string; proposedTask: string }[] = [];

        for (const dateStr of activeDates) {
            const dateKey = `growth_routine_override_${userId}_${dateStr}`;
            const existingOverride = await this.getStorageKey(dateKey);
            const currentDayTasks = existingOverride && Array.isArray(existingOverride) ? existingOverride : templateTasks;
            const dayPlan = dayPlanMap.get(dateStr);

            for (const slot of HOURLY_WORK_SLOTS) {
                const existing = currentDayTasks.find((t: any) => t.category === 'work' && t.time_block === slot.time_block);
                if (existing) {
                    const proposed = dayPlan?.hourlyTasks?.find((ht: any) => ht.time_block === slot.time_block);
                    conflicts.push({
                        date: dateStr,
                        time_block: slot.time_block,
                        existingTask: existing.task_name,
                        proposedTask: proposed?.task_name || `[${platform}] ${slot.label}: ${instruction.slice(0, 30)}`,
                    });
                }
            }
        }

        // If conflicts exist and no resolution specified, return conflicts for user confirmation
        if (conflicts.length > 0 && !params.resolution) {
            return {
                status: 'conflict',
                message: `Found ${conflicts.length} scheduled time slots that already have booked routines.`,
                conflicts,
                activeDates,
                skippedDates,
                draft: {
                    targetedGoal,
                    priorityWork,
                    platform,
                    instruction,
                    days: generatedPlan.days,
                },
            };
        }

        // 4. Apply resolution and commit routines day by day
        const resolution = params.resolution || 'merge';

        for (let idx = 0; idx < activeDates.length; idx++) {
            const dateStr = activeDates[idx];
            const dateKey = `growth_routine_override_${userId}_${dateStr}`;
            const existingOverride = await this.getStorageKey(dateKey);
            const currentDayTasks = existingOverride && Array.isArray(existingOverride) ? existingOverride : [...templateTasks];
            const dayPlan = dayPlanMap.get(dateStr) || this.generateDefaultSingleDay(dateStr, idx + 1, activeDates.length, platform, instruction);

            // Save day plan metadata
            const dayMetaKey = `growth_day_plan_meta_${userId}_${dateStr}`;
            await this.setStorageKey(dayMetaKey, {
                date: dateStr,
                dayNumber: idx + 1,
                totalDays: activeDates.length,
                dayTheme: dayPlan.dayTheme,
                dailyTarget: dayPlan.dailyTarget,
                platform,
            });

            // Format day tasks
            const planHourlyTasks: RoutineTask[] = (dayPlan.hourlyTasks || []).map((ht: any, hIdx: number) => ({
                id: `ai_task_${dateStr.replace(/-/g, '')}_${hIdx}`,
                time_block: ht.time_block,
                task_name: ht.task_name,
                category: 'work' as const,
                auto_rollover: true,
                sort_order: 3 + hIdx,
                completed: false,
            }));

            let updatedTasks: RoutineTask[];

            if (resolution === 'overwrite') {
                // Keep non-work habits (morning & evening), overwrite all work tasks with new hourly tasks
                const nonWorkTasks = currentDayTasks.filter((t: any) => t.category !== 'work');
                updatedTasks = [...nonWorkTasks, ...planHourlyTasks].sort((a, b) => a.sort_order - b.sort_order);
            } else {
                // Smart Merge: keep existing tasks, insert AI tasks into empty hourly slots
                const existingSlots = new Set(currentDayTasks.map((t: any) => t.time_block));
                const additions: RoutineTask[] = [];

                planHourlyTasks.forEach(ht => {
                    if (!existingSlots.has(ht.time_block)) {
                        additions.push(ht);
                    }
                });
                updatedTasks = [...currentDayTasks, ...additions].sort((a, b) => a.sort_order - b.sort_order);
            }

            await this.setStorageKey(dateKey, updatedTasks);
        }

        // Save active strategy summary
        await this.saveStrategy(userId, {
            targetedGoal,
            priorityWork,
            platform,
            instruction,
            activeDatesCount: activeDates.length,
            startDate: params.startDate,
            daysDuration: params.days,
        });

        // Save active plan schedule index
        await this.setStorageKey(`growth_plan_index_${userId}`, {
            activeDates,
            startDate: params.startDate,
            daysDuration: params.days,
            platform,
            instruction,
            updatedAt: new Date().toISOString(),
        });

        return {
            status: 'success',
            message: `Strategy successfully generated! ${activeDates.length} distinct progressive daily routines created.`,
            targetedGoal,
            priorityWork,
            activeDates,
            skippedDates,
            dailyPlans: generatedPlan.days,
        };
    }

    /**
     * Calls Google Gemini to generate progressive, day-by-day hourly routines
     */
    private async callGeminiStrategyGenerator(
        geminiKey: string,
        modelName: string,
        platform: string,
        instruction: string,
        activeDates: string[],
    ): Promise<{ targetedGoal: string; priorityWork: string; days: any[] } | null> {
        try {
            const prompt = `You are a world-class e-commerce growth strategist in Nepal specializing in ${platform}.
Merchant Instruction: "${instruction}"
Platform Focus: ${platform}
Calendar Working Dates (${activeDates.length} days): ${activeDates.join(', ')}

MANDATORY SPECIFICATIONS:
1. Work hours are strictly 9:00 AM to 6:00 PM with 1:00 PM to 2:00 PM lunch break skipped.
2. For EVERY date in the list (${activeDates.join(', ')}), generate EXACTLY 8 hourly tasks for these exact time blocks:
   - "9:00 AM - 10:00 AM"
   - "10:00 AM - 11:00 AM"
   - "11:00 AM - 12:00 PM"
   - "12:00 PM - 1:00 PM"
   - "2:00 PM - 3:00 PM"
   - "3:00 PM - 4:00 PM"
   - "4:00 PM - 5:00 PM"
   - "5:00 PM - 6:00 PM"
3. STRICT NO-REPETITION REQUIREMENT: Each single date MUST have a UNIQUE, progressive daily theme and 8 specific, realistic operational actions tailored to ${platform}.
   - Early days: Audit, search SEO, voucher architecture, margin setup, listing infographics.
   - Mid days: Sponsored ads bidding, campaign flash sales, bundles, review harvesting, customer care.
   - Later days: Creative demo video, off-platform traffic, margin audit, restock forecasting.
4. Output ONLY valid JSON matching this schema:
{
  "targetedGoal": "Measurable KPI target (e.g. Deliver 100+ daily orders across Daraz)",
  "priorityWork": "1. ...\\n2. ...\\n3. ...",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayTheme": "Distinct theme of the day",
      "dailyTarget": "Concrete measurable output metric for today",
      "hourlyTasks": [
        { "time_block": "9:00 AM - 10:00 AM", "task_name": "Emoji + Actionable task title" },
        { "time_block": "10:00 AM - 11:00 AM", "task_name": "..." },
        { "time_block": "11:00 AM - 12:00 PM", "task_name": "..." },
        { "time_block": "12:00 PM - 1:00 PM", "task_name": "..." },
        { "time_block": "2:00 PM - 3:00 PM", "task_name": "..." },
        { "time_block": "3:00 PM - 4:00 PM", "task_name": "..." },
        { "time_block": "4:00 PM - 5:00 PM", "task_name": "..." },
        { "time_block": "5:00 PM - 6:00 PM", "task_name": "..." }
      ]
    }
  ]
}`;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
            const res = await axios.post(
                url,
                {
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.6,
                    },
                },
                { timeout: 35000 },
            );

            const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return null;
            const parsed = JSON.parse(text);
            if (parsed && Array.isArray(parsed.days) && parsed.days.length >= activeDates.length) {
                return parsed;
            }
            return null;
        } catch (err: any) {
            this.logger.warn(`Gemini API call failed: ${err.response?.data?.error?.message || err.message}`);
            return null;
        }
    }

    /**
     * Generates a progressive multi-day e-commerce strategy with unique themes and 8 hourly tasks per day
     */
    private generateProgressiveFallbackDays(
        instruction: string,
        platform: string,
        activeDates: string[],
    ): { targetedGoal: string; priorityWork: string; days: any[] } {
        const isDaraz = platform.toLowerCase().includes('daraz');
        const isFB = platform.toLowerCase().includes('facebook') || platform.toLowerCase().includes('fb');
        const isTikTok = platform.toLowerCase().includes('tiktok');

        // 14 Progressive Day Blueprint Templates
        const blueprints = [
            {
                theme: isDaraz
                    ? 'Day 1: Store Diagnostics, Search Title SEO & Follower Vouchers'
                    : 'Day 1: Ad Account Diagnostics, Pixel Audit & Hook Ideation',
                target: isDaraz
                    ? 'Optimize top 3 SKU listing titles with high-search keywords & publish Rs. 100 follower voucher'
                    : 'Audit CAPI tracking, define 3 problem-solution angles & prepare campaign budget',
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Morning Dispatch & Order Clearing: Verify overnight orders, print labels & check stock availability' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '🔍 Daraz Search Autocomplete SEO: Extract top search terms for hero SKUs from Daraz search bar' : '🔍 Competitor Ads Library Audit: Research winning competitor ad angles & video hooks' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '🏷️ Title & Bullet Point SEO Overhaul: Re-write hero SKU titles with (Brand + Type + Key Benefit)' : '📝 Ad Copywriting Sprint: Write 3 punchy primary texts with emoji benefits and COD guarantee' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '💬 Customer Care & Inquiries Blitz: Clear pending customer messages, Q&As, and confirm pending deliveries' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '🎁 Follower Voucher Activation: Setup Rs. 100 off follower voucher to convert store visits into followers' : '🎬 Creative Hook Recording: Shoot 3 fast 3-second visual hooks for hero product on mobile camera' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '📸 Main Hero Image Polish: Add high-contrast white background, warranty badge & free delivery icon' : '🎯 Audience Setup: Configure broad + interest-stack ad sets targeting major Nepal urban hubs' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Carrier Dispatch Coordination: Handover packed parcels, obtain signed manifest & verify tracking codes' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '📊 Daily Financial & Metrics Log: Record today\'s total orders, gross sales, return count & ad spend' },
                ],
            },
            {
                theme: isDaraz
                    ? 'Day 2: Free Shipping Economics, Bundles & Campaign Enrollment'
                    : 'Day 2: Video Creative Editing & Campaign Soft Launch',
                target: isDaraz
                    ? 'Build 2 Flexi Combo bundles and register top items into Daraz Mega / Flash Sale promotions'
                    : 'Finalize 2 high-converting video ads and launch testing campaign with Rs. 1,000 daily budget',
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Fast Order Fulfillment: Batch print manifests and verify packaging quality for fragile items' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '💰 Free Shipping Margin Calculation: Model minimum spend threshold (e.g. Rs. 2,500) for free shipping' : '✂️ Video Editing Sprint: Add clear text overlays, captions, and trending background track' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '📦 Flexi Combo Setup: Create \'Buy 2 Get 5% Off\' bundle deal in Seller Center to lift Average Order Value' : '🚀 Ad Campaign Setup: Launch Advantage+ campaign with Rs. 500-1,000 daily budget' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '💬 Instant Chat Auto-Replies: Set up quick reply vouchers for customers asking for "best price"' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '⚡ Daraz Campaign Registration: Enroll qualifying SKUs into upcoming Daraz Flash Sales' : '📱 TikTok / Reels Organic Post: Cross-publish ad video as organic reel with link in bio' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '📝 Product Attribute Completeness: Fill all optional specs and warranty data to lift Daraz algorithm rank' : '💬 Comment Moderation & Auto-DM: Set up automatic reply to post comments with order link' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Logistics Manifest Handover: Confirm courier pickup and log airway bill numbers in tracking system' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '📈 Evening P&L & Margin Audit: Audit gross margin per SKU and review early ad delivery numbers' },
                ],
            },
            {
                theme: isDaraz
                    ? 'Day 3: Sponsored Solutions (Search Ads) & Review Acceleration'
                    : 'Day 3: Creative Angle Iteration & WhatsApp Direct Funnel',
                target: isDaraz
                    ? 'Launch 1 Daraz Sponsored Solutions search campaign (Rs. 300-500 test) & request 10 reviews'
                    : 'Implement WhatsApp click-to-chat catalog ad & monitor initial Cost Per Messaging Order',
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Morning Dispatch Priority: Expedite aged orders to maintain a 98%+ on-time dispatch metric' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '🎯 Sponsored Search Solutions Setup: Create targeted keyword campaign for top 2 bestselling SKUs' : '🎯 WhatsApp Click-to-Chat Ad: Configure direct WhatsApp message ad with pre-filled order prompt' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '🔑 Keyword Bidding & Negative Keywords: Set competitive CPC bids; exclude wasteful irrelevant searches' : '⚡ Quick-Reply WhatsApp Templates: Configure fast closing templates (pricing, delivery time, address format)' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '⭐ Review Harvesting Outreach: Send gentle messages to delivered buyers requesting 5-star photo reviews' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '🎥 15-Second Listing Video: Film simple unboxing and demonstration video for the hero SKU listing' : '🎬 Creator Barter Outreach: Message 5 micro-creators in Nepal for product exchange shoutouts' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '🏷️ Multi-Tier Voucher Matrix: Publish Rs. 150 off on Rs. 2,000 and Rs. 400 off on Rs. 4,500' : '📊 First 24-Hour Ad Audit: Review CTR, CPM, and Cost Per Message; pause non-performing creative' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Courier Handover & Return Inspection: Check return parcel reasons and update stock inventory' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '📈 Ad Spend vs Revenue Check: Calculate daily Return on Ad Spend (ROAS) and update work summary' },
                ],
            },
            {
                theme: isDaraz
                    ? 'Day 4: Conversion Rate Optimization (CRO) & Product Q&A Clearance'
                    : 'Day 4: Retargeting Setup & Customer Objection Overhaul',
                target: isDaraz
                    ? 'Resolve all customer objections in Q&A and improve product description readability'
                    : 'Launch retargeting ad set for past page engagers & refine objection-handling copy',
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Order Batching & Packaging Check: Verify all packing slips and ensure correct SKU variants' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '🔍 Listing Description Format: Reformat description with bold headers, bullet specifications & FAQ' : '🎯 Custom Audience Creation: Build 30-day Facebook Page & Instagram engagement custom audience' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '💬 Comprehensive Q&A Audit: Add 5 preemptive questions/answers on product page addressing common doubts' : '📝 Retargeting Creative: Build "Still Thinking?" ad with social proof testimonials and limited stock hook' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '💬 Live Customer Chat Sprint: Provide immediate replies to active window shoppers' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '📊 Competitor Price & Stock Spy: Check competitor stockouts and adjust prices to win Buy Box' : '📸 Story Proof Blitz: Post 5 Instagram & Facebook Stories showing daily packed dispatch parcels' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '🏷️ Seller Picks & Showcase: Allocate top 3 seller pick slots to highest-converting products' : '💬 Unanswered Leads Re-engagement: Follow up with leads who stopped responding during checkout' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Manifest Signoff & Branch Handover: Track in-transit parcels and resolve out-of-delivery delays' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '📊 Conversion Rate Audit: Compare store visits vs checkouts to identify drop-off points' },
                ],
            },
            {
                theme: isDaraz
                    ? 'Day 5: Social Media Synergy & Daraz Store Broadcast'
                    : 'Day 5: Scaling Budget on Winning Ad Sets & UGC Integration',
                target: isDaraz
                    ? 'Send 1 Daraz Feed / Store Broadcast to followers with exclusive weekend flash code'
                    : 'Scale daily budget by 20% on winning ad set and add customer video testimonials',
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Priority Order Dispatch: Prepare parcels for earliest carrier pickup window' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '📢 Daraz Feed / Broadcast Sprint: Compose broadcast post with exclusive Rs. 150 voucher for followers' : '📈 Budget Scale Execution: Increase budget by 20% on winning ad sets maintaining target ROAS' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '📱 Cross-Promotion TikTok/Reels: Film TikTok showcasing top Daraz product with "Search [Keyword] on Daraz"' : '✂️ UGC Video Ad Variation: Stitch customer unboxing video with strong problem-solving intro hook' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '💬 Order Confirmation Phone Calls: Call high-value orders to verify phone and delivery address' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '🎁 Flash Sale SKU Replenishment: Ensure sufficient safety stock allocated for upcoming flash campaigns' : '📱 Marketplace Listing Blast: Post top 3 products on Facebook Marketplace with local city tags' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '🔍 Keyword Search Placement Check: Search keywords in incognito window to verify organic listing rank' : '💬 WhatsApp Customer VIP Broadcast: Send weekend flash deal to past happy customers' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Evening Logistics Handover: Final courier signoff and track transit updates' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '📊 Cash Flow & COD Reconciliation: Verify payments received from logistics partner against manifests' },
                ],
            },
            {
                theme: isDaraz
                    ? 'Day 6: Negative Review Resolution & Catalog Hygiene'
                    : 'Day 6: Ad Fatigue Prevention & Audience Expansion',
                target: isDaraz
                    ? 'Reach out to dissatisfied buyers, offer replacement/resolution & clean outdated SKU listings'
                    : 'Test 2 new lookalike / broad audiences and refresh thumbnail imagery'
                ,
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Order Fulfillment & Dispatch Manifest: Process weekend rush orders before noon' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '⚠️ Review Mitigation Protocol: Contact 1-3 star review buyers to offer resolution or exchange' : '🔍 Audience Expansion Test: Create Lookalike Audience based on past 60-day purchasers' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '🧹 Dead Listing Cleanup: Deactivate out-of-stock SKUs and fix non-compliant image dimensions' : '🎨 Ad Thumbnail A/B Test: Design 2 high-contrast image thumbnails for existing video ads' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '💬 Pre-Weekend Chat Support: Clear buyer questions about weekend delivery timelines' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '🏷️ Multi-Pack Listing Creation: Create 2-pack and 3-pack product listings with discounted unit price' : '🎬 TikTok Trend Riding: Record short video utilizing current trending sound and funny product angle' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '📊 Sponsored Solutions Bid Pruning: Lower bids on keywords with high spend but zero conversions' : '📊 Ad Creative Metric Check: Compare 3-second hook rate and hold rate across all active ads' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Logistics Delivery Status Audit: Follow up on stuck packages in courier hub' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '💰 Weekly Profit & Margin Calculation: Calculate week\'s net profit after product cost, ads, and shipping' },
                ],
            },
            {
                theme: isDaraz
                    ? 'Day 7: Weekly Sprint Synthesis, Stock Forecasting & Next Week Plan'
                    : 'Day 7: Weekly Performance Synthesis, Winner Scaling & Ad Pruning',
                target: isDaraz
                    ? 'Conduct full weekly performance audit, calculate SKU sell-through rate & place re-order'
                    : 'Prune losing ads, synthesize Cost Per Acquisition, and plan next creative batch',
                tasks: [
                    { time_block: '9:00 AM - 10:00 AM', task_name: '📦 Morning Dispatch & Warehouse Organization: Process orders and organize inventory shelves' },
                    { time_block: '10:00 AM - 11:00 AM', task_name: isDaraz ? '📈 Daraz Seller Center Deep Audit: Review Visitor traffic, Conversion rate, and Seller Rating' : '📈 Full Ad Account Performance Review: Analyze CPA, ROAS, frequency, and total purchases' },
                    { time_block: '11:00 AM - 12:00 PM', task_name: isDaraz ? '📦 Restock Forecasting: Calculate run-rate of top SKUs and issue vendor purchase orders' : '✂️ Budget Re-allocation: Turn off underperforming ad sets; allocate spend to top 2 winners' },
                    { time_block: '12:00 PM - 1:00 PM', task_name: '💬 Customer Review Follow-Up: Thank positive reviewers and note common product improvement feedback' },
                    { time_block: '2:00 PM - 3:00 PM', task_name: isDaraz ? '🎯 Next Week Campaign Strategy: Identify upcoming Daraz calendar events and plan discounts' : '📝 Script Next Week Video Batch: Write 3 new scripts based on top performing hook angles' },
                    { time_block: '3:00 PM - 4:00 PM', task_name: isDaraz ? '🏷️ Pricing & Margin Realignment: Adjust pricing based on supplier cost fluctuations' : '💬 Partner / Team Weekly Alignment: Summarize key order numbers and spend for team review' },
                    { time_block: '4:00 PM - 5:00 PM', task_name: '🚚 Logistics Partner Weekly Settlement: Verify COD collection amounts with Pathao / NCM / Courier' },
                    { time_block: '5:00 PM - 6:00 PM', task_name: '🏆 Executive Summary & Next Sprint Roadmap: Write weekly wrap-up in Daily Work Summary' },
                ],
            },
        ];

        // Map active dates to blueprints (cycling if > 7 days, updating day numbers)
        const days = activeDates.map((dateStr, idx) => {
            const bpIndex = idx % blueprints.length;
            const cycleNumber = Math.floor(idx / blueprints.length) + 1;
            const bp = blueprints[bpIndex];

            const dayNum = idx + 1;
            const theme = cycleNumber > 1
                ? bp.theme.replace(/^Day \d+:/, `Day ${dayNum} (Scale Phase ${cycleNumber}):`)
                : bp.theme.replace(/^Day \d+:/, `Day ${dayNum}:`);

            return {
                date: dateStr,
                dayNumber: dayNum,
                dayTheme: theme,
                dailyTarget: bp.target,
                hourlyTasks: bp.tasks.map(t => ({
                    time_block: t.time_block,
                    task_name: t.task_name,
                })),
            };
        });

        const targetedGoal = `Accelerate ${platform} Sales & Deliver 25-35 Weekly Orders outside single-channel risk`;
        const priorityWork = [
            `1. [${platform}] Daily execution of "${instruction.slice(0, 40)}..."`,
            `2. Strictly adhere to 9 AM – 6 PM hourly work blocks (1–2 PM lunch protected)`,
            `3. Review and log Daily Work Summary every evening before Nepal midnight lock`,
        ].join('\n');

        return {
            targetedGoal,
            priorityWork,
            days,
        };
    }

    private generateDefaultSingleDay(dateStr: string, dayNum: number, totalDays: number, platform: string, instruction: string) {
        return {
            date: dateStr,
            dayNumber: dayNum,
            dayTheme: `Day ${dayNum}: ${platform} Growth Execution`,
            dailyTarget: `Deliver disciplined execution of ${instruction.slice(0, 30)}`,
            hourlyTasks: HOURLY_WORK_SLOTS.map((slot) => ({
                time_block: slot.time_block,
                task_name: `🎯 [${platform}] ${slot.label}: Focus on ${instruction.slice(0, 35)}`,
            })),
        };
    }

    /**
     * Get Schedule Overview for Daily Plan Calendar
     */
    async getScheduleOverview(userId: string, startDate?: string, daysCount: number = 14) {
        const todayNepal = this.getNepalDateStr();
        const start = startDate || todayNepal;
        const holidays = await this.getHolidays(userId);

        const startParts = start.split('-').map(Number);
        const curr = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0);

        const result: any[] = [];
        for (let i = 0; i < daysCount; i++) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const isSaturday = curr.getDay() === 6;
            const hol = holidays.find(h => dateStr >= h.start_date && dateStr <= h.end_date);
            const dayMeta = await this.getStorageKey(`growth_day_plan_meta_${userId}_${dateStr}`);
            const override = await this.getStorageKey(`growth_routine_override_${userId}_${dateStr}`);
            const logMap = (await this.getStorageKey(`growth_routine_log_${userId}_${dateStr}`)) || {};

            const tasks = override && Array.isArray(override) ? override : (dayMeta ? [] : await this.getRoutineTasks(userId));
            const workTasks = tasks.filter((t: any) => t.category === 'work');
            const completedCount = workTasks.filter((t: any) => logMap[t.id]?.completed).length;

            result.push({
                date: dateStr,
                dayNumber: dayMeta?.dayNumber || null,
                totalDays: dayMeta?.totalDays || null,
                dayTheme: dayMeta?.dayTheme || (isSaturday ? 'Saturday Store Off / Team Rest' : (hol ? `Holiday: ${hol.label}` : 'Standard Daily Routine')),
                dailyTarget: dayMeta?.dailyTarget || null,
                totalTasks: workTasks.length,
                completedTasks: completedCount,
                isLocked: this.isPastNepalMidnight(dateStr),
                isToday: dateStr === todayNepal,
                isSaturday,
                isHoliday: !!hol,
                holidayLabel: hol ? hol.label : null,
                hasPlan: !!dayMeta || (override && override.length > 0),
            });

            curr.setDate(curr.getDate() + 1);
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. PROJECT & IDEA VAULT ("Plan / Idea" Tab)
    // ─────────────────────────────────────────────────────────────

    async getProjects(userId: string): Promise<ProjectVault[]> {
        const key = `growth_ideas_${userId}`;
        const list = await this.getStorageKey(key);
        if (!list || !Array.isArray(list)) {
            // Seed default projects
            const defaults: ProjectVault[] = [
                {
                    id: 'proj_daraz',
                    name: '🛒 Daraz Growth & SEO',
                    description: 'Ideas for bundle deals, keyword optimizations, and flash sales',
                    color: 'amber',
                    created_at: new Date().toISOString(),
                    ideas: [
                        { id: 'id_1', title: 'Test Flexi-combo Buy 2 Get 5% Off', description: 'Increases basket size from Rs. 800 to Rs. 1400', status: 'idea', created_at: new Date().toISOString() },
                        { id: 'id_2', title: 'Audit missing product attributes on top 10 SKUs', description: 'Improves Daraz search ranking algorithm by 40%', status: 'in_progress', created_at: new Date().toISOString() },
                    ]
                },
                {
                    id: 'proj_facebook',
                    name: '📘 Facebook Ads & Video Hooks',
                    description: 'Creative angles, Advantage+ campaign structures, and offers',
                    color: 'blue',
                    created_at: new Date().toISOString(),
                    ideas: [
                        { id: 'id_3', title: 'Film 3-second problem callout video in Nepali', description: 'Show problem immediately before showing product', status: 'idea', created_at: new Date().toISOString() },
                    ]
                },
                {
                    id: 'proj_tiktok',
                    name: '📱 TikTok Viral Concepts',
                    description: 'Short demo clips, trending audio, and direct DM orders',
                    color: 'pink',
                    created_at: new Date().toISOString(),
                    ideas: []
                }
            ];
            await this.setStorageKey(key, defaults);
            return defaults;
        }
        return list;
    }

    async saveProject(userId: string, project: { id?: string; name: string; description?: string; color?: string }) {
        const projects = await this.getProjects(userId);
        if (project.id) {
            const idx = projects.findIndex(p => p.id === project.id);
            if (idx >= 0) {
                projects[idx] = { ...projects[idx], ...project };
            }
        } else {
            projects.unshift({
                id: `proj_${Date.now()}`,
                name: project.name,
                description: project.description || '',
                color: project.color || 'blue',
                created_at: new Date().toISOString(),
                ideas: [],
            });
        }
        await this.setStorageKey(`growth_ideas_${userId}`, projects);
        return projects;
    }

    async deleteProject(userId: string, projectId: string) {
        const projects = await this.getProjects(userId);
        const filtered = projects.filter(p => p.id !== projectId);
        await this.setStorageKey(`growth_ideas_${userId}`, filtered);
        return true;
    }

    async addIdea(userId: string, projectId: string, idea: { title: string; description?: string }) {
        const projects = await this.getProjects(userId);
        const target = projects.find(p => p.id === projectId);
        if (!target) throw new Error('Project not found');

        const newIdea: IdeaItem = {
            id: `idea_${Date.now()}`,
            title: idea.title,
            description: idea.description || '',
            status: 'idea',
            created_at: new Date().toISOString(),
        };
        target.ideas.unshift(newIdea);
        await this.setStorageKey(`growth_ideas_${userId}`, projects);
        return newIdea;
    }

    async updateIdeaStatus(userId: string, projectId: string, ideaId: string, status: 'idea' | 'in_progress' | 'completed') {
        const projects = await this.getProjects(userId);
        const target = projects.find(p => p.id === projectId);
        if (!target) throw new Error('Project not found');

        const idea = target.ideas.find(i => i.id === ideaId);
        if (idea) {
            idea.status = status;
            if (status === 'completed') idea.completed_at = new Date().toISOString();
        }
        await this.setStorageKey(`growth_ideas_${userId}`, projects);
        return idea;
    }

    async deleteIdea(userId: string, projectId: string, ideaId: string) {
        const projects = await this.getProjects(userId);
        const target = projects.find(p => p.id === projectId);
        if (!target) throw new Error('Project not found');

        target.ideas = target.ideas.filter(i => i.id !== ideaId);
        await this.setStorageKey(`growth_ideas_${userId}`, projects);
        return true;
    }

    async promoteIdeaToRoutine(userId: string, params: { ideaTitle: string; dateStr: string; timeBlock?: string }) {
        const dateKey = `growth_routine_override_${userId}_${params.dateStr}`;
        const template = await this.getRoutineTasks(userId);
        const existing = (await this.getStorageKey(dateKey)) || [...template];

        const newTask: RoutineTask = {
            id: `promoted_${Date.now()}`,
            time_block: params.timeBlock || '11:30 AM - 1:00 PM',
            task_name: `💡 [Idea] ${params.ideaTitle}`,
            category: 'work',
            auto_rollover: true,
            sort_order: 4,
            completed: false,
        };

        existing.push(newTask);
        existing.sort((a: any, b: any) => a.sort_order - b.sort_order);
        await this.setStorageKey(dateKey, existing);
        return newTask;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. AI REPORT (Daily & Weekly Synthesis)
    // ─────────────────────────────────────────────────────────────

    async generateDailyAiReport(userId: string, targetDateStr?: string) {
        const dateStr = targetDateStr || this.getNepalDateStr();

        // Compute yesterday date
        const parts = dateStr.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() - 1);
        const yParts = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')];
        const yesterdayStr = `${yParts[0]}-${yParts[1]}-${yParts[2]}`;

        // Fetch yesterday routine & summary
        const yesterdayRoutine = await this.getRoutineForDate(userId, yesterdayStr);
        const yesterdaySummary = await this.getDailySummary(userId, yesterdayStr);

        // Fetch today routine & strategy
        const todayRoutine = await this.getRoutineForDate(userId, dateStr);
        const strategy = await this.getStrategy(userId);

        const completedYesterday = yesterdayRoutine.tasks.filter(t => t.completed);
        const pendingYesterday = yesterdayRoutine.tasks.filter(t => !t.completed);

        // Synthesis
        const completionRate = yesterdayRoutine.tasks.length > 0
            ? Math.round((completedYesterday.length / yesterdayRoutine.tasks.length) * 100)
            : 0;

        const reportKey = `growth_aireport_daily_${userId}_${dateStr}`;
        const report = {
            date: dateStr,
            yesterdayDate: yesterdayStr,
            yesterdayAudit: {
                totalTasks: yesterdayRoutine.tasks.length,
                completedCount: completedYesterday.length,
                pendingCount: pendingYesterday.length,
                completionRate,
                completedTaskNames: completedYesterday.map(t => t.task_name),
                droppedTaskNames: pendingYesterday.map(t => t.task_name),
                userSummaryText: yesterdaySummary.summary || 'No written summary logged yesterday.',
            },
            todayFocus: {
                activeGoal: strategy.targetedGoal,
                topPriorities: [
                    todayRoutine.tasks.find(t => t.category === 'work')?.task_name || 'Execute high-impact sales sprint',
                    'Process and dispatch all customer orders before 5:00 PM',
                    'Log daily achievements and review order volume before midnight lock',
                ],
                totalScheduledTasks: todayRoutine.tasks.length,
            },
            strategicAdvice: completionRate >= 70
                ? '🔥 Excellent momentum! Keep your phone in focus mode during the 11:30 AM – 1:00 PM growth block.'
                : '⚠️ Notice where friction occurred yesterday. Remember: Work hours are strictly 9 AM – 6 PM. Do not overcommit — finish ONE priority at a time.',
            generatedAt: new Date().toISOString(),
        };

        await this.setStorageKey(reportKey, report);
        return report;
    }

    async getDailyAiReport(userId: string, dateStr: string) {
        const key = `growth_aireport_daily_${userId}_${dateStr}`;
        const report = await this.getStorageKey(key);
        return report || null;
    }

    async generateWeeklyAiReport(userId: string, weekStart?: string) {
        const wStart = weekStart || this.getNepalDateStr();
        const strategy = await this.getStrategy(userId);

        const reportKey = `growth_aireport_weekly_${userId}_${wStart}`;
        const report = {
            weekStart: wStart,
            strategyGoal: strategy.targetedGoal,
            keyAccomplishments: [
                'Maintained consistent order processing and zero customer cancellation backlog',
                'Protected morning personal time and avoided burnout by skipping Saturdays',
                'Generated tactical multi-platform routines directly tied to business growth',
            ],
            criticalBottlenecks: [
                'Ensure daily summaries are logged every evening before Nepal midnight lock',
                'Continue diversifying away from single-platform dependency toward Facebook Ads and TikTok',
            ],
            nextWeekDirectives: [
                'Scale winning creative hooks and test bundle offers on Daraz',
                'Focus deep work strictly in the 9:00 AM – 1:00 PM and 2:00 PM – 6:00 PM windows',
            ],
            generatedAt: new Date().toISOString(),
        };

        await this.setStorageKey(reportKey, report);
        return report;
    }

    async getWeeklyAiReport(userId: string, weekStart: string) {
        const key = `growth_aireport_weekly_${userId}_${weekStart}`;
        return (await this.getStorageKey(key)) || null;
    }

    // ─────────────────────────────────────────────────────────────
    // 7. HOLIDAYS (Supports Multiple Concurrent & Upcoming)
    // ─────────────────────────────────────────────────────────────

    async getHolidays(userId: string): Promise<HolidayItem[]> {
        const key = `growth_holidays_${userId}`;
        const holidays = await this.getStorageKey(key);
        return holidays || [];
    }

    async addHoliday(userId: string, holiday: Omit<HolidayItem, 'id'>): Promise<HolidayItem> {
        const key = `growth_holidays_${userId}`;
        const current = await this.getHolidays(userId);
        const newItem: HolidayItem = {
            id: `hol_${Date.now()}`,
            ...holiday,
        };
        current.push(newItem);
        await this.setStorageKey(key, current);
        return newItem;
    }

    async deleteHoliday(userId: string, id: string): Promise<boolean> {
        const key = `growth_holidays_${userId}`;
        const current = await this.getHolidays(userId);
        const filtered = current.filter(h => h.id !== id);
        await this.setStorageKey(key, filtered);
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // 8. SCORECARD
    // ─────────────────────────────────────────────────────────────

    async getScorecard(userId: string, weekStart: string) {
        const key = `growth_scorecard_${userId}_${weekStart}`;
        return (await this.getStorageKey(key)) || null;
    }

    async saveScorecard(userId: string, weekStart: string, payload: any) {
        const key = `growth_scorecard_${userId}_${weekStart}`;
        await this.setStorageKey(key, payload);
        return payload;
    }
}
