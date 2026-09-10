import { forwardRef, Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { MessagesController } from './messages.controller';
import { WebhooksController } from './webhooks.controller';
import { UploadController } from './upload.controller';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import { AutoReplyController } from '../auto-reply/auto-reply.controller';
import { PagesController } from './pages/pages.controller';
import { TikTokAuthController } from './tiktok-auth.controller';
import { SettingsModule } from '../settings/settings.module';
import { CommentsModule } from '../comments/comments.module';
import { SocketModule } from '../socket/socket.module';
import { AuthModule } from '../auth/auth.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { EcommerceCatalogService } from './ecommerce-catalog.service';

@Module({
    imports: [
        SettingsModule,
        CommentsModule,
        forwardRef(() => SocketModule),
        AuthModule
    ],
    providers: [FacebookService, AutoReplyService, AiService, EcommerceCatalogService],
    controllers: [
        ConversationsController,
        MessagesController,
        FacebookController,
        WebhooksController,
        UploadController,
        AutoReplyController,
        PagesController,
        TikTokAuthController,
        AiController
    ],
    exports: [FacebookService, AutoReplyService, AiService, EcommerceCatalogService]
})
export class MessagingModule { }
