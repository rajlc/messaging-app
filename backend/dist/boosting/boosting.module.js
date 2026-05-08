"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostingModule = void 0;
const common_1 = require("@nestjs/common");
const boosting_controller_1 = require("./boosting.controller");
const boosting_service_1 = require("./boosting.service");
let BoostingModule = class BoostingModule {
};
exports.BoostingModule = BoostingModule;
exports.BoostingModule = BoostingModule = __decorate([
    (0, common_1.Module)({
        controllers: [boosting_controller_1.BoostingController],
        providers: [boosting_service_1.BoostingService],
    })
], BoostingModule);
//# sourceMappingURL=boosting.module.js.map