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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("./settings.service");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async getSettings() {
        return this.settingsService.getAllSettings();
    }
    async updateSettings(body) {
        const results = {};
        for (const [key, value] of Object.entries(body)) {
            results[key] = await this.settingsService.setSetting(key, value);
        }
        return { success: true, results };
    }
    async getCourierSettings() {
        const settings = await this.settingsService.getCourierSettings('pathao');
        return settings || {};
    }
    async saveCourierSettings(body) {
        try {
            const result = await this.settingsService.saveCourierSettings({ ...body, provider: 'pathao' });
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getPickDropSettings() {
        const settings = await this.settingsService.getCourierSettings('pickdrop');
        return settings || {};
    }
    async savePickDropSettings(body) {
        try {
            const result = await this.settingsService.saveCourierSettings({ ...body, provider: 'pickdrop' });
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getNcmSettings() {
        const settings = await this.settingsService.getCourierSettings('ncm');
        return settings || {};
    }
    async saveNcmSettings(body) {
        try {
            const result = await this.settingsService.saveCourierSettings({ ...body, provider: 'ncm' });
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('courier'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getCourierSettings", null);
__decorate([
    (0, common_1.Post)('courier'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "saveCourierSettings", null);
__decorate([
    (0, common_1.Get)('courier/pickdrop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getPickDropSettings", null);
__decorate([
    (0, common_1.Post)('courier/pickdrop'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "savePickDropSettings", null);
__decorate([
    (0, common_1.Get)('courier/ncm'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getNcmSettings", null);
__decorate([
    (0, common_1.Post)('courier/ncm'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "saveNcmSettings", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('api/settings'),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map