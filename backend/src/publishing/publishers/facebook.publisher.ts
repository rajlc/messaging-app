import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MediaType, PublishResult } from '../publishing.types';

@Injectable()
export class FacebookPublisher {
    private readonly logger = new Logger(FacebookPublisher.name);
    private readonly graphApiVersion = 'v26.0';

    async publish(params: {
        pageId: string;
        accessToken: string;
        caption: string;
        mediaUrl?: string;
        mediaType: MediaType;
    }): Promise<PublishResult> {
        const { pageId, accessToken, caption, mediaUrl, mediaType } = params;

        try {
            if (mediaType === 'photo' && mediaUrl) {
                // Post Photo to Page
                const url = `https://graph.facebook.com/${this.graphApiVersion}/${pageId}/photos`;
                const response = await axios.post(url, null, {
                    params: {
                        url: mediaUrl,
                        caption: caption || '',
                        access_token: accessToken,
                    },
                });

                const platformPostId = response.data.post_id || response.data.id;
                this.logger.log(`[Facebook] Published photo post: ${platformPostId}`);
                return { success: true, platformPostId, rawData: response.data };

            } else if (mediaType === 'video' && mediaUrl) {
                // Post Video to Page
                const url = `https://graph.facebook.com/${this.graphApiVersion}/${pageId}/videos`;
                const response = await axios.post(url, null, {
                    params: {
                        file_url: mediaUrl,
                        description: caption || '',
                        access_token: accessToken,
                    },
                });

                const platformPostId = response.data.id;
                this.logger.log(`[Facebook] Published video post: ${platformPostId}`);
                return { success: true, platformPostId, rawData: response.data };

            } else {
                // Text-only Feed Post
                const url = `https://graph.facebook.com/${this.graphApiVersion}/${pageId}/feed`;
                const response = await axios.post(url, null, {
                    params: {
                        message: caption || '',
                        access_token: accessToken,
                    },
                });

                const platformPostId = response.data.id;
                this.logger.log(`[Facebook] Published text post: ${platformPostId}`);
                return { success: true, platformPostId, rawData: response.data };
            }
        } catch (error: any) {
            const fbError = error.response?.data?.error?.message || error.message;
            this.logger.error(`[Facebook] Publishing failed for page ${pageId}: ${fbError}`, error.response?.data);
            return {
                success: false,
                errorMessage: fbError,
                rawData: error.response?.data,
            };
        }
    }
}