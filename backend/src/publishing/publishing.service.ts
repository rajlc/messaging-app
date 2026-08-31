import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import { FacebookPublisher } from './publishers/facebook.publisher';
import { InstagramPublisher } from './publishers/instagram.publisher';
import { TikTokPublisher } from './publishers/tiktok.publisher';
import { CreatePostDto, PlatformType, PostStatus } from './publishing.types';

@Injectable()
export class PublishingService {
    private readonly logger = new Logger(PublishingService.name);

    constructor(
        private readonly fbPublisher: FacebookPublisher,
        private readonly igPublisher: InstagramPublisher,
        private readonly ttPublisher: TikTokPublisher,
    ) {}

    private get supabase() {
        return supabaseService.getClient();
    }

    /**
     * Get all posts with their targets
     */
    async getPosts() {
        const { data: posts, error } = await this.supabase
            .from('social_posts')
            .select(`
                *,
                targets:social_post_targets(*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error('[PublishingService] Error fetching posts:', error.message);
            // Fallback gracefully if table not yet created
            return [];
        }

        return posts || [];
    }

    /**
     * Get a single post by ID
     */
    async getPostById(id: string) {
        const { data: post, error } = await this.supabase
            .from('social_posts')
            .select(`
                *,
                targets:social_post_targets(*)
            `)
            .eq('id', id)
            .single();

        if (error || !post) {
            throw new NotFoundException(`Post with ID ${id} not found`);
        }

        return post;
    }

    /**
     * Create a post (Draft or Immediate Publish or Scheduled)
     */
    async createPost(dto: CreatePostDto) {
        const isScheduled = !!dto.scheduledAt && new Date(dto.scheduledAt) > new Date();
        const initialStatus: PostStatus = dto.action === 'draft'
            ? 'draft'
            : isScheduled
                ? 'scheduled'
                : 'queued';

        // 0. If reusing an existing post, do not duplicate in manage post! Add new targets directly to it.
        if (dto.sourcePostId) {
            const { data: existingPost } = await this.supabase
                .from('social_posts')
                .select('*, targets:social_post_targets(*)')
                .eq('id', dto.sourcePostId)
                .maybeSingle();

            if (existingPost) {
                this.logger.log(`[PublishingService] Reusing existing post ${existingPost.id} without duplication.`);

                // Update post content if changed
                await this.supabase.from('social_posts').update({
                    caption: dto.caption ?? existingPost.caption,
                    hashtags: dto.hashtags ?? existingPost.hashtags,
                    media_url: dto.mediaUrl ?? existingPost.media_url,
                    media_type: dto.mediaType ?? existingPost.media_type,
                    platform_content: dto.platformContent ? { ...existingPost.platform_content, ...dto.platformContent } : existingPost.platform_content,
                    status: dto.action === 'publish' ? (isScheduled ? 'scheduled' : 'queued') : existingPost.status,
                    scheduled_at: isScheduled ? new Date(dto.scheduledAt!).toISOString() : existingPost.scheduled_at,
                    updated_at: new Date().toISOString(),
                }).eq('id', existingPost.id);

                // Fetch pages
                const { data: pages } = await this.supabase.from('pages').select('id, page_name, page_id, platform');
                const pageMap = new Map();
                (pages || []).forEach(p => {
                    pageMap.set(p.id, p);
                    if (p.page_id) {
                        pageMap.set(p.page_id, p);
                        pageMap.set(p.page_id.trim(), p);
                    }
                });

                const existingTargets = existingPost.targets || [];
                const newTargetInserts: any[] = [];

                for (const t of dto.targets || []) {
                    const cleanTargetId = typeof t.pageId === 'string' ? t.pageId.trim() : t.pageId;
                    const page = pageMap.get(cleanTargetId);
                    if (!page) continue;

                    const match = existingTargets.find((et: any) => et.page_id === page.id);
                    if (match) {
                        if (match.status === 'failed' && dto.action === 'publish') {
                            await this.supabase.from('social_post_targets').update({
                                status: 'pending',
                                error_message: null,
                                updated_at: new Date().toISOString(),
                            }).eq('id', match.id);
                        }
                    } else {
                        newTargetInserts.push({
                            post_id: existingPost.id,
                            page_id: page.id,
                            platform: page.platform || t.platform,
                            page_name: page.page_name,
                            status: 'pending',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        });
                    }
                }

                if (newTargetInserts.length > 0) {
                    await this.supabase.from('social_post_targets').insert(newTargetInserts);
                }

                if (dto.action === 'publish' && !isScheduled) {
                    await this.executePublishing(existingPost.id);
                }

                return this.getPostById(existingPost.id);
            }
        }

        // 1. Insert social_posts row
        const { data: post, error: postErr } = await this.supabase
            .from('social_posts')
            .insert({
                caption: dto.caption || '',
                hashtags: dto.hashtags || [],
                media_url: dto.mediaUrl || null,
                media_type: dto.mediaType || 'none',
                status: initialStatus,
                platform_content: dto.platformContent || {},
                scheduled_at: isScheduled ? new Date(dto.scheduledAt!).toISOString() : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (postErr) {
            this.logger.error('[PublishingService] Failed to create social post:', postErr.message);
            throw new Error(`Failed to create post: ${postErr.message}`);
        }

        // 2. Fetch pages info to populate target names (index by both UUID and platform page_id)
        const { data: pages } = await this.supabase.from('pages').select('id, page_name, page_id, platform');
        const pageMap = new Map();
        (pages || []).forEach(p => {
            pageMap.set(p.id, p);
            if (p.page_id) {
                pageMap.set(p.page_id, p);
                pageMap.set(p.page_id.trim(), p);
            }
        });

        // 3. Insert social_post_targets rows
        const targetInserts = (dto.targets || [])
            .map(t => {
                const cleanTargetId = typeof t.pageId === 'string' ? t.pageId.trim() : t.pageId;
                const page = pageMap.get(cleanTargetId);
                if (!page) {
                    this.logger.warn(`[PublishingService] Target with pageId '${t.pageId}' not found in active pages; skipping.`);
                    return null;
                }
                return {
                    post_id: post.id,
                    page_id: page.id,
                    platform: page.platform || t.platform,
                    page_name: page.page_name,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            })
            .filter((t): t is NonNullable<typeof t> => t !== null);

        if (targetInserts.length > 0) {
            const { error: targetErr } = await this.supabase
                .from('social_post_targets')
                .insert(targetInserts);

            if (targetErr) {
                this.logger.error('[PublishingService] Failed to insert targets:', targetErr.message);
                throw new Error(`Failed to save post targets: ${targetErr.message}`);
            }
        }

        // 4. If action is 'publish' and not scheduled, execute publishing
        if (dto.action === 'publish' && !isScheduled) {
            await this.executePublishing(post.id);
        }

        return this.getPostById(post.id);
    }

    /**
     * Update an existing post (e.g. edit draft or publish draft)
     */
    async updatePost(id: string, dto: CreatePostDto) {
        const isScheduled = !!dto.scheduledAt && new Date(dto.scheduledAt) > new Date();
        const nextStatus: PostStatus = dto.action === 'publish'
            ? isScheduled ? 'scheduled' : 'queued'
            : 'draft';

        // 1. Update post fields
        const { data: updated, error } = await this.supabase
            .from('social_posts')
            .update({
                caption: dto.caption,
                hashtags: dto.hashtags,
                media_url: dto.mediaUrl || null,
                media_type: dto.mediaType || 'none',
                status: nextStatus,
                platform_content: dto.platformContent || {},
                scheduled_at: isScheduled ? new Date(dto.scheduledAt!).toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update post: ${error.message}`);
        }

