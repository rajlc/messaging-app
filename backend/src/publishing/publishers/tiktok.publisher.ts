import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MediaType, PlatformContentOverride, PublishResult } from '../publishing.types';

@Injectable()
export class TikTokPublisher {
    private readonly logger = new Logger(TikTokPublisher.name);
    private readonly baseUrl = 'https://open.tiktokapis.com/v2';

    async publish(params: {
        accessToken: string;
        caption: string;
        mediaUrl?: string;
        mediaType: MediaType;
        options?: PlatformContentOverride;
    }): Promise<PublishResult> {
        const { accessToken, caption, mediaUrl, mediaType, options } = params;

        if (mediaType === 'none' || !mediaUrl) {
            return {
                success: false,
                errorMessage: 'TikTok requires a photo or video file.',
            };
        }

        try {
            if (mediaType === 'video') {
                // 1. Download video binary from storage
                this.logger.log(`[TikTok] Downloading video from storage: ${mediaUrl}`);
                const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                const videoBuffer = Buffer.from(mediaRes.data);
                const totalSize = videoBuffer.length;

                // 2. Initialize video upload via FILE_UPLOAD (bypasses URL domain ownership restrictions)
                const initUrl = `${this.baseUrl}/post/publish/inbox/video/init/`;
                const payload = {
                    post_info: {
                        title: caption?.slice(0, 150) || '',
                        privacy_level: options?.privacy || 'SELF_ONLY',
                        disable_duet: options?.allowDuet === false,
                        disable_stitch: options?.allowStitch === false,
                    },
                    source_info: {
                        source: 'FILE_UPLOAD',
                        video_size: totalSize,
                        chunk_size: totalSize,
                        total_chunk_count: 1,
                    },
                };

                this.logger.log(`[TikTok] Initializing FILE_UPLOAD (${totalSize} bytes)...`);
                const response = await axios.post(initUrl, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                });

                if (response.data?.error?.code && response.data.error.code !== 'ok') {
                    throw new Error(response.data.error.message || `TikTok API Error: ${response.data.error.code}`);
                }

                const publishId = response.data?.data?.publish_id;
                const uploadUrl = response.data?.data?.upload_url;

                if (!uploadUrl) {
                    throw new Error('No upload_url received from TikTok');
                }

                // 3. Upload binary chunks directly to TikTok upload_url
                this.logger.log(`[TikTok] Uploading video binary to TikTok upload_url...`);
                await axios.put(uploadUrl, videoBuffer, {
                    headers: {
                        'Content-Type': 'video/mp4',
                        'Content-Range': `bytes 0-${totalSize - 1}/${totalSize}`,
                        'Content-Length': totalSize.toString(),
                    },
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                });

                this.logger.log(`[TikTok] Video draft sent successfully! Publish ID: ${publishId}`);
                return {
                    success: true,
                    platformPostId: publishId,
                    rawData: response.data,
                };

            } else {
                // Photo post
                const initUrl = `${this.baseUrl}/post/publish/content/init/`;
                const payload = {
                    post_info: {
                        title: caption?.slice(0, 100) || '',
                        description: caption || '',
                    },
                    source_info: {
                        source: 'PULL_FROM_URL',
                        photo_images: [mediaUrl],
                    },
                    post_mode: 'DIRECT_POST',
                    media_type: 'PHOTO',
                };

                this.logger.log(`[TikTok] Sending photo to TikTok...`);
                const response = await axios.post(initUrl, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                });

                if (response.data?.error?.code && response.data.error.code !== 'ok') {
                    throw new Error(response.data.error.message || `TikTok API Error: ${response.data.error.code}`);
                }

                const publishId = response.data?.data?.publish_id;
                return {
                    success: true,
                    platformPostId: publishId,
                    rawData: response.data,
                };
            }
        } catch (error: any) {
            const ttError = error.response?.data?.error?.message || error.message;
            this.logger.error(`[TikTok] Publishing failed: ${ttError}`, error.response?.data);
            return {
                success: false,
                errorMessage: ttError,
                rawData: error.response?.data,
            };
        }
    }
}