export declare class FacebookGraphService {
    private readonly logger;
    private readonly graphApiUrl;
    replyToComment(commentId: string, message: string, accessToken: string): Promise<any>;
    hideComment(commentId: string, accessToken: string): Promise<any>;
    sendPrivateMessage(userId: string, message: string, accessToken: string, pageId: string): Promise<any>;
    getCommentDetails(commentId: string, accessToken: string): Promise<any>;
}