        // 2. Replace targets
        await this.supabase.from('social_post_targets').delete().eq('post_id', id);

        const { data: pages } = await this.supabase.from('pages').select('id, page_name, page_id, platform');
        const pageMap = new Map();
        (pages || []).forEach(p => {
            pageMap.set(p.id, p);
            if (p.page_id) {
                pageMap.set(p.page_id, p);
                pageMap.set(p.page_id.trim(), p);
            }
        });

        const targetInserts = (dto.targets || [])
            .map(t => {
                const cleanTargetId = typeof t.pageId === 'string' ? t.pageId.trim() : t.pageId;
                const page = pageMap.get(cleanTargetId);
                if (!page) {
                    this.logger.warn(`[PublishingService] Target with pageId '${t.pageId}' not found in active pages; skipping.`);
                    return null;
                }
                return {
                    post_id: id,
                    page_id: page.id,
                    platform: page.platform || t.platform,
                    page_name: page.page_name,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            })
            .filter((t): t is NonNullable<typeof t> => t !== null);

        if (targetInserts.length > 0) {
            const { error: targetErr } = await this.supabase
                .from('social_post_targets')
                .insert(targetInserts);

            if (targetErr) {
                throw new Error(`Failed to save post targets: ${targetErr.message}`);
            }
        }

        // 3. If action is 'publish' and not scheduled, execute publishing immediately
        if (dto.action === 'publish' && !isScheduled) {
            await this.executePublishing(id);
        }

        return this.getPostById(id);
    }

    /**
     * Delete a post (cascades targets) and deletes media from Supabase Storage to free up space
     */
    async deletePost(id: string) {
        try {
            // 1. Fetch post first to get media_url
            const { data: post } = await this.supabase
                .from('social_posts')
                .select('media_url')
                .eq('id', id)
                .maybeSingle();

            if (post?.media_url) {
                // Check if other posts are still referencing this exact media_url
                const { data: otherPosts } = await this.supabase
                    .from('social_posts')
                    .select('id')
                    .eq('media_url', post.media_url)
                    .neq('id', id);

                if (otherPosts && otherPosts.length > 0) {
                    this.logger.log(`[PublishingService] Media is still in use by ${otherPosts.length} other post(s); preserving storage file.`);
                } else {
                    // Extract file path from Supabase storage public URL
                    // e.g. .../storage/v1/object/public/content/1788165277688_file.jpg
                    const match = post.media_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
                    if (match) {
                        const bucket = match[1];
                        const filePath = decodeURIComponent(match[2]);
                        this.logger.log(`[PublishingService] Removing media from storage bucket '${bucket}': ${filePath}`);
                        const { error: storageErr } = await this.supabase.storage.from(bucket).remove([filePath]);
                        if (storageErr) {
                            this.logger.warn(`[PublishingService] Storage deletion warning: ${storageErr.message}`);
                        } else {
                            this.logger.log(`[PublishingService] Storage file removed successfully: ${filePath}`);
                        }
                    }
                }
            }
        } catch (e: any) {
            this.logger.warn(`[PublishingService] Error removing post media from storage: ${e.message}`);
        }

        // 2. Delete database record (cascades social_post_targets)
        const { error } = await this.supabase.from('social_posts').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    }

