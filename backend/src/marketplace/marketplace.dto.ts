export interface MarketplaceProfileDto {
    id: string;
    name: string;
    last_description?: string;
}

export interface MarketplaceCategoryDto {
    id: string;
    name: string;
}

export interface MarketplaceLocationDto {
    id: string;
    name: string;
}

export interface MarketplaceProductItemDto {
    id?: string;
    description?: string;
    category: string;
    condition?: string;
    location: string;
    images: string[];
    profile_data: Record<string, {
        title: string;
        price: number | string;
        final_description?: string;
    }>;
    status_map?: Record<string, 'pending' | 'completed'>;
}

export interface BatchStatusUpdateDto {
    productIds: string[];
    profile: string; // 'all' or specific profile name / id
    status: 'completed' | 'pending';
}

export interface ExportFilterDto {
    profile?: string; // 'all' or specific profile name
    status?: 'all' | 'completed' | 'pending';
}
