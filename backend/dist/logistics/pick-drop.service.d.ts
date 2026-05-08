import { SettingsService } from '../settings/settings.service';
import { OrdersService } from '../orders/orders.service';
export declare class PickDropService {
    private settingsService;
    private ordersService;
    private readonly logger;
    constructor(settingsService: SettingsService, ordersService: OrdersService);
    getCredentials(): Promise<{
        base_url: string;
        api_key: string;
        api_secret: string;
    } | null>;
    private authHeader;
    getBranches(): Promise<any>;
    getDeliveryRate(body: {
        destination_branch: string;
        city_area: string;
        package_weight?: number;
    }): Promise<any>;
    createOrder(orderId: string): Promise<any>;
    cancelOrder(pndOrderId: string): Promise<any>;
    getOrderDetails(pndOrderId: string): Promise<any>;
    private mapPNDStatus;
    syncOrder(internalOrderId: string): Promise<any>;
    handleWebhook(payload: any, headers: any): Promise<any>;
}
