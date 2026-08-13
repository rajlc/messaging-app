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
    getPostConfigsByPageId(pageId: string): Promise<any[]>;
    createPostConfig(data: {
        pageId: string;
        postId: string;
        label?: string;
        aiInstructions: string;
    }): Promise<any>;
    updatePostConfig(id: string, data: {
        label?: string;
        postId?: string;
        aiInstructions?: string;
        isActive?: boolean;
    }): Promise<any>;
    deletePostConfig(id: string): Promise<boolean>;
}
