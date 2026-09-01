import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import * as xlsx from 'xlsx';
import { Response } from 'express';
import {
    MarketplaceProfileDto,
    MarketplaceCategoryDto,
    MarketplaceLocationDto,
    MarketplaceProductItemDto,
    BatchStatusUpdateDto,
    ExportFilterDto
} from './marketplace.dto';

const DEFAULT_PROFILES: MarketplaceProfileDto[] = [
    { id: 'default', name: 'Default', last_description: '' }
];

const DEFAULT_CATEGORIES: MarketplaceCategoryDto[] = [
    { id: 'cat-1', name: 'Electronics' },
    { id: 'cat-2', name: 'Home & Kitchen' },
    { id: 'cat-3', name: 'Furniture' },
    { id: 'cat-4', name: 'Clothing & Shoes' },
    { id: 'cat-5', name: 'Tools' },
    { id: 'cat-6', name: 'Beauty & Personal Care' },
    { id: 'cat-7', name: 'Toys & Games' },
    { id: 'cat-8', name: 'Sports & Outdoors' }
];

const DEFAULT_LOCATIONS: MarketplaceLocationDto[] = [
    { id: 'loc-1', name: 'Kathmandu' },
    { id: 'loc-2', name: 'Lalitpur' },
    { id: 'loc-3', name: 'Bhaktapur' },
    { id: 'loc-4', name: 'Pokhara' },
    { id: 'loc-5', name: 'Biratnagar' }
];

@Injectable()
export class MarketplaceService {
    private readonly logger = new Logger(MarketplaceService.name);

    private get supabase() {
        return supabaseService.getClient();
    }

    /* ─── Generic KV Settings Helper ─── */
    private async getSettingJson<T>(key: string, defaultValue: T): Promise<T> {
        try {
            const { data, error } = await this.supabase
                .from('settings')
                .select('value')
                .eq('key', key)
                .maybeSingle();

            if (error || !data || !data.value) {
                return defaultValue;
            }
            return JSON.parse(data.value) as T;
        } catch {
            return defaultValue;
        }
    }

