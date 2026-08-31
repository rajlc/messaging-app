import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
}