    /**
     * Core publishing executor: processes each target independently
     */
    async executePublishing(postId: string) {
        this.logger.log(`[PublishingService] Starting publishing execution for post: ${postId}`);

        // Update post status to processing
        await this.supabase.from('social_posts').update({ status: 'processing' }).eq('id', postId);

        const post = await this.getPostById(postId);
        const targets = post.targets || [];

        if (targets.length === 0) {
            this.logger.warn(`[PublishingService] Post ${postId} has no targets to publish to! Marking as failed.`);
            await this.supabase.from('social_posts').update({
                status: 'failed',
                updated_at: new Date().toISOString(),
            }).eq('id', postId);
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const target of targets) {
            // If already successfully published, skip and count towards overall success!
            if (target.status === 'success') {
                successCount++;
                continue;
            }

            await this.supabase.from('social_post_targets').update({ status: 'processing' }).eq('id', target.id);

            try {
                // Fetch page credentials by either UUID or platform page_id
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.page_id || '');
                let pageQuery = this.supabase.from('pages').select('*');
                if (isUuid) {
                    pageQuery = pageQuery.eq('id', target.page_id);
                } else {
                    pageQuery = pageQuery.eq('page_id', target.page_id);
                }
                const { data: page, error: pageErr } = await pageQuery.maybeSingle();

                if (!page || pageErr) {
                    throw new Error(`Connected account ${target.page_id} not found: ${pageErr?.message || 'not in database'}`);
                }

                // Check for per-platform customized caption/hashtags
                const custom = post.platform_content?.[target.platform as PlatformType];
                const resolvedCaption = custom?.caption?.trim() ? custom.caption : post.caption;
                const resolvedHashtags = custom?.hashtags?.trim() ? custom.hashtags : (post.hashtags || []).join(' ');
                const fullText = [resolvedCaption, resolvedHashtags].filter(Boolean).join('\n\n');

                let result;
                if (target.platform === 'facebook') {
                    result = await this.fbPublisher.publish({
                        pageId: page.page_id,
                        accessToken: page.access_token,
                        caption: fullText,
                        mediaUrl: post.media_url,
                        mediaType: post.media_type,
                    });
                } else if (target.platform === 'instagram') {
                    result = await this.igPublisher.publish({
                        pageId: page.page_id,
                        accessToken: page.access_token,
                        caption: fullText,
                        mediaUrl: post.media_url,
                        mediaType: post.media_type,
                    });
                } else if (target.platform === 'tiktok') {
                    result = await this.ttPublisher.publish({
                        accessToken: page.access_token,
                        caption: fullText,
                        mediaUrl: post.media_url,
                        mediaType: post.media_type,
                        options: custom,
                    });
                } else {
                    throw new Error(`Unsupported platform: ${target.platform}`);
                }

                if (result.success) {
                    successCount++;
                    await this.supabase.from('social_post_targets').update({
                        status: 'success',
                        platform_post_id: result.platformPostId,
                        published_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }).eq('id', target.id);
                } else {
                    failCount++;
                    await this.supabase.from('social_post_targets').update({
                        status: 'failed',
                        error_message: result.errorMessage || 'Publishing failed',
                        updated_at: new Date().toISOString(),
                    }).eq('id', target.id);
                }

            } catch (err: any) {
                failCount++;
                this.logger.error(`[PublishingService] Target ${target.id} failed:`, err.message);
                await this.supabase.from('social_post_targets').update({
                    status: 'failed',
                    error_message: err.message,
                    updated_at: new Date().toISOString(),
                }).eq('id', target.id);
            }
        }

        // Aggregate overall post status
        let finalStatus: PostStatus = 'published';
        if (successCount === 0 && failCount > 0) {
            finalStatus = 'failed';
        } else if (failCount > 0) {
            finalStatus = 'partial';
        } else if (successCount === 0 && failCount === 0) {
            finalStatus = 'failed';
        }

        await this.supabase.from('social_posts').update({
            status: finalStatus,
            updated_at: new Date().toISOString(),
        }).eq('id', postId);

        this.logger.log(`[PublishingService] Completed post ${postId} with status: ${finalStatus} (${successCount} succeeded, ${failCount} failed)`);
    }
}