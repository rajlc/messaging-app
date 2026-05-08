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
exports.CommentsController = void 0;
const common_1 = require("@nestjs/common");
const comments_service_1 = require("./comments.service");
const facebook_graph_service_1 = require("../facebook/facebook-graph.service");
const config_1 = require("@nestjs/config");
let CommentsController = class CommentsController {
    commentsService;
    facebookGraphService;
    configService;
    constructor(commentsService, facebookGraphService, configService) {
        this.commentsService = commentsService;
        this.facebookGraphService = facebookGraphService;
        this.configService = configService;
    }
    async getAllComments() {
        return this.commentsService.getAllComments();
    }
    async getComment(id) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new common_1.HttpException('Comment not found', common_1.HttpStatus.NOT_FOUND);
        }
        return comment;
    }
    async getCommentsByCustomer(customerId) {
        return this.commentsService.getCommentsByCustomer(customerId);
    }
    async replyToComment(id, body) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new common_1.HttpException('Comment not found', common_1.HttpStatus.NOT_FOUND);
        }
        const accessToken = this.configService.get('META_PAGE_ACCESS_TOKEN');
        if (!accessToken) {
            throw new common_1.HttpException('Page access token not configured', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        await this.facebookGraphService.replyToComment(comment.comment_id, body.message, accessToken);
        await this.commentsService.markAsReplied(id);
        return { success: true, message: 'Reply posted successfully' };
    }
    async replyPrivately(id, body) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new common_1.HttpException('Comment not found', common_1.HttpStatus.NOT_FOUND);
        }
        const accessToken = this.configService.get('META_PAGE_ACCESS_TOKEN');
        if (!accessToken) {
            throw new common_1.HttpException('Page access token not configured', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const pageId = comment.page_id;
        if (!pageId) {
            throw new common_1.HttpException('Page ID not found in comment', common_1.HttpStatus.BAD_REQUEST);
        }
        await this.facebookGraphService.sendPrivateMessage(comment.customer_id, body.message, accessToken, pageId);
        await this.commentsService.markAsReplied(id);
        return { success: true, message: 'Private message sent successfully' };
    }
    async hideComment(id) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new common_1.HttpException('Comment not found', common_1.HttpStatus.NOT_FOUND);
        }
        const accessToken = this.configService.get('META_PAGE_ACCESS_TOKEN');
        if (!accessToken) {
            throw new common_1.HttpException('Page access token not configured', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        await this.facebookGraphService.hideComment(comment.comment_id, accessToken);
        await this.commentsService.markAsHidden(id);
        return { success: true, message: 'Comment hidden successfully' };
    }
    async deleteComment(id) {
        await this.commentsService.deleteComment(id);
        return { success: true, message: 'Comment deleted successfully' };
    }
};
exports.CommentsController = CommentsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "getAllComments", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "getComment", null);
__decorate([
    (0, common_1.Get)('customer/:customerId'),
    __param(0, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "getCommentsByCustomer", null);
__decorate([
    (0, common_1.Post)(':id/reply'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "replyToComment", null);
__decorate([
    (0, common_1.Post)(':id/reply-private'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "replyPrivately", null);
__decorate([
    (0, common_1.Post)(':id/hide'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "hideComment", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "deleteComment", null);
exports.CommentsController = CommentsController = __decorate([
    (0, common_1.Controller)('api/comments'),
    __metadata("design:paramtypes", [comments_service_1.CommentsService,
        facebook_graph_service_1.FacebookGraphService,
        config_1.ConfigService])
], CommentsController);
//# sourceMappingURL=comments.controller.js.map