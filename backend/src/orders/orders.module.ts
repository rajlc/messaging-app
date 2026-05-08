import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';
import { MessagingModule } from '../messaging/messaging.module';
import { TemplatesModule } from '../templates/templates.module';
import { SocketModule } from '../socket/socket.module';

@Module({
    imports: [
        ConfigModule,
        UsersModule,
        SettingsModule,
        MessagingModule,
        TemplatesModule,
        SocketModule
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService]
})
export class OrdersModule { }
