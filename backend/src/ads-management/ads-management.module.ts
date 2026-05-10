import { Module } from '@nestjs/common';
import { AdsManagementController } from './ads-management.controller';
import { AdsManagementService } from './ads-management.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [OrdersModule],
    controllers: [AdsManagementController],
    providers: [AdsManagementService],
})
export class AdsManagementModule { }
