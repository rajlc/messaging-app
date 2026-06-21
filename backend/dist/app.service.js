"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("./supabase/supabase.service");
let AppService = class AppService {
    async onModuleInit() {
        try {
            console.log('Checking default pages...');
            const existing = await supabase_service_1.supabaseService.getPageByFacebookId('facebook_marketplace');
            if (!existing) {
                console.log('Creating default page "Facebook Marketplace"...');
                await supabase_service_1.supabaseService.createPage({
                    platform: 'facebook_marketplace',
                    pageName: 'Facebook Marketplace',
                    pageId: 'facebook_marketplace',
                    accessToken: 'none'
                });
                console.log('✅ Default page "Facebook Marketplace" created.');
            }
            else {
                console.log('Default page "Facebook Marketplace" already exists.');
            }
        }
        catch (e) {
            console.warn('Failed to seed default Facebook Marketplace page:', e.message);
        }
    }
    getHello() {
        return 'Hello World!';
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map