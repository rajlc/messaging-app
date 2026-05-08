import { Module } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { PickDropService } from './pick-drop.service';
import { NcmService } from './ncm.service';
import { SettingsModule } from '../settings/settings.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [SettingsModule, OrdersModule],
    controllers: [LogisticsController],
    providers: [LogisticsService, PickDropService, NcmService],
    exports: [LogisticsService, PickDropService, NcmService]
})
export class LogisticsModule { }