    private async setSettingJson(key: string, value: any): Promise<void> {
        const jsonStr = JSON.stringify(value);
        const { error } = await this.supabase
            .from('settings')
            .upsert({
                key,
                value: jsonStr,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (error) {
            this.logger.error(`Failed to save setting ${key}: ${error.message}`);
            throw new Error(`Failed to save settings: ${error.message}`);
        }
    }

    /* ─── Settings API ─── */
    async getSettings() {
        const [profiles, categories, locations] = await Promise.all([
            this.getSettingJson<MarketplaceProfileDto[]>('MARKETPLACE_PROFILES', DEFAULT_PROFILES),
            this.getSettingJson<MarketplaceCategoryDto[]>('MARKETPLACE_CATEGORIES', DEFAULT_CATEGORIES),
            this.getSettingJson<MarketplaceLocationDto[]>('MARKETPLACE_LOCATIONS', DEFAULT_LOCATIONS),
        ]);

        return {
            profiles: profiles?.length ? profiles : DEFAULT_PROFILES,
            categories: categories?.length ? categories : DEFAULT_CATEGORIES,
            locations: locations?.length ? locations : DEFAULT_LOCATIONS,
        };
    }

    async saveProfiles(profiles: MarketplaceProfileDto[]) {
        if (!Array.isArray(profiles) || profiles.length === 0) {
            throw new BadRequestException('At least one profile is required');
        }
        await this.setSettingJson('MARKETPLACE_PROFILES', profiles);
        return { success: true, profiles };
    }

    async saveCategories(categories: MarketplaceCategoryDto[]) {
        if (!Array.isArray(categories) || categories.length === 0) {
            throw new BadRequestException('At least one category is required');
        }
        await this.setSettingJson('MARKETPLACE_CATEGORIES', categories);
        return { success: true, categories };
    }

    async saveLocations(locations: MarketplaceLocationDto[]) {
        if (!Array.isArray(locations) || locations.length === 0) {
            throw new BadRequestException('At least one location is required');
        }
        await this.setSettingJson('MARKETPLACE_LOCATIONS', locations);
        return { success: true, locations };
    }

    /* ─── Products API ─── */
    async getProducts(): Promise<MarketplaceProductItemDto[]> {
        return await this.getSettingJson<MarketplaceProductItemDto[]>('MARKETPLACE_LISTING_PRODUCTS', []);
    }

    async saveProduct(dto: MarketplaceProductItemDto): Promise<MarketplaceProductItemDto> {
        const settings = await this.getSettings();
        const profiles = settings.profiles;

        // Ensure images has at least 2
        const cleanImages = (dto.images || []).filter(img => typeof img === 'string' && img.trim() !== '');
        if (cleanImages.length < 2) {
            throw new BadRequestException('A minimum of 2 image URLs is required (Image 1 and Image 2)');
        }

        const id = dto.id || `mp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const baseDescription = (dto.description || '').trim();

        // Populate profile_data with final_description (base description + profile's last_description)
        const profileData: Record<string, any> = {};
        const statusMap: Record<string, 'pending' | 'completed'> = dto.status_map || {};

        for (const p of profiles) {
            const pKey = p.name;
            const existingPData = dto.profile_data?.[pKey] || dto.profile_data?.[p.id] || {
                title: Object.values(dto.profile_data || {})[0]?.title || '',
                price: Object.values(dto.profile_data || {})[0]?.price || 0,
            };

            const lastDesc = (p.last_description || '').trim();
            const finalDesc = [baseDescription, lastDesc].filter(Boolean).join('\n\n');

            profileData[pKey] = {
                title: existingPData.title || '',
                price: Number(existingPData.price) || 0,
                final_description: finalDesc,
            };

            if (!statusMap[pKey]) {
                statusMap[pKey] = 'pending';
            }
        }

        const newProduct: MarketplaceProductItemDto = {
            id,
            description: baseDescription,
            category: dto.category || settings.categories[0]?.name || 'General',
            condition: 'New',
            location: dto.location || 'Kathmandu',
            images: cleanImages,
            profile_data: profileData,
            status_map: statusMap,
        };

        const existingProducts = await this.getProducts();
        const existingIndex = existingProducts.findIndex(p => p.id === id);

        if (existingIndex >= 0) {
            existingProducts[existingIndex] = newProduct;
        } else {
            existingProducts.unshift(newProduct);
        }

        await this.setSettingJson('MARKETPLACE_LISTING_PRODUCTS', existingProducts);
        return newProduct;
    }

    async updateProduct(id: string, dto: MarketplaceProductItemDto): Promise<MarketplaceProductItemDto> {
        dto.id = id;
        return await this.saveProduct(dto);
    }

    async deleteProduct(id: string): Promise<{ success: boolean }> {
        const existingProducts = await this.getProducts();
        const filtered = existingProducts.filter(p => p.id !== id);
        if (filtered.length === existingProducts.length) {
            throw new NotFoundException(`Product with ID ${id} not found`);
        }
        await this.setSettingJson('MARKETPLACE_LISTING_PRODUCTS', filtered);
        return { success: true };
    }

    /* ─── Batch Status Update (Marketplace Add) ─── */
    async batchUpdateStatus(dto: BatchStatusUpdateDto): Promise<{ success: boolean; updatedCount: number }> {
        const { productIds, profile, status } = dto;
        if (!productIds || productIds.length === 0) {
            throw new BadRequestException('No products selected');
        }

        const settings = await this.getSettings();
        const profiles = settings.profiles;
        const targetProfiles = profile === 'all' ? profiles.map(p => p.name) : [profile];

        const existingProducts = await this.getProducts();
        const idSet = new Set(productIds);
        let updatedCount = 0;

        for (const p of existingProducts) {
            if (idSet.has(p.id!)) {
                p.status_map = p.status_map || {};
                for (const tp of targetProfiles) {
                    p.status_map[tp] = status;
                }
                updatedCount++;
            }
        }

        await this.setSettingJson('MARKETPLACE_LISTING_PRODUCTS', existingProducts);
        return { success: true, updatedCount };
    }

    /* ─── Excel Template Generator (3 Sheets) ─── */
    async generateTemplate(res: Response) {
        const settings = await this.getSettings();
        const wb = xlsx.utils.book_new();

        // 1. Sheet 1: Listings Template
        const headers: string[] = [];
        for (const prof of settings.profiles) {
            headers.push(`Product Name (${prof.name})`);
            headers.push(`Price (${prof.name})`);
        }
        headers.push('Category', 'Condition', 'Location', 'Description', 'Image 1', 'Image 2', 'Image 3', 'Image 4');

        // Sample row
        const sampleRow: Record<string, any> = {};
        for (const prof of settings.profiles) {
            sampleRow[`Product Name (${prof.name})`] = `Sample Item - ${prof.name}`;
            sampleRow[`Price (${prof.name})`] = 1200;
        }
        sampleRow['Category'] = settings.categories[0]?.name || 'Electronics';
        sampleRow['Condition'] = 'New';
        sampleRow['Location'] = settings.locations[0]?.name || 'Kathmandu';
        sampleRow['Description'] = 'High quality brand new product with warranty. Fast delivery all over Nepal.';
        sampleRow['Image 1'] = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e';
        sampleRow['Image 2'] = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';
        sampleRow['Image 3'] = '';
        sampleRow['Image 4'] = '';

        const wsListings = xlsx.utils.json_to_sheet([sampleRow], { header: headers });
        xlsx.utils.book_append_sheet(wb, wsListings, 'Listings');

        // 2. Sheet 2: Categories
        const catRows = settings.categories.map(c => ({ 'Category Name': c.name }));
        const wsCats = xlsx.utils.json_to_sheet(catRows);
        xlsx.utils.book_append_sheet(wb, wsCats, 'Categories');

        // 3. Sheet 3: Locations
        const locRows = settings.locations.map(l => ({ 'Location Name': l.name }));
        const wsLocs = xlsx.utils.json_to_sheet(locRows);
        xlsx.utils.book_append_sheet(wb, wsLocs, 'Locations');

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Marketplace_Listing_Template.xlsx"');
        return res.send(buffer);
    }

    /* ─── Export Products ─── */
    async exportProducts(dto: ExportFilterDto, res: Response) {
        const settings = await this.getSettings();
        const products = await this.getProducts();

        const targetProfile = dto.profile || 'all';
        const targetStatus = dto.status || 'all';

        const exportRows: Record<string, any>[] = [];

        // For each product, filter according to requested profile & status
        for (const p of products) {
            const profilesToProcess = targetProfile === 'all'
                ? settings.profiles
                : settings.profiles.filter(prof => prof.name === targetProfile || prof.id === targetProfile);

            for (const prof of profilesToProcess) {
                const currentStatus = p.status_map?.[prof.name] || 'pending';
                if (targetStatus !== 'all' && currentStatus !== targetStatus) {
                    continue;
                }

                const pData = p.profile_data?.[prof.name] || {};
                const title = pData.title || p.description?.slice(0, 30) || 'Untitled Item';
                const price = pData.price || 0;
                const desc = pData.final_description || p.description || '';

                exportRows.push({
                    'Marketplace Profile': prof.name,
                    'Title': title,
                    'Price': price,
                    'Category': p.category,
                    'Condition': p.condition || 'New',
                    'Location': p.location || 'Kathmandu',
                    'Description': desc,
                    'Status': currentStatus === 'completed' ? 'Completed' : 'Pending',
                    'Image 1': p.images[0] || '',
                    'Image 2': p.images[1] || '',
                    'Image 3': p.images[2] || '',
                    'Image 4': p.images[3] || '',
                });
            }
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(exportRows);
        xlsx.utils.book_append_sheet(wb, ws, 'Marketplace Export');

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const filename = `Marketplace_Export_${targetProfile}_${targetStatus}_${Date.now()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(buffer);
    }

    /* ─── Import Products from Excel ─── */
    async importProducts(fileBuffer: Buffer): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
        const wb = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0]; // Read Sheet 1 (Listings)
        if (!sheetName) {
            throw new BadRequestException('Empty Excel workbook');
        }

        const sheet = wb.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet);

        if (!rawRows || rawRows.length === 0) {
            throw new BadRequestException('No rows found in Sheet 1');
        }

        const settings = await this.getSettings();
        const profiles = settings.profiles;

        const importedProducts: MarketplaceProductItemDto[] = [];
        const errors: string[] = [];

        const findCol = (row: Record<string, any>, candidateKeys: string[]) => {
            for (const key of Object.keys(row)) {
                const normKey = key.toLowerCase().trim();
                for (const cand of candidateKeys) {
                    if (normKey === cand.toLowerCase().trim()) return row[key];
                }
            }
            return '';
        };

        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            const rowNum = i + 2; // header is row 1

            // Category & Location & Condition
            const category = findCol(row, ['category', 'category name', 'cat']) || settings.categories[0]?.name || 'General';
            const condition = findCol(row, ['condition', 'item condition']) || 'New';
            const location = findCol(row, ['location', 'city', 'area']) || 'Kathmandu';
            const baseDescription = findCol(row, ['description', 'desc', 'details']) || '';

            // Extract Images (minimum 2)
            const images: string[] = [];
            for (let imgIdx = 1; imgIdx <= 10; imgIdx++) {
                const val = findCol(row, [`image ${imgIdx}`, `image${imgIdx}`, `img ${imgIdx}`, `img${imgIdx}`, `photo ${imgIdx}`, `photo${imgIdx}`]);
                if (val && typeof val === 'string' && val.trim() !== '') {
                    images.push(val.trim());
                }
            }

            if (images.length < 2) {
                errors.push(`Row ${rowNum}: At least 2 image URLs are required (Image 1 and Image 2).`);
                continue;
            }

            // Extract Profile Titles & Prices
            const profileData: Record<string, any> = {};
            const statusMap: Record<string, 'pending' | 'completed'> = {};
            let hasValidTitle = false;

            for (const prof of profiles) {
                const pTitle = findCol(row, [
                    `product name (${prof.name})`,
                    `product name ${prof.name}`,
                    `title (${prof.name})`,
                    `title ${prof.name}`,
                    'title',
                    'product name',
                    'name'
                ]);

                const pPrice = findCol(row, [
                    `price (${prof.name})`,
                    `price ${prof.name}`,
                    `rate (${prof.name})`,
                    `rate ${prof.name}`,
                    'price',
                    'rate'
                ]);

                if (pTitle && String(pTitle).trim() !== '') {
                    hasValidTitle = true;
                }

                const lastDesc = (prof.last_description || '').trim();
                const finalDesc = [baseDescription, lastDesc].filter(Boolean).join('\n\n');

                profileData[prof.name] = {
                    title: String(pTitle || '').trim(),
                    price: Number(pPrice) || 0,
                    final_description: finalDesc,
                };
                statusMap[prof.name] = 'pending';
            }

            if (!hasValidTitle) {
                errors.push(`Row ${rowNum}: Product Name is missing.`);
                continue;
            }

            const id = `mp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
            importedProducts.push({
                id,
                description: baseDescription,
                category: String(category).trim(),
                condition: String(condition).trim() || 'New',
                location: String(location).trim() || 'Kathmandu',
                images,
                profile_data: profileData,
                status_map: statusMap,
            });
        }

        if (importedProducts.length > 0) {
            const existingProducts = await this.getProducts();
            const combined = [...importedProducts, ...existingProducts];
            await this.setSettingJson('MARKETPLACE_LISTING_PRODUCTS', combined);
        }

        return {
            success: importedProducts.length > 0,
            importedCount: importedProducts.length,
            errors,
        };
    }
}
