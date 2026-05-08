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
exports.BoostingController = void 0;
const common_1 = require("@nestjs/common");
const boosting_service_1 = require("./boosting.service");
let BoostingController = class BoostingController {
    boostingService;
    constructor(boostingService) {
        this.boostingService = boostingService;
    }
    async findAll() {
        try {
            const data = await this.boostingService.findAll();
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async create(body) {
        try {
            const data = await this.boostingService.create(body);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
exports.BoostingController = BoostingController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BoostingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BoostingController.prototype, "create", null);
exports.BoostingController = BoostingController = __decorate([
    (0, common_1.Controller)('api/boosting-costs'),
    __metadata("design:paramtypes", [boosting_service_1.BoostingService])
], BoostingController);
//# sourceMappingURL=boosting.controller.js.map