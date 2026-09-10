import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { MessageRetentionService } from './message-retention.service';

@Module({
    imports: [],
    controllers: [SettingsController],
    providers: [SettingsService, MessageRetentionService],
    exports: [SettingsService, MessageRetentionService],
})
export class SettingsModule { }
