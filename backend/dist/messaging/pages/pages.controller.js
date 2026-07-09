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
var PagesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagesController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../supabase/supabase.service");
const facebook_service_1 = require("../facebook.service");
const passport_1 = require("@nestjs/passport");
let PagesController = class PagesController {
    static { PagesController_1 = this; }
    facebookService;
    constructor(facebookService) {
        this.facebookService = facebookService;
    }
    async getPages() {
        const pages = await supabase_service_1.supabaseService.getPages();
        return pages.map(p => ({
            ...p,
            isOnline: PagesController_1.isProfileOnline(p.page_id)
        }));
    }
    async addPage(body) {
        if (!body.pageId) {
            throw new common_1.HttpException('Page ID is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const platform = body.platform || 'facebook';
        const isFacebookPage = platform === 'facebook';
        if (isFacebookPage && !body.accessToken) {
            throw new common_1.HttpException('Access Token is required for Facebook Pages', common_1.HttpStatus.BAD_REQUEST);
        }
        let pageName = body.pageName || 'Social Account';
        if (isFacebookPage) {
            const isValid = await this.facebookService.validatePageToken(body.pageId, body.accessToken);
            if (!isValid) {
                throw new common_1.HttpException('Invalid Facebook Page ID or Access Token', common_1.HttpStatus.BAD_REQUEST);
            }
            if (!body.pageName) {
                try {
                    pageName = await this.facebookService.getPageName(body.pageId, body.accessToken);
                }
                catch (error) {
                    console.warn('Could not fetch page name, using default');
                }
            }
        }
        else if (!body.pageName) {
            pageName = `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account (${body.pageId})`;
        }
        const page = await supabase_service_1.supabaseService.createPage({
            platform: platform,
            pageName: pageName,
            pageId: body.pageId,
            accessToken: body.accessToken || 'none'
        });
        return page;
    }
    async removePage(id) {
        return await supabase_service_1.supabaseService.deletePage(id);
    }
    async updatePage(id, body) {
        return await supabase_service_1.supabaseService.updatePage(id, body);
    }
    static onlineMarketplaceProfiles = new Map();
    static pendingMarketplaceSends = new Map();
    static isProfileOnline(profileId) {
        const lastActive = this.onlineMarketplaceProfiles.get(profileId);
        if (!lastActive)
            return false;
        return (Date.now() - lastActive) < 25000;
    }
    async registerHeartbeat(body) {
        if (body.pageId && body.platform === 'facebook_marketplace') {
            PagesController_1.onlineMarketplaceProfiles.set(body.pageId, Date.now());
            return { success: true, status: 'acknowledged' };
        }
        return { success: false, error: 'Invalid profile or platform' };
    }
    getPendingMessages(pageId) {
        const queue = PagesController_1.pendingMarketplaceSends.get(pageId) || [];
        return queue;
    }
    markMessageSent(body) {
        const queue = PagesController_1.pendingMarketplaceSends.get(body.pageId) || [];
        const filtered = queue.filter(m => m.messageId !== body.messageId);
        PagesController_1.pendingMarketplaceSends.set(body.pageId, filtered);
        return { success: true };
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
__decorate([
    (0, common_1.Post)('heartbeat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "registerHeartbeat", null);
__decorate([
    (0, common_1.Get)('pending-messages/:pageId'),
    __param(0, (0, common_1.Param)('pageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "getPendingMessages", null);
__decorate([
    (0, common_1.Post)('pending-messages/sent'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "markMessageSent", null);
exports.PagesController = PagesController = PagesController_1 = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('api/pages'),
    __metadata("design:paramtypes", [facebook_service_1.FacebookService])
], PagesController);
//# sourceMappingURL=pages.controller.js.map