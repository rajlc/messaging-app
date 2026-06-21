"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const passport_1 = require("@nestjs/passport");
const messaging_gateway_1 = require("../socket/messaging.gateway");
let ConversationsController = class ConversationsController {
    messagingGateway;
    constructor(messagingGateway) {
        this.messagingGateway = messagingGateway;
    }
    async getConversations(req, limit, offset, customerId) {
        const limitNum = limit ? parseInt(limit) : 1000;
        const offsetNum = offset ? parseInt(offset) : 0;
        console.log('GET /api/conversations - User:', req.user ? `${req.user.username} (${req.user.role})` : 'No User');
        const conversations = await supabase_service_1.supabaseService.getConversations(limitNum, offsetNum, customerId, req.user);
        return conversations;
    }
    async getMessages(id, limit, offset) {
        const limitNum = limit ? parseInt(limit) : 10000;
        const offsetNum = offset ? parseInt(offset) : 0;
        const messages = await supabase_service_1.supabaseService.getMessages(id, limitNum, offsetNum);
        return messages;
    }
    async markAsRead(id) {
        await supabase_service_1.supabaseService.markConversationAsRead(id);
        return { success: true };
    }
    async syncCustomerName(body) {
        const { customerId, customerName } = body;
        if (!customerId || !customerName || customerName === 'Customer') {
            return { success: false, error: 'Invalid customer name or ID' };
        }
        try {
            const { data: conv, error: fetchError } = await supabase_service_1.supabaseService.getClient()
                .from('conversations')
                .select('id, customer_name')
                .eq('customer_id', customerId)
                .single();
            if (fetchError || !conv) {
                return { success: false, error: 'Conversation not found' };
            }
            if (conv.customer_name && conv.customer_name !== 'Customer' && conv.customer_name !== customerId) {
                return { success: true, message: 'Name already set, skipped update' };
            }
            const { error: updateError } = await supabase_service_1.supabaseService.getClient()
                .from('conversations')
                .update({ customer_name: customerName })
                .eq('id', conv.id);
            if (updateError) {
                console.error(`[Supabase] Failed to update customer name for ${customerId}:`, updateError.message);
                return { success: false, error: updateError.message };
            }
            console.log(`[Supabase] Synced customer name: ${customerId} -> "${customerName}"`);
            this.messagingGateway.server.emit('conversationNameUpdated', {
                conversationId: conv.id,
                customerId: customerId,
                customerName: customerName,
            });
            return { success: true };
        }
        catch (err) {
            console.error(`[Supabase] Exception in syncCustomerName:`, err.message);
            return { success: false, error: err.message };
        }
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __param(3, (0, common_1.Query)('customer_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('sync-name'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "syncCustomerName", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, common_1.Controller)('api/conversations'),
    __metadata("design:paramtypes", [messaging_gateway_1.MessagingGateway])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map