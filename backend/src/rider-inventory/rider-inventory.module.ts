import { Module } from '@nestjs/common';
import { RiderInventoryService } from './rider-inventory.service';
import { RiderInventoryController } from './rider-inventory.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [OrdersModule],
    providers: [RiderInventoryService],
    controllers: [RiderInventoryController],
    exports: [RiderInventoryService]
})
export class RiderInventoryModule { }
