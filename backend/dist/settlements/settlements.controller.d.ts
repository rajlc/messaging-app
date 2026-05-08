import { SettlementsService } from './settlements.service';
export declare class SettlementsController {
    private readonly settlementsService;
    constructor(settlementsService: SettlementsService);
    getRiders(): Promise<{
        id: any;
        full_name: any;
        email: any;
    }[]>;
    createSettlement(req: any, body: {
        riderId: string;
        amount: number;
        date: string;
    }): Promise<any>;
    getAllSettlements(): Promise<any[]>;
    getPendingSummary(req: any): Promise<{
        rider_id: any;
        rider_name: any;
        pending_amount: number;
        returned_amount: number;
        settled_amount: number;
        net_pending_settlement: number;
        pending_orders_count: number;
        assigned_stock_count: number;
    }[]>;
    getMySummary(req: any): Promise<{
        rider_name: any;
        pending_amount: number;
        returned_amount: number;
        settled_amount: number;
        net_pending_settlement: number;
    }>;
    getMyDeliveryReport(req: any, startDate?: string, endDate?: string): Promise<any[]>;
    getDeliveryReport(req: any, startDate?: string, endDate?: string, riderId?: string): Promise<any[]>;
}
