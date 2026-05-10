import { OrdersService } from '../orders/orders.service';
export declare class AdsManagementService {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findAllCampaigns(): Promise<any[]>;
    createCampaign(data: {
        name: string;
        product_names: string[];
        status?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<any>;
    findCampaignDetails(id: string): Promise<{
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
    }>;
    updateCampaign(id: string, data: {
        name?: string;
        product_names?: string[];
        status?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<any>;
    deleteCampaign(id: string): Promise<{
        success: boolean;
    }>;
    findAllSpends(): Promise<any[]>;
    createSpend(data: {
        campaign_id: string;
        date: string;
        amount: number;
        remarks: string;
    }): Promise<any>;
    updateSpend(id: string, data: {
        campaign_id?: string;
        date?: string;
        amount?: number;
        remarks?: string;
    }): Promise<any>;
    findAllProductMetrics(): Promise<any[]>;
    upsertProductMetric(product_name: string, est_purchase_cost: number): Promise<any>;
    getDailyProfitAnalysis(): Promise<{
        date: string;
        totalProfit: number;
        campaignBreakdown: Record<string, {
            name: string;
            profit: number;
        }>;
    }[]>;
}
