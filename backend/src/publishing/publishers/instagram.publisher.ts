import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MediaType, PublishResult } from '../publishing.types';

@Injectable()
export class InstagramPublisher {
    private readonly logger = new Logger(InstagramPublisher.name);
    private readonly graphApiVersion = 'v26.0';

    async publish(params: {
        pageId: string; // IG business account ID or connected page ID
        accessToken: string;
        caption: string;
        mediaUrl?: string;
        mediaType: MediaType;
    }): Promise<PublishResult> {
        const { pageId, accessToken, caption, mediaUrl, mediaType } = params;

        if (mediaType === 'none' || !mediaUrl) {
            return {
                success: false,
                errorMessage: 'Instagram requires a photo or video. Text-only posts are not supported.',
            };
        }

        try {
            // First determine the IG Business User ID
            // If pageId is a FB page, try fetching linked instagram_business_account
            let igUserId = pageId;
            try {
                const pageCheck = await axios.get(`https://graph.facebook.com/${this.graphApiVersion}/${pageId}`, {
                    params: {
                        fields: 'instagram_business_account',
                        access_token: accessToken,
                    },
                });
                if (pageCheck.data?.instagram_business_account?.id) {
                    igUserId = pageCheck.data.instagram_business_account.id;
                    this.logger.log(`[Instagram] Resolved IG Business Account ID: ${igUserId} from FB Page: ${pageId}`);
                }
            } catch (err: any) {
                // pageId might already be the IG User ID directly
                this.logger.debug(`[Instagram] Using pageId directly as IG User ID: ${pageId}`);
            }

            // Step 1: Create Container
            const containerUrl = `https://graph.facebook.com/${this.graphApiVersion}/${igUserId}/media`;
            const containerParams: Record<string, any> = {
                caption: caption || '',
                access_token: accessToken,
            };

            if (mediaType === 'video') {
                containerParams.media_type = 'REELS';
                containerParams.video_url = mediaUrl;
            } else {
                containerParams.image_url = mediaUrl;
            }

            this.logger.log(`[Instagram] Creating container for ${igUserId} (${mediaType})...`);
            const containerRes = await axios.post(containerUrl, null, { params: containerParams });
            const containerId = containerRes.data.id;

            if (!containerId) {
                throw new Error('Failed to create media container on Instagram');
            }

            // Step 2: Poll container status (especially required for videos / reels)
            let isReady = false;
            let attempts = 0;
            const maxAttempts = 15;

            while (!isReady && attempts < maxAttempts) {
                attempts++;
                await new Promise(r => setTimeout(r, 2000)); // wait 2s

                const statusRes = await axios.get(`https://graph.facebook.com/${this.graphApiVersion}/${containerId}`, {
                    params: {
                        fields: 'status_code,status',
                        access_token: accessToken,
                    },
                });

                const statusCode = statusRes.data.status_code;
                this.logger.debug(`[Instagram] Container ${containerId} status: ${statusCode} (attempt ${attempts}/${maxAttempts})`);

                if (statusCode === 'FINISHED') {
                    isReady = true;
                } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
                    throw new Error(`Instagram media processing failed with status: ${statusCode}`);
                }
            }

            if (!isReady) {
                // If not finished after 30s, try publishing anyway or report timeout
                this.logger.warn(`[Instagram] Polling timed out for container ${containerId}, attempting publish...`);
            }

            // Step 3: Publish container
            const publishUrl = `https://graph.facebook.com/${this.graphApiVersion}/${igUserId}/media_publish`;
            const publishRes = await axios.post(publishUrl, null, {
                params: {
                    creation_id: containerId,
                    access_token: accessToken,
                },
            });

            const platformPostId = publishRes.data.id;
            this.logger.log(`[Instagram] Published successfully: ${platformPostId}`);
            return {
                success: true,
                platformPostId,
                rawData: publishRes.data,
            };

        } catch (error: any) {
            const igError = error.response?.data?.error?.message || error.message;
            this.logger.error(`[Instagram] Publishing failed for page ${pageId}: ${igError}`, error.response?.data);
            return {
                success: false,
                errorMessage: igError,
                rawData: error.response?.data,
            };
        }
    }
}