export declare class SettlementsService {
    private readonly logger;
    constructor();
    getRiders(): Promise<{
        id: any;
        full_name: any;
        email: any;
    }[]>;
    createSettlement(riderId: string, amount: number, date: string, actorName: string): Promise<any>;
    getAllSettlements(): Promise<any[]>;
    getPendingSummary(): Promise<{
        rider_id: any;
        rider_name: any;
        pending_amount: number;
        returned_amount: number;
        settled_amount: number;
        net_pending_settlement: number;
        pending_orders_count: number;
        assigned_stock_count: number;
    }[]>;
    getMySummary(riderId: string): Promise<{
        rider_name: any;
        pending_amount: number;
        returned_amount: number;
        settled_amount: number;
        net_pending_settlement: number;
    }>;
    getDeliveryReport(startDate?: string, endDate?: string, riderId?: string): Promise<any[]>;
}
