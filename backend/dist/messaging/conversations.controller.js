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
let ConversationsController = class ConversationsController {
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
exports.ConversationsController = ConversationsController = __decorate([
    (0, common_1.Controller)('api/conversations')
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map