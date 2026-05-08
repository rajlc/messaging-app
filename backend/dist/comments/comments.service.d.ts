export interface PostComment {
    id: string;
    comment_id: string;
    post_id: string;
    post_message?: string;
    customer_id: string;
    customer_name: string;
    comment_text: string;
    platform: string;
    page_id?: string;
    is_hidden: boolean;
    is_replied: boolean;
    customer_profile_pic?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateCommentDto {
    comment_id: string;
    post_id: string;
    post_message?: string;
    customer_id: string;
    customer_name: string;
    comment_text: string;
    platform: string;
    page_id?: string;
    customer_profile_pic?: string;
}
export declare class CommentsService {
    private readonly logger;
    getAllComments(): Promise<PostComment[]>;
    getCommentById(id: string): Promise<PostComment | null>;
    getCommentsByCustomer(customerId: string): Promise<PostComment[]>;
    createComment(dto: CreateCommentDto): Promise<PostComment>;
    markAsReplied(id: string): Promise<void>;
    markAsHidden(id: string): Promise<void>;
    deleteComment(id: string): Promise<void>;
}
