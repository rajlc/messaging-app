"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
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
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)()
], SettingsService);
//# sourceMappingURL=settings.service.js.map