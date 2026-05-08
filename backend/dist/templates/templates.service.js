"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TemplatesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let TemplatesService = TemplatesService_1 = class TemplatesService {
    logger = new common_1.Logger(TemplatesService_1.name);
    async getAllTemplates() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('message_templates')
            .select('*')
            .order('status', { ascending: true });
        if (error) {
            this.logger.error(`Failed to fetch templates: ${error.message}`);
            throw error;
        }
        return data;
    }
    async upsertTemplate(status, template, is_active = true) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
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
    async getAllQuickReplyTemplates() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error(`Failed to fetch quick reply templates: ${error.message}`);
            throw error;
        }
        return data || [];
    }
    async getQuickReplyTemplateById(id) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
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
    async createQuickReplyTemplate(dto) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
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
    async updateQuickReplyTemplate(id, dto) {
        const updateData = {
            updated_at: new Date().toISOString()
        };
        if (dto.title !== undefined)
            updateData.title = dto.title;
        if (dto.message !== undefined)
            updateData.message = dto.message;
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
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
    async deleteQuickReplyTemplate(id) {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('quick_reply_templates')
            .delete()
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to delete quick reply template ${id}: ${error.message}`);
            throw error;
        }
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = TemplatesService_1 = __decorate([
    (0, common_1.Injectable)()
], TemplatesService);
//# sourceMappingURL=templates.service.js.map