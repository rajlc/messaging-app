import { OrdersService } from '../orders/orders.service';
export declare class RiderInventoryService {
    private readonly ordersService;
    private readonly logger;
    constructor(ordersService: OrdersService);
    assignStock(assignmentData: any): Promise<any>;
    getMyStock(riderId: string): Promise<any[]>;
    getAllRiderStock(): Promise<any[]>;
    updateStockStatus(id: string, status: string): Promise<any>;
    recordQuickSale(riderId: string, saleData: any, riderName?: string): Promise<{
        order: any;
        inventory: any;
    }>;
}
