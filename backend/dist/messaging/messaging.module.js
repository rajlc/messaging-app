"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const conversations_controller_1 = require("./conversations.controller");
const facebook_controller_1 = require("./facebook.controller");
const facebook_service_1 = require("./facebook.service");
const messages_controller_1 = require("./messages.controller");
const webhooks_controller_1 = require("./webhooks.controller");
const upload_controller_1 = require("./upload.controller");
const auto_reply_service_1 = require("../auto-reply/auto-reply.service");
const auto_reply_controller_1 = require("../auto-reply/auto-reply.controller");
const pages_controller_1 = require("./pages/pages.controller");
const settings_module_1 = require("../settings/settings.module");
const comments_module_1 = require("../comments/comments.module");
const socket_module_1 = require("../socket/socket.module");
const auth_module_1 = require("../auth/auth.module");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            settings_module_1.SettingsModule,
            comments_module_1.CommentsModule,
            (0, common_1.forwardRef)(() => socket_module_1.SocketModule),
            auth_module_1.AuthModule
        ],
        providers: [facebook_service_1.FacebookService, auto_reply_service_1.AutoReplyService],
        controllers: [
            conversations_controller_1.ConversationsController,
            messages_controller_1.MessagesController,
            facebook_controller_1.FacebookController,
            webhooks_controller_1.WebhooksController,
            upload_controller_1.UploadController,
            auto_reply_controller_1.AutoReplyController,
            pages_controller_1.PagesController
        ],
        exports: [facebook_service_1.FacebookService, auto_reply_service_1.AutoReplyService]
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map