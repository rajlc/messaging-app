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
exports.PagesController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../supabase/supabase.service");
const facebook_service_1 = require("../facebook.service");
let PagesController = class PagesController {
    facebookService;
    constructor(facebookService) {
        this.facebookService = facebookService;
    }
    async getPages() {
        return await supabase_service_1.supabaseService.getPages();
    }
    async addPage(body) {
        if (!body.pageId || !body.accessToken) {
            throw new common_1.HttpException('Page ID and Access Token are required', common_1.HttpStatus.BAD_REQUEST);
        }
        const isValid = await this.facebookService.validatePageToken(body.pageId, body.accessToken);
        if (!isValid) {
            throw new common_1.HttpException('Invalid Page ID or Access Token', common_1.HttpStatus.BAD_REQUEST);
        }
        let pageName = 'Unknown Page';
        try {
            pageName = await this.facebookService.getPageName(body.pageId, body.accessToken);
        }
        catch (error) {
            console.warn('Could not fetch page name, using default');
        }
        const page = await supabase_service_1.supabaseService.createPage({
            platform: body.platform || 'facebook',
            pageName: pageName,
            pageId: body.pageId,
            accessToken: body.accessToken
        });
        return page;
    }
    async removePage(id) {
        return await supabase_service_1.supabaseService.deletePage(id);
    }
    async updatePage(id, body) {
        return await supabase_service_1.supabaseService.updatePage(id, body);
    }
};
exports.PagesController = PagesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "getPages", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "addPage", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "removePage", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "updatePage", null);
exports.PagesController = PagesController = __decorate([
    (0, common_1.Controller)('api/pages'),
    __metadata("design:paramtypes", [facebook_service_1.FacebookService])
], PagesController);
//# sourceMappingURL=pages.controller.js.map