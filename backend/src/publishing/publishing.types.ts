export type PlatformType = 'facebook' | 'instagram' | 'tiktok';
export type MediaType = 'none' | 'photo' | 'video';
export type PostStatus = 'draft' | 'queued' | 'processing' | 'partial' | 'published' | 'failed' | 'scheduled';
export type TargetStatus = 'pending' | 'queued' | 'processing' | 'success' | 'failed' | 'retrying';

export interface PlatformContentOverride {
    caption?: string;
    hashtags?: string;
    privacy?: string;
    allowDuet?: boolean;
    allowStitch?: boolean;
}

export interface CreatePostDto {
    sourcePostId?: string;
    caption?: string;
    hashtags?: string[];
    mediaUrl?: string;
    mediaType?: MediaType;
    targets: Array<{
        pageId: string;
        platform: PlatformType;
    }>;
    platformContent?: Record<PlatformType, PlatformContentOverride>;
    scheduledAt?: string;
    action?: 'draft' | 'publish';
}

export interface PublishResult {
    success: boolean;
    platformPostId?: string;
    errorMessage?: string;
    rawData?: any;
}