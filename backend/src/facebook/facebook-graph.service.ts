import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FacebookGraphService {
    private readonly logger = new Logger(FacebookGraphService.name);
    private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';

    async replyToComment(commentId: string, message: string, accessToken: string): Promise<any> {
        try {
            const response = await axios.post(
                `${this.graphApiUrl}/${commentId}/comments`,
                {
                    message: message
                },
                {
                    params: {
                        access_token: accessToken
                    }
                }
            );

            this.logger.log(`Replied to comment ${commentId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to reply to comment ${commentId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async hideComment(commentId: string, accessToken: string): Promise<any> {
        try {
            const response = await axios.post(
                `${this.graphApiUrl}/${commentId}`,
                {
                    is_hidden: true
                },
                {
                    params: {
                        access_token: accessToken
                    }
                }
            );

            this.logger.log(`Hid comment ${commentId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to hide comment ${commentId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async sendPrivateMessage(userId: string, message: string, accessToken: string, pageId: string): Promise<any> {
        try {
            const response = await axios.post(
                `${this.graphApiUrl}/${pageId}/messages`,
                {
                    recipient: { id: userId },
                    message: { text: message }
                },
                {
                    params: {
                        access_token: accessToken
                    }
                }
            );

            this.logger.log(`Sent private message to user ${userId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send private message to ${userId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async getCommentDetails(commentId: string, accessToken: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.graphApiUrl}/${commentId}`,
                {
                    params: {
                        access_token: accessToken,
                        fields: 'id,message,from,created_time,post,permalink_url'
                    }
                }
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get comment details ${commentId}:`, error.response?.data || error.message);
            throw error;
        }
    }
}
