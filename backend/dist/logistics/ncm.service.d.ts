import { SettingsService } from '../settings/settings.service';
import { OrdersService } from '../orders/orders.service';
export declare class NcmService {
    private readonly settingsService;
    private readonly ordersService;
    private readonly logger;
    private readonly provider;
    private branchCache;
    private lastCacheUpdate;
    private readonly CACHE_TTL;
    constructor(settingsService: SettingsService, ordersService: OrdersService);
    private getCredentials;
    private getHeaders;
    getBranches(): Promise<any[]>;
    calculateShippingRate(pickupBranch: string, destinationBranch: string, type?: string): Promise<any>;
    createOrder(orderData: any): Promise<{
        success: boolean;
        orderId: any;
        message: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        orderId?: undefined;
        message?: undefined;
    }>;
    getOrderStatus(orderId: string): Promise<any>;
    handleWebhook(payload: any): Promise<void>;
    private mapStatus;
    syncOrderStatus(orderId: string): Promise<{
        success: boolean;
        message: string;
        newStatus?: undefined;
        currentStatus?: undefined;
    } | {
        success: boolean;
        newStatus: string;
        message: string;
        currentStatus?: undefined;
    } | {
        success: boolean;
        message: string;
        currentStatus: string;
        newStatus?: undefined;
    }>;
    registerWebhook(webhookUrl: string): Promise<any>;
}
