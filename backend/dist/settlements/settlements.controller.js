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
exports.SettlementsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const settlements_service_1 = require("./settlements.service");
let SettlementsController = class SettlementsController {
    settlementsService;
    constructor(settlementsService) {
        this.settlementsService = settlementsService;
    }
    async getRiders() {
        return this.settlementsService.getRiders();
    }
    async createSettlement(req, body) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin' && role !== 'editor') {
            throw new common_1.UnauthorizedException('Admin or Editor access required');
        }
        const actorName = req.user.full_name || req.user.email;
        return this.settlementsService.createSettlement(body.riderId, body.amount, body.date, actorName);
    }
    async updateSettlement(req, id, body) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin' && role !== 'editor') {
            throw new common_1.UnauthorizedException('Admin or Editor access required');
        }
        const actorName = req.user.full_name || req.user.email;
        try {
            return await this.settlementsService.updateSettlement(id, body.amount, body.date, actorName);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error.message);
        }
    }
    async deleteSettlement(req, id) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin' && role !== 'editor') {
            throw new common_1.UnauthorizedException('Admin or Editor access required');
        }
        try {
            return await this.settlementsService.deleteSettlement(id);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error.message);
        }
    }
    async getAllSettlements() {
        return this.settlementsService.getAllSettlements();
    }
    async getPendingSummary(req) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin' && role !== 'editor') {
            throw new common_1.UnauthorizedException('Admin or Editor access required');
        }
        return this.settlementsService.getPendingSummary();
    }
    async getMySummary(req) {
        return this.settlementsService.getMySummary(req.user.id);
    }
    async getMyDeliveryReport(req, startDate, endDate) {
        return this.settlementsService.getDeliveryReport(startDate, endDate, req.user.id);
    }
    async getDeliveryReport(req, startDate, endDate, riderId) {
        const role = req.user.role?.toLowerCase();
        let targetRiderId = riderId;
        if (role !== 'admin' && role !== 'editor') {
            targetRiderId = req.user.id;
        }
        return this.settlementsService.getDeliveryReport(startDate, endDate, targetRiderId);
    }
};
exports.SettlementsController = SettlementsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('riders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getRiders", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "createSettlement", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "updateSettlement", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "deleteSettlement", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getAllSettlements", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('pending-summary'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getPendingSummary", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my-summary'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getMySummary", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my-delivery-report'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getMyDeliveryReport", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('delivery-report'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('riderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getDeliveryReport", null);
exports.SettlementsController = SettlementsController = __decorate([
    (0, common_1.Controller)('api/settlements'),
    __metadata("design:paramtypes", [settlements_service_1.SettlementsService])
], SettlementsController);
//# sourceMappingURL=settlements.controller.js.map