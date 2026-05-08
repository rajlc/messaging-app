import { Injectable, Logger } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

export interface Template {
    id: string;
    status: string;
    template: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface QuickReplyTemplate {
    id: string;
    title: string;
    message: string;
    created_at: string;
    updated_at: string;
}

export interface CreateQuickReplyDto {
    title: string;
    message: string;
}

export interface UpdateQuickReplyDto {
    title?: string;
    message?: string;
}

@Injectable()
export class TemplatesService {
    private readonly logger = new Logger(TemplatesService.name);

    // Message templates (existing functionality for order status templates)
    async getAllTemplates() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('message_templates')
            .select('*')
            .order('status', { ascending: true });

        if (error) {
            this.logger.error(`Failed to fetch templates: ${error.message}`);
            throw error;
        }

        return data;
    }

    async upsertTemplate(status: string, template: string, is_active: boolean = true) {
        // Upsert based on status (unique key)
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('message_templates')
            .upsert({ status, template, is_active, updated_at: new Date() }, { onConflict: 'status' })
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to upsert template for ${status}: ${error.message}`);
            throw error;
        }

        return data;
    }

    // Quick reply templates (new functionality)
    async getAllQuickReplyTemplates(): Promise<QuickReplyTemplate[]> {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Failed to fetch quick reply templates: ${error.message}`);
            throw error;
        }

        return data || [];
    }

    async getQuickReplyTemplateById(id: string): Promise<QuickReplyTemplate | null> {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            this.logger.error(`Failed to fetch quick reply template ${id}: ${error.message}`);
            return null;
        }

        return data;
    }

    async createQuickReplyTemplate(dto: CreateQuickReplyDto): Promise<QuickReplyTemplate> {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .insert({
                title: dto.title,
                message: dto.message,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to create quick reply template: ${error.message}`);
            throw error;
        }

        return data;
    }

    async updateQuickReplyTemplate(id: string, dto: UpdateQuickReplyDto): Promise<QuickReplyTemplate> {
        const updateData: any = {
            updated_at: new Date().toISOString()
        };

        if (dto.title !== undefined) updateData.title = dto.title;
        if (dto.message !== undefined) updateData.message = dto.message;

        const { data, error } = await supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            this.logger.error(`Failed to update quick reply template ${id}: ${error.message}`);
            throw error;
        }

        return data;
    }

    async deleteQuickReplyTemplate(id: string): Promise<void> {
        const { error } = await supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .delete()
            .eq('id', id);

        if (error) {
            this.logger.error(`Failed to delete quick reply template ${id}: ${error.message}`);
            throw error;
        }
    }
}

