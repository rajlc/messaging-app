import { AdsManagementService } from './ads-management.service';
export declare class AdsManagementController {
    private readonly adsManagementService;
    constructor(adsManagementService: AdsManagementService);
    findAllCampaigns(): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    createCampaign(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    updateCampaign(id: string, body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    findCampaignDetails(id: string): Promise<{
        success: boolean;
        data: {
            campaign: any;
            orders: any[];
            metrics: any[];
            total_profit: any;
            ads_management: {
                total_ads_amount: number;
                ads_orders: number;
                ads_spend: number;
                past_orders: number;
                ads_amount: number;
            };
            status_breakdown: {
                shipped: {
                    qty: number;
                    amount: number;
                };
                returning: {
                    qty: number;
                    amount: number;
                };
                delivered: {
                    qty: number;
                    amount: number;
                };
                returned: {
                    qty: number;
                    amount: number;
                };
            };
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    findAllSpends(): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    createSpend(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    updateSpend(id: string, body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    findAllProductMetrics(): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    upsertProductMetric(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getDailyProfitAnalysis(): Promise<{
        success: boolean;
        data: {
            date: string;
            totalProfit: number;
            campaignBreakdown: Record<string, {
                name: string;
                profit: number;
            }>;
        }[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
}
