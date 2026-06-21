import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getSettings(): Promise<any>;
    updateSettings(body: {
        [key: string]: string;
    }): Promise<{
        success: boolean;
        results: {};
    }>;
    getCourierSettings(): Promise<any>;
    saveCourierSettings(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getPickDropSettings(): Promise<any>;
    savePickDropSettings(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getNcmSettings(): Promise<any>;
    saveNcmSettings(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    getMarketplaceProducts(): Promise<any[]>;
    deleteMarketplaceProduct(id: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    clearMarketplaceProducts(): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    uploadMarketplaceProducts(file: any): Promise<{
        success: boolean;
        count: number;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        count?: undefined;
    }>;
}
