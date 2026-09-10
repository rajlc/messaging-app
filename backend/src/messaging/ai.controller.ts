import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('test')
    async testConnection(
        @Body() body: { provider: 'openai' | 'gemini'; apiKey: string; model: string }
    ) {
        return this.aiService.testConnection(body);
    }

    @Post('generate-post')
    async generateSocialPost(
        @Body() body: {
            mode?: 'details' | 'image' | 'combined';
            productName?: string;
            productDetails?: string;
            extraNotes?: string;
            imageUrl?: string;
            imageBase64?: string;
            mimeType?: string;
            tone?: string;
            provider?: 'gemini' | 'openai';
            model?: string;
        }
    ) {
        return this.aiService.generateSocialPost(body);
    }
}
