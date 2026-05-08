export declare class AdsManagementService {
    findAllCampaigns(): Promise<any[]>;
    createCampaign(data: {
        name: string;
        product_names: string[];
        status?: string;
    }): Promise<any>;
    updateCampaign(id: string, data: {
        name?: string;
        product_names?: string[];
        status?: string;
    }): Promise<any>;
    findCampaignDetails(id: string): Promise<{
        campaign: any;
        metrics: any[];
        orders: any[];
        total_profit: number;
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
}
