import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseService } from '../supabase/supabase.service';

export interface DailyPlatformMetrics {
    date: string;
    dayName: string;
    Daraz: number;
    Facebook: number;
    TikTok: number;
    Instagram: number;
    Website: number;
    Marketplace: number;
    Others: number;
    totalOrders: number;
    totalRevenue: number;
    darazRevenue: number;
    nonDarazRevenue: number;
}

export interface PlatformSummaryItem {
    name: string;
    orders: number;
    revenue: number;
    sharePercent: number;
    targetPercent: number;
    cancelledCount: number;
}

function formatDateYMD(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateYMD(str: string): Date {
    const parts = str.split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
    }
    return new Date(str);
}

@Injectable()
export class OrderReportsService {
    private readonly logger = new Logger(OrderReportsService.name);
    private invSupabase: SupabaseClient | null = null;

    constructor(private configService: ConfigService) {
        this.initInvSupabase();
    }

    private initInvSupabase() {
        const invUrl = this.configService.get<string>('INV_SUPABASE_URL') || process.env.INV_SUPABASE_URL;
        const invKey = this.configService.get<string>('INV_SUPABASE_SERVICE_ROLE_KEY') ||
            this.configService.get<string>('INV_SUPABASE_ANON_KEY') ||
            process.env.INV_SUPABASE_SERVICE_ROLE_KEY ||
            process.env.INV_SUPABASE_ANON_KEY;

        if (invUrl && invKey) {
            this.invSupabase = createClient(invUrl, invKey);
            this.logger.log('✅ Inventory Supabase client initialized in OrderReportsService');
        } else {
            this.logger.warn('⚠️ Inventory Supabase credentials missing; Daraz tracking will fallback');
        }
    }

    private normalizePlatform(platform?: string, pageName?: string): 'Facebook' | 'TikTok' | 'Instagram' | 'Website' | 'Marketplace' | 'Others' {
        if (!platform && !pageName) return 'Others';
        const p = (platform || '').toLowerCase();
        const page = (pageName || '').toLowerCase();

        if (p.includes('tiktok')) return 'TikTok';
        if (p.includes('insta')) return 'Instagram';
        if (p.includes('website') || p.includes('shop') || p.includes('web')) return 'Website';
        if (p.includes('marketplace') || page.includes('marketplace')) return 'Marketplace';
        if (p.includes('facebook') || page.includes('bagmati') || page.includes('sasto')) return 'Facebook';

        return 'Others';
    }

