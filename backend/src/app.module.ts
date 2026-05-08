import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { WebhooksController } from './messaging/webhooks.controller';
import { FacebookController } from './messaging/facebook.controller';
import { ConversationsController } from './messaging/conversations.controller';
import { MessagesController } from './messaging/messages.controller';
import { ConfigModule } from '@nestjs/config';

import { TemplatesController } from './templates/templates.controller';
import { SettingsModule } from './settings/settings.module';
import { CommentsModule } from './comments/comments.module';

import { LogisticsModule } from './logistics/logistics.module';

import { PagesController } from './messaging/pages/pages.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UploadController } from './messaging/upload.controller';

import { OrdersModule } from './orders/orders.module';
import { MessagingModule } from './messaging/messaging.module';
import { TemplatesModule } from './templates/templates.module';
import { SocketModule } from './socket/socket.module';
import { AdsManagementModule } from './ads-management/ads-management.module';
import { SettlementsModule } from './settlements/settlements.module';
import { RiderInventoryModule } from './rider-inventory/rider-inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SettingsModule,
    CommentsModule,
    LogisticsModule,
    UsersModule,
    AuthModule,
    OrdersModule,
    MessagingModule,
    TemplatesModule,
    SocketModule,
    AdsManagementModule,
    SettlementsModule,
    RiderInventoryModule,
  ],
  controllers: [
    AppController,
    TemplatesController,
  ],
  providers: [],
})
export class AppModule { }
