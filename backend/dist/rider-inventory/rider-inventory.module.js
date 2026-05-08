"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderInventoryModule = void 0;
const common_1 = require("@nestjs/common");
const rider_inventory_service_1 = require("./rider-inventory.service");
const rider_inventory_controller_1 = require("./rider-inventory.controller");
const orders_module_1 = require("../orders/orders.module");
let RiderInventoryModule = class RiderInventoryModule {
};
exports.RiderInventoryModule = RiderInventoryModule;
exports.RiderInventoryModule = RiderInventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [orders_module_1.OrdersModule],
        providers: [rider_inventory_service_1.RiderInventoryService],
        controllers: [rider_inventory_controller_1.RiderInventoryController],
        exports: [rider_inventory_service_1.RiderInventoryService]
    })
], RiderInventoryModule);
//# sourceMappingURL=rider-inventory.module.js.map