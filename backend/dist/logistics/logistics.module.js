"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogisticsModule = void 0;
const common_1 = require("@nestjs/common");
const logistics_service_1 = require("./logistics.service");
const logistics_controller_1 = require("./logistics.controller");
const pick_drop_service_1 = require("./pick-drop.service");
const ncm_service_1 = require("./ncm.service");
const settings_module_1 = require("../settings/settings.module");
const orders_module_1 = require("../orders/orders.module");
let LogisticsModule = class LogisticsModule {
};
exports.LogisticsModule = LogisticsModule;
exports.LogisticsModule = LogisticsModule = __decorate([
    (0, common_1.Module)({
        imports: [settings_module_1.SettingsModule, orders_module_1.OrdersModule],
        controllers: [logistics_controller_1.LogisticsController],
        providers: [logistics_service_1.LogisticsService, pick_drop_service_1.PickDropService, ncm_service_1.NcmService],
        exports: [logistics_service_1.LogisticsService, pick_drop_service_1.PickDropService, ncm_service_1.NcmService]
    })
], LogisticsModule);
//# sourceMappingURL=logistics.module.js.map