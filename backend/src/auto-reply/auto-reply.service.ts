import { Injectable } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

@Injectable()
export class AutoReplyService {
    async createRule(data: {
        page_id: string;
        trigger_type: 'exact' | 'phone';
        trigger_text?: string;
        reply_text: string;
        is_active?: boolean;
    }) {
        const { data: rule, error } = await supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return rule;
    }

    async getRulesByPage(pageId: string) {
        const { data: rules, error } = await supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .select('*')
            .eq('page_id', pageId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return rules;
    }

    async updateRule(id: string, data: Partial<{
        trigger_text: string;
        reply_text: string;
        is_active: boolean;
    }>) {
        const { data: rule, error } = await supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .update({
                ...data,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return rule;
    }

    async deleteRule(id: string) {
        const { error } = await supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async findMatchingRule(pageId: string, text: string) {
        const normalizedText = text.trim().toLowerCase();

        // 1. Check for active exact matches first (strict string equality)
        const { data: exactMatch } = await supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .select('*')
            .eq('page_id', pageId)
            .eq('trigger_type', 'exact')
            .eq('is_active', true)
            .ilike('trigger_text', text.trim())
            .limit(1)
            .maybeSingle();

        if (exactMatch) return exactMatch;

        // 2. Check for active keyword matches (message contains keyword)
        const { data: keywordRules } = await supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .select('*')
            .eq('page_id', pageId)
            .eq('trigger_type', 'keyword')
            .eq('is_active', true);

        if (keywordRules && keywordRules.length > 0) {
            // Find the first rule where the trigger_text is contained within the message text
            const match = keywordRules.find(rule =>
                rule.trigger_text && normalizedText.includes(rule.trigger_text.trim().toLowerCase())
            );
            if (match) return match;
        }

        // 3. Check for phone number trigger if text contains a 10-digit number
        const phoneRegex = /\b\d{10}\b/;
        if (phoneRegex.test(text)) {
            const { data: phoneMatch } = await supabaseService.getSupabaseClient()
                .from('auto_reply_rules')
                .select('*')
                .eq('page_id', pageId)
                .eq('trigger_type', 'phone')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();

            if (phoneMatch) return phoneMatch;
        }

        return null;
    }
}
