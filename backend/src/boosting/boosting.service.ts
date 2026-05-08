import { Injectable } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

@Injectable()
export class BoostingService {
    async findAll() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('boosting_costs')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    }

    async create(data: any) {
        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('boosting_costs')
            .insert({
                date: data.date,
                platform: data.platform,
                page_name: data.page_name,
                product_names: data.product_names || [],
                cost: data.cost,
            })
            .select()
            .single();

        if (error) throw error;
        return result;
    }
}
