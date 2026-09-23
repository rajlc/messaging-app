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

export const DEFAULT_STATUS_TEMPLATES = [
    {
        status: 'New Order',
        template: 'Dear {{customer_name}}, thank you for your order #{{order_number}}! Total amount is Rs. {{total_amount}}. We are reviewing and processing your order.',
        is_active: false
    },
    {
        status: 'Confirmed Order',
        template: 'Dear {{customer_name}}, your order #{{order_number}} (Rs. {{total_amount}}) has been confirmed! We are preparing it for packaging and dispatch.',
        is_active: false
    },
    {
        status: 'Packed',
        template: 'Dear {{customer_name}}, your order #{{order_number}} has been packed and is ready to be handed over to the courier partner.',
        is_active: false
    },
    {
        status: 'Ready to Ship',
        template: 'Dear {{customer_name}}, your parcel for order #{{order_number}} is packed and awaiting courier pickup.',
        is_active: false
    },
    {
        status: 'Shipped',
        template: 'Dear {{customer_name}}, great news! Order #{{order_number}} has been dispatched and is on its way to your city/area.',
        is_active: false
    },
    {
        status: 'Arrived at Branch',
        template: 'Dear {{customer_name}}, your package for order #{{order_number}} has safely arrived at your local branch and will be out for delivery soon.',
        is_active: false
    },
    {
        status: 'Delivery Process',
        template: 'Dear {{customer_name}}, order #{{order_number}} is out for delivery today! Please keep your phone reachable so the rider can contact you.',
        is_active: false
    },
    {
        status: 'Delivered',
        template: 'Dear {{customer_name}}, order #{{order_number}} has been successfully delivered! Thank you for shopping with us. Please let us know if you need any assistance.',
        is_active: false
    },
    {
        status: 'Delivery Failed',
        template: 'Dear {{customer_name}}, our courier attempted to deliver your order #{{order_number}} but could not reach you. Please message us when you are available for re-delivery.',
        is_active: false
    },
    {
        status: 'Hold',
        template: 'Dear {{customer_name}}, your order #{{order_number}} has been placed on hold at the courier branch. Please let us know your preferred delivery date.',
        is_active: false
    },
    {
        status: 'Cancel',
        template: 'Dear {{customer_name}}, your order #{{order_number}} has been cancelled. If this was a mistake or you have questions, please let us know.',
        is_active: false
    },
    {
        status: 'Cancelled',
        template: 'Dear {{customer_name}}, your order #{{order_number}} has been cancelled. If this was a mistake or you have questions, please let us know.',
        is_active: false
    },
    {
        status: 'Follow up again',
        template: 'Dear {{customer_name}}, following up on your order #{{order_number}}. Please reply if you have any questions or would like to confirm your delivery.',
        is_active: false
    },
    {
        status: 'Return Process',
        template: 'Dear {{customer_name}}, your order #{{order_number}} is being processed for return. If you still wish to receive your package, please reply to us immediately so we can stop the return.',
        is_active: false
    },
    {
        status: 'Returned',
        template: 'Dear {{customer_name}}, order #{{order_number}} has been returned to our warehouse.',
        is_active: false
    },
    {
        status: 'Returned Delivered',
        template: 'Dear {{customer_name}}, order #{{order_number}} has been returned and safely received at our warehouse.',
        is_active: false
    }
];

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

        const dbTemplates = data || [];
        const templateMap = new Map<string, any>();

        // Seed with default templates
        DEFAULT_STATUS_TEMPLATES.forEach(dt => {
            templateMap.set(dt.status, {
                id: `default-${dt.status.toLowerCase().replace(/\s+/g, '-')}`,
                status: dt.status,
                template: dt.template,
                is_active: dt.is_active,
                is_default: true
            });
        });

        // Overlay with database templates
        dbTemplates.forEach((t: any) => {
            templateMap.set(t.status, {
                ...t,
                is_default: false
            });
        });

        return Array.from(templateMap.values());
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

