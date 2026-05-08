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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const facebook_service_1 = require("./facebook.service");
let FacebookController = class FacebookController {
    configService;
    facebookService;
    constructor(configService, facebookService) {
        this.configService = configService;
        this.facebookService = facebookService;
    }
    async getPageInfo() {
        const pageAccessToken = this.configService.get('META_PAGE_ACCESS_TOKEN');
        if (!pageAccessToken) {
            return {
                connected: false,
                message: 'No page access token configured'
            };
        }
        try {
            const response = await axios_1.default.get(`https://graph.facebook.com/v18.0/me`, {
                params: {
                    fields: 'id,name,username',
                    access_token: pageAccessToken
                }
            });
            return {
                connected: true,
                pageId: response.data.id,
                pageName: response.data.name,
                username: response.data.username
            };
        }
        catch (error) {
            console.error('Error fetching page info:', error.response?.data || error.message);
            return {
                connected: false,
                error: 'Failed to fetch page information'
            };
        }
    }
    async getUserProfile(userId) {
        try {
            const profile = await this.facebookService.getUserProfile(userId);
            return profile;
        }
        catch (error) {
            return {
                error: 'Failed to fetch user profile',
                message: error.message
            };
        }
    }
};
exports.FacebookController = FacebookController;
__decorate([
    (0, common_1.Get)('page-info'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FacebookController.prototype, "getPageInfo", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FacebookController.prototype, "getUserProfile", null);
exports.FacebookController = FacebookController = __decorate([
    (0, common_1.Controller)('api/facebook'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        facebook_service_1.FacebookService])
], FacebookController);
//# sourceMappingURL=facebook.controller.js.map