import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { OrderReportsService } from './order-reports.service';

@Module({
    imports: [ConfigModule],
    controllers: [GrowthController],
    providers: [GrowthService, OrderReportsService],
    exports: [GrowthService, OrderReportsService],
})
export class GrowthModule { }
