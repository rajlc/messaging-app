import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { supabaseService } from '../supabase/supabase.service';
import { AuthGuard } from '@nestjs/passport';
import * as path from 'path';

@UseGuards(AuthGuard('jwt'))
@Controller('api/upload')
export class UploadController {
    @Post()
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: 250 * 1024 * 1024, // 250 MB for high-res videos
        },
    }))
    async uploadFile(@UploadedFile() file: any) {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        try {
            // Sanitize file name for Supabase storage key (remove spaces, emojis, unicode symbols)
            const ext = path.extname(file.originalname || '').toLowerCase() || (file.mimetype?.startsWith('video/') ? '.mp4' : '.jpg');
            const rawBase = path.basename(file.originalname || 'media', ext);
            const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 40) || 'media';
            const fileName = `${Date.now()}_${safeBase}${ext}`;

            const publicUrl = await supabaseService.uploadFile(file.buffer, fileName, file.mimetype);

            return {
                url: publicUrl,
                success: true
            };
        } catch (error: any) {
            console.error('Upload failed:', error);
            throw new HttpException(`Upload failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

