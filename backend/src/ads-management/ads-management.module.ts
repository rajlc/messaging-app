import { Module } from '@nestjs/common';
import { AdsManagementController } from './ads-management.controller';
import { AdsManagementService } from './ads-management.service';

@Module({
    controllers: [AdsManagementController],
    providers: [AdsManagementService],
})
export class AdsManagementModule { }
