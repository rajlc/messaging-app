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
exports.LogisticsController = void 0;
const common_1 = require("@nestjs/common");
const logistics_service_1 = require("./logistics.service");
const pick_drop_service_1 = require("./pick-drop.service");
const ncm_service_1 = require("./ncm.service");
const supabase_service_1 = require("../supabase/supabase.service");
const passport_1 = require("@nestjs/passport");
let LogisticsController = class LogisticsController {
    logisticsService;
    pickDropService;
    ncmService;
    constructor(logisticsService, pickDropService, ncmService) {
        this.logisticsService = logisticsService;
        this.pickDropService = pickDropService;
        this.ncmService = ncmService;
    }
    async getCities() {
        return this.logisticsService.getCities();
    }
    async getZones(cityId) {
        return this.logisticsService.getZones(parseInt(cityId));
    }
    async getAreas(zoneId) {
        return this.logisticsService.getAreas(parseInt(zoneId));
    }
    async getAllAreas() {
        return this.logisticsService.getAllAreas();
    }
    async calculatePrice(body) {
        return this.logisticsService.calculatePrice(body);
    }
    async shipOrder(orderId) {
        return this.logisticsService.createOrder(orderId);
    }
    async getPathaoInfo(orderId) {
        return this.logisticsService.getPathaoOrderInfo(orderId);
    }
    async getPickDropBranches() {
        try {
            const branches = await this.pickDropService.getBranches();
            return { success: true, data: branches };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getPickDropDeliveryRate(body) {
        try {
            const rate = await this.pickDropService.getDeliveryRate(body);
            return { success: true, data: rate };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async shipPickDropOrder(orderId) {
        try {
            const result = await this.pickDropService.createOrder(orderId);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async cancelPickDropOrder(pndOrderId) {
        try {
            const result = await this.pickDropService.cancelOrder(pndOrderId);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getPickDropOrderDetails(orderId) {
        try {
            const result = await this.pickDropService.getOrderDetails(orderId);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async syncPickDropOrder(orderId) {
        try {
            const result = await this.pickDropService.syncOrder(orderId);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getNcmBranches() {
        try {
            const branches = await this.ncmService.getBranches();
            return { success: true, data: branches };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getNcmShippingRate(body) {
        try {
            const { creation, destination, type } = body;
            const rate = await this.ncmService.calculateShippingRate(creation, destination, type);
            return { success: true, data: rate };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async handleNcmShip(body) {
        try {
            const { orderId, fromBranch, toBranch, deliveryType } = body;
            const { data: order, error: fetchError } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();
            if (fetchError || !order)
                throw new Error('Order not found');
            const orderWithOverrides = {
                ...order,
                ncm_from_branch: fromBranch || order.ncm_from_branch || order.from_branch,
                ncm_to_branch: toBranch || order.ncm_to_branch || order.delivery_branch,
                ncm_delivery_type: deliveryType || order.ncm_delivery_type || order.delivery_type
            };
            const result = await this.ncmService.createOrder(orderWithOverrides);
            if (result.success) {
                const { error: updateError } = await supabase_service_1.supabaseService.getSupabaseClient()
                    .from('orders')
                    .update({
                    courier_provider: 'ncm',
                    courier_consignment_id: result.orderId.toString(),
                    ncm_from_branch: orderWithOverrides.ncm_from_branch,
                    ncm_to_branch: orderWithOverrides.ncm_to_branch,
                    ncm_delivery_type: orderWithOverrides.ncm_delivery_type,
                    order_status: 'Packed',
                    logistic_name: 'Nepal Can Move (NCM)'
                })
                    .eq('id', orderId);
                if (updateError)
                    throw updateError;
                await supabase_service_1.supabaseService.getSupabaseClient()
                    .from('order_status_history')
                    .insert([{
                        order_id: orderId,
                        status: 'Packed',
                        changed_by: 'system',
                        remarks: `Initial NCM Shipment (Created NCM Order ID: ${result.orderId})`
                    }]);
            }
            return result;
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async registerNcmWebhook(url) {
        try {
            if (!url)
                throw new Error('URL is required');
            const result = await this.ncmService.registerWebhook(url);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async syncNcmStatus(body) {
        try {
            const result = await this.ncmService.syncOrderStatus(body.orderId);
            return result;
        }
        catch (e) {
            console.error(`[NCM Sync Error] ${e.message}`);
            return { success: false, error: e.message };
        }
    }
    async getCodSettlements(logisticId) {
        try {
            const data = await this.logisticsService.getSettlements(logisticId);
            return { success: true, data };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async addCodSettlement(body) {
        try {
            const result = await this.logisticsService.addSettlement(body);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async updateCodSettlement(id, body) {
        try {
            const result = await this.logisticsService.updateSettlement(id, body);
            return { success: true, data: result };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    async getOrderChangelogs(logisticId) {
        try {
            const data = await this.logisticsService.getOrderChangelogs(logisticId);
            return { success: true, data };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
};
exports.LogisticsController = LogisticsController;
__decorate([
    (0, common_1.Get)('cities'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getCities", null);
__decorate([
    (0, common_1.Get)('zones/:cityId'),
    __param(0, (0, common_1.Param)('cityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getZones", null);
__decorate([
    (0, common_1.Get)('areas/:zoneId'),
    __param(0, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getAreas", null);
__decorate([
    (0, common_1.Get)('all-areas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getAllAreas", null);
__decorate([
    (0, common_1.Post)('price-plan'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "calculatePrice", null);
__decorate([
    (0, common_1.Post)('ship'),
    __param(0, (0, common_1.Body)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "shipOrder", null);
__decorate([
    (0, common_1.Get)('orders/:orderId/pathao-info'),
    __param(0, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getPathaoInfo", null);
__decorate([
    (0, common_1.Get)('pickdrop/branches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getPickDropBranches", null);
__decorate([
    (0, common_1.Post)('pickdrop/delivery-rate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getPickDropDeliveryRate", null);
__decorate([
    (0, common_1.Post)('pickdrop/ship'),
    __param(0, (0, common_1.Body)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "shipPickDropOrder", null);
__decorate([
    (0, common_1.Put)('pickdrop/cancel'),
    __param(0, (0, common_1.Body)('pndOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "cancelPickDropOrder", null);
__decorate([
    (0, common_1.Get)('pickdrop/order-details'),
    __param(0, (0, common_1.Query)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getPickDropOrderDetails", null);
__decorate([
    (0, common_1.Post)('pickdrop/status-sync'),
    __param(0, (0, common_1.Body)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "syncPickDropOrder", null);
__decorate([
    (0, common_1.Get)('ncm/branches'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getNcmBranches", null);
__decorate([
    (0, common_1.Post)('ncm/shipping-rate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getNcmShippingRate", null);
__decorate([
    (0, common_1.Post)('ncm/ship'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "handleNcmShip", null);
__decorate([
    (0, common_1.Post)('ncm/register-webhook'),
    __param(0, (0, common_1.Body)('url')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "registerNcmWebhook", null);
__decorate([
    (0, common_1.Post)('ncm/status-sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "syncNcmStatus", null);
__decorate([
    (0, common_1.Get)('cod-settlements/:logisticId'),
    __param(0, (0, common_1.Param)('logisticId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getCodSettlements", null);
__decorate([
    (0, common_1.Post)('cod-settlements'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "addCodSettlement", null);
__decorate([
    (0, common_1.Put)('cod-settlements/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "updateCodSettlement", null);
__decorate([
    (0, common_1.Get)('order-changelogs/:logisticId'),
    __param(0, (0, common_1.Param)('logisticId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LogisticsController.prototype, "getOrderChangelogs", null);
exports.LogisticsController = LogisticsController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('api/logistics'),
    __metadata("design:paramtypes", [logistics_service_1.LogisticsService,
        pick_drop_service_1.PickDropService,
        ncm_service_1.NcmService])
], LogisticsController);
//# sourceMappingURL=logistics.controller.js.map