import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { supabaseService } from '../supabase/supabase.service';

@Controller('api/upload')
export class UploadController {
    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: any) {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        try {
            const fileName = `${Date.now()}-${file.originalname}`;
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
