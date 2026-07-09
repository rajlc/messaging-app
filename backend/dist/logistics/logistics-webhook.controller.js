"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogisticsWebhookController = void 0;
const common_1 = require("@nestjs/common");
const express = __importStar(require("express"));
const logistics_service_1 = require("./logistics.service");
const pick_drop_service_1 = require("./pick-drop.service");
const ncm_service_1 = require("./ncm.service");
let LogisticsWebhookController = class LogisticsWebhookController {
    logisticsService;
    pickDropService;
    ncmService;
    constructor(logisticsService, pickDropService, ncmService) {
        this.logisticsService = logisticsService;
        this.pickDropService = pickDropService;
        this.ncmService = ncmService;
    }
    async handlePathaoWebhook(payload, headers, res) {
        const result = await this.logisticsService.handleWebhook(payload, headers);
        if (result && result.message === 'Integration verified') {
            const secret = process.env.PATHAO_WEBHOOK_SECRET || 'f3992ecc-59da-4cbe-a049-a13da2018d51';
            res.setHeader('X-Pathao-Merchant-Webhook-Integration-Secret', secret);
            return res.status(202).json(result);
        }
        return res.status(200).json(result);
    }
    async verifyPickDropWebhook() {
        return {
            message: 'Pick & Drop webhook endpoint is reachable',
            expectedPath: '/api/logistics/pickdrop/webhook',
            method: 'POST'
        };
    }
    async handlePickDropWebhook(payload, headers, res) {
        console.log(`[PickDrop Webhook] Incoming request from ${headers['x-forwarded-for'] || 'unknown'}`);
        console.log(`[PickDrop Webhook] Headers: ${JSON.stringify(headers)}`);
        try {
            const result = await this.pickDropService.handleWebhook(payload, headers);
            return res.status(200).json(result);
        }
        catch (e) {
            console.error(`[PickDrop Webhook Error] ${e.message}`);
            return res.status(500).json({ success: false, error: e.message });
        }
    }
    async handleNcmWebhook(payload) {
        console.log(`[NCM Webhook] Incoming payload: ${JSON.stringify(payload)}`);
        try {
            await this.ncmService.handleWebhook(payload);
            return { success: true };
        }
        catch (e) {
            console.error(`[NCM Webhook Error] ${e.message}`);
            return { success: false, error: e.message };
        }
    }
};
exports.LogisticsWebhookController = LogisticsWebhookController;
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], LogisticsWebhookController.prototype, "handlePathaoWebhook", null);
__decorate([
    (0, common_1.Get)('pickdrop/webhook'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LogisticsWebhookController.prototype, "verifyPickDropWebhook", null);
__decorate([
    (0, common_1.Post)('pickdrop/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], LogisticsWebhookController.prototype, "handlePickDropWebhook", null);
__decorate([
    (0, common_1.Post)('ncm/webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsWebhookController.prototype, "handleNcmWebhook", null);
exports.LogisticsWebhookController = LogisticsWebhookController = __decorate([
    (0, common_1.Controller)('api/logistics'),
    __metadata("design:paramtypes", [logistics_service_1.LogisticsService,
        pick_drop_service_1.PickDropService,
        ncm_service_1.NcmService])
], LogisticsWebhookController);
//# sourceMappingURL=logistics-webhook.controller.js.map