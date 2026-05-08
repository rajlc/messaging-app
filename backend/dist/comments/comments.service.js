"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CommentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let CommentsService = CommentsService_1 = class CommentsService {
    logger = new common_1.Logger(CommentsService_1.name);
    async getAllComments() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error(`Failed to fetch comments: ${error.message}`);
            throw error;
        }
        return data || [];
    }
    async getCommentById(id) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            this.logger.error(`Failed to fetch comment ${id}: ${error.message}`);
            return null;
        }
        return data;
    }
    async getCommentsByCustomer(customerId) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error(`Failed to fetch comments for customer ${customerId}: ${error.message}`);
            throw error;
        }
        return data || [];
    }
    async createComment(dto) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .insert({
            comment_id: dto.comment_id,
            post_id: dto.post_id,
            post_message: dto.post_message,
            customer_id: dto.customer_id,
            customer_name: dto.customer_name,
            comment_text: dto.comment_text,
            platform: dto.platform,
            page_id: dto.page_id,
            customer_profile_pic: dto.customer_profile_pic,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error) {
            this.logger.error(`Failed to create comment: ${error.message}`);
            throw error;
        }
        return data;
    }
    async markAsReplied(id) {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .update({
            is_replied: true,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to mark comment ${id} as replied: ${error.message}`);
            throw error;
        }
    }
    async markAsHidden(id) {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .update({
            is_hidden: true,
            updated_at: new Date().toISOString()
        })
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to mark comment ${id} as hidden: ${error.message}`);
            throw error;
        }
    }
    async deleteComment(id) {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('post_comments')
            .delete()
            .eq('id', id);
        if (error) {
            this.logger.error(`Failed to delete comment ${id}: ${error.message}`);
            throw error;
        }
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = CommentsService_1 = __decorate([
    (0, common_1.Injectable)()
], CommentsService);
//# sourceMappingURL=comments.service.js.map