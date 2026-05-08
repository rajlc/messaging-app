"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const config_1 = require("@nestjs/config");
const templates_controller_1 = require("./templates/templates.controller");
const settings_module_1 = require("./settings/settings.module");
const comments_module_1 = require("./comments/comments.module");
const logistics_module_1 = require("./logistics/logistics.module");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const orders_module_1 = require("./orders/orders.module");
const messaging_module_1 = require("./messaging/messaging.module");
const templates_module_1 = require("./templates/templates.module");
const socket_module_1 = require("./socket/socket.module");
const ads_management_module_1 = require("./ads-management/ads-management.module");
const settlements_module_1 = require("./settlements/settlements.module");
const rider_inventory_module_1 = require("./rider-inventory/rider-inventory.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            settings_module_1.SettingsModule,
            comments_module_1.CommentsModule,
            logistics_module_1.LogisticsModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            orders_module_1.OrdersModule,
            messaging_module_1.MessagingModule,
            templates_module_1.TemplatesModule,
            socket_module_1.SocketModule,
            ads_management_module_1.AdsManagementModule,
            settlements_module_1.SettlementsModule,
            rider_inventory_module_1.RiderInventoryModule,
        ],
        controllers: [
            app_controller_1.AppController,
            templates_controller_1.TemplatesController,
        ],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map