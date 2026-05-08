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
exports.RiderInventoryController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const rider_inventory_service_1 = require("./rider-inventory.service");
let RiderInventoryController = class RiderInventoryController {
    riderInventoryService;
    constructor(riderInventoryService) {
        this.riderInventoryService = riderInventoryService;
    }
    async assignStock(body, req) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin') {
            throw new common_1.UnauthorizedException('Admin access required');
        }
        return this.riderInventoryService.assignStock({
            ...body,
            assigned_by: req.user.full_name || req.user.email
        });
    }
    async getMyStock(req) {
        return this.riderInventoryService.getMyStock(req.user.id);
    }
    async getAllStock(req) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin') {
            throw new common_1.UnauthorizedException('Admin access required');
        }
        return this.riderInventoryService.getAllRiderStock();
    }
    async updateStatus(id, status, req) {
        return this.riderInventoryService.updateStockStatus(id, status);
    }
    async quickSale(body, req) {
        return this.riderInventoryService.recordQuickSale(req.user.id, body, req.user.full_name);
    }
};
exports.RiderInventoryController = RiderInventoryController;
__decorate([
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RiderInventoryController.prototype, "assignStock", null);
__decorate([
    (0, common_1.Get)('my-stock'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RiderInventoryController.prototype, "getMyStock", null);
__decorate([
    (0, common_1.Get)('all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RiderInventoryController.prototype, "getAllStock", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RiderInventoryController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('quick-sale'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RiderInventoryController.prototype, "quickSale", null);
exports.RiderInventoryController = RiderInventoryController = __decorate([
    (0, common_1.Controller)('api/rider-inventory'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [rider_inventory_service_1.RiderInventoryService])
], RiderInventoryController);
//# sourceMappingURL=rider-inventory.controller.js.map