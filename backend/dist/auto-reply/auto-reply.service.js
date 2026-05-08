"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoReplyService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let AutoReplyService = class AutoReplyService {
    async createRule(data) {
        const { data: rule, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .insert(data)
            .select()
            .single();
        if (error)
            throw error;
        return rule;
    }
    async getRulesByPage(pageId) {
        const { data: rules, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .select('*')
            .eq('page_id', pageId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return rules;
    }
    async updateRule(id, data) {
        const { data: rule, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .update({
            ...data,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return rule;
    }
    async deleteRule(id) {
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return true;
    }
    async findMatchingRule(pageId, text) {
        const normalizedText = text.trim().toLowerCase();
        const { data: exactMatch } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .select('*')
            .eq('page_id', pageId)
            .eq('trigger_type', 'exact')
            .eq('is_active', true)
            .ilike('trigger_text', text.trim())
            .limit(1)
            .maybeSingle();
        if (exactMatch)
            return exactMatch;
        const { data: keywordRules } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('auto_reply_rules')
            .select('*')
            .eq('page_id', pageId)
            .eq('trigger_type', 'keyword')
            .eq('is_active', true);
        if (keywordRules && keywordRules.length > 0) {
            const match = keywordRules.find(rule => rule.trigger_text && normalizedText.includes(rule.trigger_text.trim().toLowerCase()));
            if (match)
                return match;
        }
        const phoneRegex = /\b\d{10}\b/;
        if (phoneRegex.test(text)) {
            const { data: phoneMatch } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('auto_reply_rules')
                .select('*')
                .eq('page_id', pageId)
                .eq('trigger_type', 'phone')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
            if (phoneMatch)
                return phoneMatch;
        }
        return null;
    }
};
exports.AutoReplyService = AutoReplyService;
exports.AutoReplyService = AutoReplyService = __decorate([
    (0, common_1.Injectable)()
], AutoReplyService);
//# sourceMappingURL=auto-reply.service.js.map