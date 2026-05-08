import { Module } from '@nestjs/common';
import { BoostingController } from './boosting.controller';
import { BoostingService } from './boosting.service';

@Module({
    controllers: [BoostingController],
    providers: [BoostingService],
})
export class BoostingModule { }
