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
exports.TemplatesController = void 0;
const common_1 = require("@nestjs/common");
const templates_service_1 = require("./templates.service");
let TemplatesController = class TemplatesController {
    templatesService;
    constructor(templatesService) {
        this.templatesService = templatesService;
    }
    async getTemplates() {
        return this.templatesService.getAllTemplates();
    }
    async upsertTemplate(body) {
        return this.templatesService.upsertTemplate(body.status, body.template, body.is_active);
    }
    async getQuickReplyTemplates() {
        return this.templatesService.getAllQuickReplyTemplates();
    }
    async getQuickReplyTemplate(id) {
        return this.templatesService.getQuickReplyTemplateById(id);
    }
    async createQuickReplyTemplate(body) {
        return this.templatesService.createQuickReplyTemplate(body);
    }
    async updateQuickReplyTemplate(id, body) {
        return this.templatesService.updateQuickReplyTemplate(id, body);
    }
    async deleteQuickReplyTemplate(id) {
        await this.templatesService.deleteQuickReplyTemplate(id);
        return { success: true };
    }
};
exports.TemplatesController = TemplatesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "upsertTemplate", null);
__decorate([
    (0, common_1.Get)('quick-reply'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getQuickReplyTemplates", null);
__decorate([
    (0, common_1.Get)('quick-reply/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getQuickReplyTemplate", null);
__decorate([
    (0, common_1.Post)('quick-reply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "createQuickReplyTemplate", null);
__decorate([
    (0, common_1.Put)('quick-reply/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "updateQuickReplyTemplate", null);
__decorate([
    (0, common_1.Delete)('quick-reply/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "deleteQuickReplyTemplate", null);
exports.TemplatesController = TemplatesController = __decorate([
    (0, common_1.Controller)('api/templates'),
    __metadata("design:paramtypes", [templates_service_1.TemplatesService])
], TemplatesController);
//# sourceMappingURL=templates.controller.js.map