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
exports.AdsManagementController = void 0;
const common_1 = require("@nestjs/common");
const ads_management_service_1 = require("./ads-management.service");
const passport_1 = require("@nestjs/passport");
let AdsManagementController = class AdsManagementController {
    adsManagementService;
    constructor(adsManagementService) {
        this.adsManagementService = adsManagementService;
    }
    async findAllCampaigns() {
        try {
            const data = await this.adsManagementService.findAllCampaigns();
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async createCampaign(body) {
        try {
            const data = await this.adsManagementService.createCampaign(body);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async updateCampaign(id, body) {
        try {
            const data = await this.adsManagementService.updateCampaign(id, body);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async findCampaignDetails(id) {
        try {
            const data = await this.adsManagementService.findCampaignDetails(id);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async findAllSpends() {
        try {
            const data = await this.adsManagementService.findAllSpends();
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async createSpend(body) {
        try {
            const data = await this.adsManagementService.createSpend(body);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async updateSpend(id, body) {
        try {
            const data = await this.adsManagementService.updateSpend(id, body);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async findAllProductMetrics() {
        try {
            const data = await this.adsManagementService.findAllProductMetrics();
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async upsertProductMetric(body) {
        try {
            const { product_name, est_purchase_cost } = body;
            const data = await this.adsManagementService.upsertProductMetric(product_name, est_purchase_cost);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
exports.AdsManagementController = AdsManagementController;
__decorate([
    (0, common_1.Get)('campaigns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "findAllCampaigns", null);
__decorate([
    (0, common_1.Post)('campaigns'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Put)('campaigns/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "updateCampaign", null);
__decorate([
    (0, common_1.Get)('campaigns/:id/details'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "findCampaignDetails", null);
__decorate([
    (0, common_1.Get)('spends'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "findAllSpends", null);
__decorate([
    (0, common_1.Post)('spends'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "createSpend", null);
__decorate([
    (0, common_1.Put)('spends/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "updateSpend", null);
__decorate([
    (0, common_1.Get)('product-metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "findAllProductMetrics", null);
__decorate([
    (0, common_1.Post)('product-metrics'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdsManagementController.prototype, "upsertProductMetric", null);
exports.AdsManagementController = AdsManagementController = __decorate([
    (0, common_1.Controller)('api/ads-management'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [ads_management_service_1.AdsManagementService])
], AdsManagementController);
//# sourceMappingURL=ads-management.controller.js.map