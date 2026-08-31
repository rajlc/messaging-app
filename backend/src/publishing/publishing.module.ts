import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';
import { FacebookPublisher } from './publishers/facebook.publisher';
import { InstagramPublisher } from './publishers/instagram.publisher';
import { TikTokPublisher } from './publishers/tiktok.publisher';

@Module({
    controllers: [PublishingController],
    providers: [
        PublishingService,
        FacebookPublisher,
        InstagramPublisher,
        TikTokPublisher,
    ],
    exports: [PublishingService],
})
export class PublishingModule {}