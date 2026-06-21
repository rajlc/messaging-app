export declare class SettingsService {
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<any>;
    getAllSettings(): Promise<any>;
    getCourierSettings(provider: string): Promise<any>;
    saveCourierSettings(payload: any): Promise<any>;
    getMarketplaceProducts(): Promise<any[]>;
    deleteMarketplaceProduct(id: string): Promise<boolean>;
    clearMarketplaceProducts(): Promise<boolean>;
    importMarketplaceProducts(buffer: Buffer): Promise<any[]>;
}
