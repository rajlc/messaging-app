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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const passport_1 = require("@nestjs/passport");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async createOrder(req, orderData) {
        const enrichedData = {
            ...orderData,
            created_by: req.user.full_name || req.user.email
        };
        return this.ordersService.createExternalOrder(enrichedData);
    }
    async getOrders(req, limit, offset, customerId) {
        const limitNum = limit ? parseInt(limit) : 1000;
        const offsetNum = offset ? parseInt(offset) : 0;
        if (customerId) {
            return this.ordersService.getOrdersByCustomer(customerId, req.user);
        }
        return this.ordersService.getAllOrders(limitNum, offsetNum, req.user);
    }
    async updateOrder(req, id, orderData) {
        return this.ordersService.updateOrder(id, orderData, req.user);
    }
    async testMessage(body) {
        return this.ordersService.testAutoMessage(body.orderId, body.status);
    }
    async getInventoryProducts(search) {
        return this.ordersService.getInventoryProducts(search);
    }
    async getOrderById(req, id) {
        return this.ordersService.getOrderById(id, req.user);
    }
    async syncStatusFromInventory(body, apiKey) {
        const validApiKey = process.env.INVENTORY_APP_API_KEY;
        if (apiKey !== validApiKey) {
            return { error: 'Unauthorized', status: 401 };
        }
        return this.ordersService.updateStatusFromInventory(body.order_number, body.status);
    }
    async assignRider(req, id, body) {
        const adminName = req.user.full_name || req.user.email;
        return this.ordersService.assignToRider(id, body.riderId, adminName);
    }
    async getRiderOrders(req) {
        return this.ordersService.getRiderOrders(req.user.id);
    }
    async cancelAssignment(req, id) {
        const actorName = req.user.full_name || req.user.email;
        return this.ordersService.cancelAssignment(id, actorName);
    }
    async updateDeliveryStatus(req, id, body) {
        const actorName = req.user.full_name || req.user.email;
        return this.ordersService.updateDeliveryStatus(id, body.status, actorName);
    }
    async getAdminDeliveryOrders(req) {
        const role = req.user.role?.toLowerCase();
        console.log(`[Admin Delivery List] User: ${req.user.email}, Role: ${role}`);
        if (role !== 'admin' && role !== 'editor') {
            throw new common_1.UnauthorizedException('Admin or Editor access required');
        }
        const orders = await this.ordersService.getAdminDeliveryOrders();
        console.log(`[Admin Delivery List] Found ${orders.length} orders`);
        return orders;
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createOrder", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __param(3, (0, common_1.Query)('customer_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrders", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateOrder", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('test-message'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "testMessage", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('inventory-products'),
    __param(0, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getInventoryProducts", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrderById", null);
__decorate([
    (0, common_1.Put)('status/sync'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('api_key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "syncStatusFromInventory", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/assign-rider'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "assignRider", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('rider/assigned'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getRiderOrders", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/cancel-assignment'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "cancelAssignment", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/delivery-status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateDeliveryStatus", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('admin/delivery-list'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getAdminDeliveryOrders", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('api/orders'),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map