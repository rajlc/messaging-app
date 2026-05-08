import { Injectable } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

@Injectable()
export class SettingsService {

    async getSetting(key: string): Promise<string | null> {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) return null;
        return data?.value || null;
    }

    async setSetting(key: string, value: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('settings')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getAllSettings() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('settings')
            .select('*');

        if (error) throw error;
        return data.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
    }

    // --- Courier Settings ---

    async getCourierSettings(provider: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('courier_api_settings')
            .select('*')
            .eq('provider', provider)
            .single();

        if (error) return null;
        return data;
    }

    async saveCourierSettings(payload: any) {
        // Ensure provider exists
        if (!payload.provider) throw new Error('Provider is required');

        const { data, error } = await supabaseService.getSupabaseClient()
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
}
