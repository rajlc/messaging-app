import { OrdersService } from './orders.service';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(req: any, orderData: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    getOrders(req: any, limit?: string, offset?: string, customerId?: string): Promise<any[]>;
    updateOrder(req: any, id: string, orderData: any): Promise<{
        success: boolean;
        data: any;
    }>;
    testMessage(body: {
        orderId: string;
        status: string;
    }): Promise<{
        success: boolean;
        logs: string[];
    }>;
    getInventoryProducts(search?: string): Promise<any>;
    getOrderById(req: any, id: string): Promise<any>;
    syncStatusFromInventory(body: {
        order_number: string;
        status: string;
    }, apiKey?: string): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    } | {
        error: string;
        status: number;
    }>;
    assignRider(req: any, id: string, body: {
        riderId: string;
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getRiderOrders(req: any): Promise<any[]>;
    cancelAssignment(req: any, id: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    updateDeliveryStatus(req: any, id: string, body: {
        status: string;
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getAdminDeliveryOrders(req: any): Promise<any[]>;
}