    /**
     * Get real-time daily order progress across Daraz + all channels for a given date range.
     * Default: Current Week (Sunday to Saturday)
     */
    async getDailyOrderProgress(startDateStr?: string, endDateStr?: string) {
        const now = new Date();

        // Calculate start and end of current week (Sunday to Saturday)
        let start: Date;
        let end: Date;

        if (startDateStr) {
            start = parseDateYMD(startDateStr);
            start.setHours(0, 0, 0, 0);
            if (endDateStr) {
                end = parseDateYMD(endDateStr);
            } else {
                end = new Date(start);
                end.setDate(start.getDate() + 6);
            }
            end.setHours(23, 59, 59, 999);
        } else {
            // Default to current week (Sunday to Saturday)
            const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
            start = new Date(now);
            start.setDate(now.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        }

        const startIso = formatDateYMD(start);
        const endIso = formatDateYMD(end);
        const startTimestamp = `${startIso}T00:00:00.000Z`;
        const endTimestamp = `${endIso}T23:59:59.999Z`;

        // 1. Fetch orders from main Supabase
        const mainClient = supabaseService.getClient();
        const { data: mainOrders, error: mainError } = await mainClient
            .from('orders')
            .select('id, order_number, order_status, platform, page_name, total_amount, created_at')
            .gte('created_at', startTimestamp)
            .lte('created_at', endTimestamp);

        if (mainError) {
            this.logger.error(`Error fetching main orders: ${mainError.message}`);
        }

        // 2. Fetch Daraz orders from Inventory Supabase
        let darazOrders: any[] = [];
        if (this.invSupabase) {
            const { data: dOrders, error: dError } = await this.invSupabase
                .from('daraz_orders')
                .select('id, order_number, order_status, order_date, price, items_count, deleted')
                .gte('order_date', startIso)
                .lte('order_date', endIso)
                .or('deleted.is.null,deleted.eq.false');

            if (dError) {
                this.logger.error(`Error fetching Daraz orders: ${dError.message}`);
            } else if (dOrders) {
                darazOrders = dOrders;
            }
        }

        // Filter out Cancel / Cancelled / Unpaid orders
        const cancelledStatuses = new Set(['cancel', 'cancelled', 'unpaid']);

        const activeMainOrders = (mainOrders || []).filter(o => {
            const status = (o.order_status || '').toLowerCase().trim();
            return !cancelledStatuses.has(status);
        });

        const cancelledMainOrdersCount = (mainOrders || []).filter(o => {
            const status = (o.order_status || '').toLowerCase().trim();
            return cancelledStatuses.has(status);
        }).length;

        const activeDarazOrders = darazOrders.filter(o => {
            const status = (o.order_status || '').toLowerCase().trim();
            return !cancelledStatuses.has(status);
        });

        const cancelledDarazOrdersCount = darazOrders.filter(o => {
            const status = (o.order_status || '').toLowerCase().trim();
            return cancelledStatuses.has(status);
        }).length;

        // Initialize 7-day array
        const daysMap = new Map<string, DailyPlatformMetrics>();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const curr = new Date(start);
        while (curr <= end) {
            const dateStr = formatDateYMD(curr);
            const dName = dayNames[curr.getDay()];
            daysMap.set(dateStr, {
                date: dateStr,
                dayName: dName,
                Daraz: 0,
                Facebook: 0,
                TikTok: 0,
                Instagram: 0,
                Website: 0,
                Marketplace: 0,
                Others: 0,
                totalOrders: 0,
                totalRevenue: 0,
                darazRevenue: 0,
                nonDarazRevenue: 0,
            });
            curr.setDate(curr.getDate() + 1);
        }

        // Aggregate Daraz Orders
        for (const o of activeDarazOrders) {
            const dateStr = (o.order_date || '').split('T')[0];
            const entry = daysMap.get(dateStr);
            if (entry) {
                entry.Daraz += 1;
                entry.totalOrders += 1;
                const rev = Number(o.price || 0);
                entry.darazRevenue += rev;
                entry.totalRevenue += rev;
            }
        }

        // Aggregate Main Orders
        for (const o of activeMainOrders) {
            const dateStr = (o.created_at || '').split('T')[0];
            const entry = daysMap.get(dateStr);
            if (entry) {
                const p = this.normalizePlatform(o.platform, o.page_name);
                entry[p] += 1;
                entry.totalOrders += 1;
                const rev = Number(o.total_amount || 0);
                entry.nonDarazRevenue += rev;
                entry.totalRevenue += rev;
            }
        }

        const dailyBreakdown = Array.from(daysMap.values());

        // Calculate Totals & Platform Breakdown
        let totalDarazOrders = 0;
        let totalFbOrders = 0;
        let totalTikTokOrders = 0;
        let totalIgOrders = 0;
        let totalWebOrders = 0;
        let totalMarketplaceOrders = 0;
        let totalOthersOrders = 0;

        let totalDarazRev = 0;
        let totalNonDarazRev = 0;

        for (const d of dailyBreakdown) {
            totalDarazOrders += d.Daraz;
            totalFbOrders += d.Facebook;
            totalTikTokOrders += d.TikTok;
            totalIgOrders += d.Instagram;
            totalWebOrders += d.Website;
            totalMarketplaceOrders += d.Marketplace;
            totalOthersOrders += d.Others;
            totalDarazRev += d.darazRevenue;
            totalNonDarazRev += d.nonDarazRevenue;
        }

        const totalOrders = totalDarazOrders + totalFbOrders + totalTikTokOrders + totalIgOrders + totalWebOrders + totalMarketplaceOrders + totalOthersOrders;
        const totalRevenue = totalDarazRev + totalNonDarazRev;
        const nonDarazOrders = totalOrders - totalDarazOrders;

        const darazShare = totalOrders > 0 ? Math.round((totalDarazOrders / totalOrders) * 100) : 0;
        const fbShare = totalOrders > 0 ? Math.round((totalFbOrders / totalOrders) * 100) : 0;
        const tikTokShare = totalOrders > 0 ? Math.round((totalTikTokOrders / totalOrders) * 100) : 0;
        const igShare = totalOrders > 0 ? Math.round((totalIgOrders / totalOrders) * 100) : 0;
        const webShare = totalOrders > 0 ? Math.round((totalWebOrders / totalOrders) * 100) : 0;
        const mktShare = totalOrders > 0 ? Math.round((totalMarketplaceOrders / totalOrders) * 100) : 0;
        const othShare = totalOrders > 0 ? Math.round((totalOthersOrders / totalOrders) * 100) : 0;

        const platforms: PlatformSummaryItem[] = [
            { name: 'Daraz', orders: totalDarazOrders, revenue: totalDarazRev, sharePercent: darazShare, targetPercent: 40, cancelledCount: cancelledDarazOrdersCount },
            { name: 'Facebook Ads/Page', orders: totalFbOrders, revenue: 0, sharePercent: fbShare, targetPercent: 35, cancelledCount: 0 },
            { name: 'TikTok', orders: totalTikTokOrders, revenue: 0, sharePercent: tikTokShare, targetPercent: 15, cancelledCount: 0 },
            { name: 'Instagram', orders: totalIgOrders, revenue: 0, sharePercent: igShare, targetPercent: 10, cancelledCount: 0 },
            { name: 'Website', orders: totalWebOrders, revenue: 0, sharePercent: webShare, targetPercent: 0, cancelledCount: 0 },
            { name: 'Marketplace', orders: totalMarketplaceOrders, revenue: 0, sharePercent: mktShare, targetPercent: 0, cancelledCount: 0 },
            { name: 'Others', orders: totalOthersOrders, revenue: 0, sharePercent: othShare, targetPercent: 0, cancelledCount: 0 },
        ];

        return {
            weekStart: startIso,
            weekEnd: endIso,
            totalOrders,
            totalRevenue,
            darazOrders: totalDarazOrders,
            nonDarazOrders,
            darazRevenue: totalDarazRev,
            nonDarazRevenue: totalNonDarazRev,
            darazSharePercent: darazShare,
            nonDarazSharePercent: 100 - darazShare,
            totalCancelled: cancelledMainOrdersCount + cancelledDarazOrdersCount,
            dailyBreakdown,
            platforms,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Get Saturday Auto-Snapshot + Sunday Review data for a user
     */
    async getWeeklyReport(userId: string, weekStart?: string) {
        const progress = await this.getDailyOrderProgress(weekStart);

        // Fetch stored reflection / review for this week from Supabase settings
        const mainClient = supabaseService.getClient();
        const settingsKey = `growth_report_${userId}_${progress.weekStart}`;

        let storedReview: any = null;
        try {
            const { data } = await mainClient
                .from('settings')
                .select('value')
                .eq('key', settingsKey)
                .single();

            if (data?.value) {
                storedReview = JSON.parse(data.value);
            }
        } catch (e) {
            // Ignore if not found
        }

        return {
            ...progress,
            sundaySummary: storedReview?.sunday_summary || '',
            actionPlanNextWeek: storedReview?.action_plan_next_week || '',
            isReviewed: !!storedReview?.is_reviewed,
            reviewedAt: storedReview?.reviewed_at || null,
        };
    }

    /**
     * Save Sunday Executive Summary and Action Plan for the week
     */
    async saveSundaySummary(userId: string, weekStart: string, data: { summary: string; actionPlan: string }) {
        const mainClient = supabaseService.getClient();
        const settingsKey = `growth_report_${userId}_${weekStart}`;
        const historyKey = `growth_report_history_${userId}`;

        const payload = {
            week_start: weekStart,
            sunday_summary: data.summary,
            action_plan_next_week: data.actionPlan,
            is_reviewed: true,
            reviewed_at: new Date().toISOString(),
        };

        // Save current week review
        await mainClient
            .from('settings')
            .upsert({
                key: settingsKey,
                value: JSON.stringify(payload),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        // Also add to history list
        try {
            const { data: hist } = await mainClient
                .from('settings')
                .select('value')
                .eq('key', historyKey)
                .single();

            let historyList = hist?.value ? JSON.parse(hist.value) : [];
            const existingIdx = historyList.findIndex((h: any) => h.week_start === weekStart);
            if (existingIdx >= 0) {
                historyList[existingIdx] = payload;
            } else {
                historyList.unshift(payload);
            }

            await mainClient
                .from('settings')
                .upsert({
                    key: historyKey,
                    value: JSON.stringify(historyList.slice(0, 52)), // keep up to 1 year
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
        } catch (e) {
            this.logger.error('Error saving weekly report history', e);
        }

        return payload;
    }

    /**
     * Get history of saved weekly reports
     */
    async getReportHistory(userId: string) {
        const mainClient = supabaseService.getClient();
        const historyKey = `growth_report_history_${userId}`;

        try {
            const { data } = await mainClient
                .from('settings')
                .select('value')
                .eq('key', historyKey)
                .single();

            return data?.value ? JSON.parse(data.value) : [];
        } catch (e) {
            return [];
        }
    }
}
