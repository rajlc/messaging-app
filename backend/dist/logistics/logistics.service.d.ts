import { OnModuleInit } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { OrdersService } from '../orders/orders.service';
export declare class LogisticsService implements OnModuleInit {
    private settingsService;
    private ordersService;
    private readonly logger;
    private areaCache;
    private tokenCache;
    private readonly CACHE_TTL;
    private isFetchingAreas;
    constructor(settingsService: SettingsService, ordersService: OrdersService);
    onModuleInit(): Promise<void>;
    private getCredentials;
    private getAccessToken;
    getCities(): Promise<any>;
    getZones(cityId: number): Promise<any>;
    getAreas(zoneId: number): Promise<any>;
    private retryWithBackoff;
    getAllAreas(): Promise<any[]>;
    calculatePrice(payload: any): Promise<any>;
    createOrder(orderId: string): Promise<{
        success: boolean;
        data: any;
    }>;
    getPathaoOrderInfo(orderId: string): Promise<any>;
    handleWebhook(payload: any, headers: any): Promise<{
        message: string;
        success?: undefined;
    } | {
        success: boolean;
        message?: undefined;
    }>;
    getSettlements(logisticId: string): Promise<any[]>;
    updateSettlement(id: string, payload: {
        amount: number;
        date: string;
        remarks: string;
    }): Promise<any>;
    addSettlement(payload: {
        logisticId: string;
        amount: number;
        date: string;
        remarks: string;
    }): Promise<any>;
    getOrderChangelogs(logisticId: string): Promise<any[]>;
}
