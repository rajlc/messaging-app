import * as express from 'express';
import { LogisticsService } from './logistics.service';
import { PickDropService } from './pick-drop.service';
import { NcmService } from './ncm.service';
export declare class LogisticsController {
    private readonly logisticsService;
    private readonly pickDropService;
    private readonly ncmService;
    constructor(logisticsService: LogisticsService, pickDropService: PickDropService, ncmService: NcmService);
    getCities(): Promise<any>;
    getZones(cityId: string): Promise<any>;
    getAreas(zoneId: string): Promise<any>;
    getAllAreas(): Promise<any[]>;
    calculatePrice(body: any): Promise<any>;
    shipOrder(orderId: string): Promise<{
        success: boolean;
        data: any;
    }>;
    getPathaoInfo(orderId: string): Promise<any>;
    handleWebhook(payload: any, headers: any, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
    getPickDropBranches(): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getPickDropDeliveryRate(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    shipPickDropOrder(orderId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    cancelPickDropOrder(pndOrderId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getPickDropOrderDetails(orderId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    syncPickDropOrder(orderId: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    verifyPickDropWebhook(): Promise<{
        message: string;
        expectedPath: string;
        method: string;
    }>;
    handlePickDropWebhook(payload: any, headers: any, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
    getNcmBranches(): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getNcmShippingRate(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    handleNcmShip(body: any): Promise<{
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
    handleNcmWebhook(payload: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    registerNcmWebhook(url: string): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    syncNcmStatus(body: {
        orderId: string;
    }): Promise<{
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
    } | {
        success: boolean;
        error: any;
    }>;
    getCodSettlements(logisticId: string): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    addCodSettlement(body: {
        logisticId: string;
        amount: number;
        date: string;
        remarks: string;
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    updateCodSettlement(id: string, body: {
        amount: number;
        date: string;
        remarks: string;
    }): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getOrderChangelogs(logisticId: string): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
}
