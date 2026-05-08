import { ConfigService } from '@nestjs/config';
import { FacebookService } from '../messaging/facebook.service';
import { TemplatesService } from '../templates/templates.service';
import { MessagingGateway } from '../socket/messaging.gateway';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';
export declare class OrdersService {
    private configService;
    private facebookService;
    private templatesService;
    private messagingGateway;
    private settingsService;
    private usersService;
    private readonly logger;
    private readonly PAGE_MAPPING;
    constructor(configService: ConfigService, facebookService: FacebookService, templatesService: TemplatesService, messagingGateway: MessagingGateway, settingsService: SettingsService, usersService: UsersService);
    private getInventoryConfig;
    getInventoryProducts(search?: string): Promise<any>;
    createExternalOrder(orderData: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        data?: undefined;
    }>;
    private saveOrderToDatabase;
    recordStatusHistory(orderId: string, status: string, changedBy: string, remarks?: string): Promise<void>;
    private getCaseVariations;
    getAllOrders(limit?: number, offset?: number, user?: any): Promise<any[]>;
    getOrdersByCustomer(customerId: string, user?: any): Promise<any[]>;
    getOrderById(id: string, user?: any): Promise<any>;
    updateOrder(id: string, orderData: any, user?: any): Promise<{
        success: boolean;
        data: any;
    }>;
    private canUserEditOrder;
    private handleInventorySync;
    private syncToInventory;
    private updateInventoryStatus;
    private handleStatusChange;
    testAutoMessage(orderId: string, targetStatus: string): Promise<{
        success: boolean;
        logs: string[];
    }>;
    updateStatusFromInventory(orderNumber: string, newStatus: string): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    assignToRider(orderId: string, riderId: string, adminName: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getRiderOrders(riderId: string): Promise<any[]>;
    cancelAssignment(orderId: string, actorName: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    updateDeliveryStatus(orderId: string, status: string, actorName: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getAdminDeliveryOrders(): Promise<any[]>;
}
