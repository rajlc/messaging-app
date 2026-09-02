import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PublishingService } from './publishing.service';
import { CreatePostDto } from './publishing.types';

@UseGuards(AuthGuard('jwt'))
@Controller('api/publish')
export class PublishingController {
    constructor(private readonly publishingService: PublishingService) {}

    @Get()
    async getPosts() {
        return await this.publishingService.getPosts();
    }

    @Get(':id')
    async getPost(@Param('id') id: string) {
        return await this.publishingService.getPostById(id);
    }

    @Post('create')
    async createPost(@Body() dto: CreatePostDto) {
        return await this.publishingService.createPost(dto);
    }

    @Patch(':id')
    async updatePost(@Param('id') id: string, @Body() dto: CreatePostDto) {
        return await this.publishingService.updatePost(id, dto);
    }

    @Delete(':id')
    async deletePost(@Param('id') id: string) {
        return await this.publishingService.deletePost(id);
    }

    @Post(':id/retry')
    async retryPublish(@Param('id') id: string) {
        await this.publishingService.executePublishing(id);
        return await this.publishingService.getPostById(id);
    }

    @Post('sync')
    async syncPosts(@Body() body?: { pageId?: string; platform?: string }) {
        return await this.publishingService.syncExternalPosts(body?.pageId, body?.platform);
    }

    /**
     * Public cron trigger endpoint — NO JWT required.
     * Call this every minute from a free external cron service such as:
     *   - https://cron-job.org  (free, every minute)
     *   - https://uptimerobot.com  (every 5 minutes)
     *   - GitHub Actions scheduled workflow
     *
     * Optionally protect with a CRON_SECRET env variable.
     * Example cron-job.org URL: GET https://your-app.onrender.com/api/publish/cron/trigger
     * With secret:              GET https://your-app.onrender.com/api/publish/cron/trigger?secret=YOUR_SECRET
     */
    @Get('cron/trigger')
    async cronTrigger(@Headers('x-cron-secret') headerSecret?: string) {
        const expectedSecret = process.env.CRON_SECRET;
        if (expectedSecret && headerSecret !== expectedSecret) {
            throw new UnauthorizedException('Invalid cron secret');
        }
        await this.publishingService.checkAndPublishScheduledPosts();
        return { ok: true, triggered: new Date().toISOString() };
    }
}