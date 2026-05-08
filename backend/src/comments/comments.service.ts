import { Injectable, Logger } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

export interface PostComment {
    id: string;
    comment_id: string;
    post_id: string;
    post_message?: string;
    customer_id: string;
    customer_name: string;
    comment_text: string;
    platform: string;
    page_id?: string;
    is_hidden: boolean;
    is_replied: boolean;
    customer_profile_pic?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateCommentDto {
    comment_id: string;
    post_id: string;
    post_message?: string;
    customer_id: string;
    customer_name: string;
    comment_text: string;
    platform: string;
    page_id?: string;
    customer_profile_pic?: string;
}

@Injectable()
export class CommentsService {
    private readonly logger = new Logger(CommentsService.name);

    async getAllComments(): Promise<PostComment[]> {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('post_comments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Failed to fetch comments: ${error.message}`);
            throw error;
        }

        return data || [];
    }

    async getCommentById(id: string): Promise<PostComment | null> {
        const { data, error } = await supabaseService.getSupabaseClient()
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

    async getCommentsByCustomer(customerId: string): Promise<PostComment[]> {
        const { data, error } = await supabaseService.getSupabaseClient()
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

    async createComment(dto: CreateCommentDto): Promise<PostComment> {
        const { data, error } = await supabaseService.getSupabaseClient()
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

    async markAsReplied(id: string): Promise<void> {
        const { error } = await supabaseService.getSupabaseClient()
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

    async markAsHidden(id: string): Promise<void> {
        const { error } = await supabaseService.getSupabaseClient()
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

    async deleteComment(id: string): Promise<void> {
        const { error } = await supabaseService.getSupabaseClient()
            .from('post_comments')
            .delete()
            .eq('id', id);

        if (error) {
            this.logger.error(`Failed to delete comment ${id}: ${error.message}`);
            throw error;
        }
    }
}
