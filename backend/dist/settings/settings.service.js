"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const XLSX = __importStar(require("xlsx"));
let SettingsService = class SettingsService {
    async getSetting(key) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();
        if (error)
            return null;
        return data?.value || null;
    }
    async setSetting(key, value) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('settings')
            .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getAllSettings() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('settings')
            .select('*');
        if (error)
            throw error;
        return data.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    }
    async getCourierSettings(provider) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('courier_api_settings')
            .select('*')
            .eq('provider', provider)
            .single();
        if (error)
            return null;
        return data;
    }
    async saveCourierSettings(payload) {
        if (!payload.provider)
            throw new Error('Provider is required');
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('courier_api_settings')
            .upsert({
            provider: payload.provider,
            base_url: payload.base_url || '',
            client_id: payload.client_id || '',
            client_secret: payload.client_secret || '',
            username: payload.username || '',
            password: payload.password || '',
            updated_at: new Date().toISOString()
        }, { onConflict: 'provider' })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return data;
    }
    async getMarketplaceProducts() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .select('*')
            .order('product_name', { ascending: true });
        if (error) {
            if (error.code === '42P01') {
                console.warn('[Supabase] marketplace_products table does not exist in Supabase.');
                return [];
            }
            throw error;
        }
        return data || [];
    }
    async deleteMarketplaceProduct(id) {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return true;
    }
    async clearMarketplaceProducts() {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            if (error.code === '42P01') {
                console.warn('[Supabase] marketplace_products table does not exist.');
                return true;
            }
            throw error;
        }
        return true;
    }
    async importMarketplaceProducts(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet);
        if (!rawRows || rawRows.length === 0) {
            throw new Error('Spreadsheet is empty or could not be parsed.');
        }
        const productsToUpsert = rawRows.map(row => {
            const productNameKey = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g, '') === 'productname' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'product' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'name');
            const priceKey = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g, '') === 'price' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'rate' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'cost' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'amount');
            if (!productNameKey) {
                throw new Error('Spreadsheet must contain a column named "Product Name" or "Product".');
            }
            if (!priceKey) {
                throw new Error('Spreadsheet must contain a column named "Price" or "Rate".');
            }
            const productName = String(row[productNameKey]).trim();
            const price = parseFloat(String(row[priceKey]).replace(/[^\d.]/g, ''));
            if (!productName) {
                throw new Error('Product Name column cannot have empty rows.');
            }
            if (isNaN(price)) {
                throw new Error(`Invalid price value for product "${productName}": ${row[priceKey]}`);
            }
            return {
                product_name: productName,
                price: price
            };
        });
        await this.clearMarketplaceProducts();
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .insert(productsToUpsert)
            .select();
        if (error)
            throw error;
        return data;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)()
], SettingsService);
//# sourceMappingURL=settings.service.js.map