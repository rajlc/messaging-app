import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import axios from 'axios';
import { supabaseService } from '../supabase/supabase.service';
import { FacebookPublisher } from './publishers/facebook.publisher';
import { InstagramPublisher } from './publishers/instagram.publisher';
import { TikTokPublisher } from './publishers/tiktok.publisher';
import { CreatePostDto, PlatformType, PostStatus } from './publishing.types';

@Injectable()
export class PublishingService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PublishingService.name);
    private schedulerInterval: NodeJS.Timeout | null = null;
    private isCheckingScheduled = false;

    constructor(
        private readonly fbPublisher: FacebookPublisher,
        private readonly igPublisher: InstagramPublisher,
        private readonly ttPublisher: TikTokPublisher,
    ) {}

    private get supabase() {
        return supabaseService.getClient();
    }

    onModuleInit() {
        this.logger.log('[PublishingService] Initializing background scheduler for scheduled posts (every 30 seconds)...');
        // Initial check on server start
        setTimeout(() => this.checkAndPublishScheduledPosts(), 3000);
        // Periodic check every 30 seconds
        this.schedulerInterval = setInterval(() => {
            this.checkAndPublishScheduledPosts();
        }, 30 * 1000);
    }

    onModuleDestroy() {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
    }

    /**
     * Periodically check for scheduled posts that have reached or passed their scheduled time
     */
    async checkAndPublishScheduledPosts() {
        if (this.isCheckingScheduled) return;
        this.isCheckingScheduled = true;
        try {
            const now = new Date().toISOString();
            const { data: duePosts, error } = await this.supabase
                .from('social_posts')
                .select('id, scheduled_at, status')
                .eq('status', 'scheduled')
                .lte('scheduled_at', now);

            if (error) {
                this.logger.error(`[PublishingService] Error querying scheduled posts: ${error.message}`);
                return;
            }

            if (duePosts && duePosts.length > 0) {
                this.logger.log(`[PublishingService] Found ${duePosts.length} scheduled post(s) ready to publish!`);
                for (const p of duePosts) {
                    this.logger.log(`[PublishingService] Triggering auto-publish for scheduled post ${p.id} (scheduled for ${p.scheduled_at})`);
                    // Mark as queued first to prevent concurrent execution
                    await this.supabase.from('social_posts').update({
                        status: 'queued',
                        updated_at: new Date().toISOString()
                    }).eq('id', p.id);

                    // Execute publishing asynchronously
                    this.executePublishing(p.id).catch(err => {
                        this.logger.error(`[PublishingService] Error executing scheduled post ${p.id}: ${err.message}`);
                    });
                }
            }
        } catch (e: any) {
            this.logger.error(`[PublishingService] Scheduled check exception: ${e.message}`);
        } finally {
            this.isCheckingScheduled = false;
        }
    }

    /**
     * Get all posts with their targets
     */
    async getPosts() {
        // Eagerly trigger check on fetch as well
        this.checkAndPublishScheduledPosts().catch(() => {});

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
                platform_content: { ...(dto.platformContent || {}), is_synced: false, origin: 'webapp' },
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
        // 1. Fetch post first to verify whether it is a synced external post and get media_url
        const { data: post } = await this.supabase
            .from('social_posts')
            .select('media_url, platform_content')
            .eq('id', id)
            .maybeSingle();

        if (!post) {
            throw new NotFoundException(`Post with ID ${id} not found`);
        }

        const isSynced = post.platform_content?.is_synced === true || post.platform_content?.origin === 'platform_sync';
        if (isSynced) {
            throw new BadRequestException('Posts synced directly from external platforms cannot be deleted from the webapp.');
        }

        try {
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

    /**
     * Sync previous/existing posts directly from Facebook Pages, Instagram & TikTok
     */
    async syncExternalPosts(targetPageId?: string, targetPlatform?: string) {
        this.logger.log(`[PublishingService] Syncing external posts... (filter platform: ${targetPlatform || 'all'}, filter page: ${targetPageId || 'all'})`);

        // Helper functions for matching
        const cleanText = (t?: string) => (t || '').replace(/#[\w_]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const captionsMatch = (c1?: string, c2?: string) => {
            const s1 = cleanText(c1);
            const s2 = cleanText(c2);
            if (!s1 || !s2) return false;
            if (s1 === s2) return true;
            const minLen = Math.min(s1.length, s2.length, 25);
            return s1.slice(0, minLen) === s2.slice(0, minLen);
        };
        const timestampsClose = (t1?: string, t2?: string, maxMinutes = 240) => {
            if (!t1 || !t2) return false;
            const d1 = new Date(t1).getTime();
            const d2 = new Date(t2).getTime();
            if (isNaN(d1) || isNaN(d2)) return false;
            return Math.abs(d1 - d2) <= maxMinutes * 60 * 1000;
        };
        const extractReelId = (url?: string) => {
            if (!url) return null;
            const match = url.match(/(?:reel|videos|posts|p)\/([\w\-]+)/);
            return match ? match[1] : null;
        };

        // Load all existing posts and targets from database
        const { data: existingPostsData } = await this.supabase
            .from('social_posts')
            .select(`
                *,
                targets:social_post_targets(*)
            `);
        const existingPosts: any[] = existingPostsData || [];

        const existingIds = new Set<string>();
        for (const p of existingPosts) {
            for (const t of p.targets || []) {
                if (t.platform_post_id) {
                    existingIds.add(t.platform_post_id);
                    if (t.platform_post_id.includes('_')) {
                        existingIds.add(t.platform_post_id.split('_')[1]);
                    }
                }
            }
        }

        let query = this.supabase.from('pages').select('*');
        if (targetPageId && targetPageId !== 'all') {
            query = query.eq('id', targetPageId);
        } else if (targetPlatform && targetPlatform !== 'all') {
            query = query.eq('platform', targetPlatform);
        }
        const { data: pages } = await query;
        if (!pages || pages.length === 0) {
            return { syncedCount: 0, message: 'No active connected pages found' };
        }

        let newSynced = 0;

        for (const page of pages) {
            if (!page.access_token || page.access_token === 'none') continue;

            if (page.platform === 'facebook') {
                try {
                    const res = await axios.get(`https://graph.facebook.com/v21.0/${page.page_id}/posts`, {
                        params: {
                            fields: 'id,message,created_time,full_picture,attachments{media_type,media,unshimmed_url},permalink_url',
                            limit: 50,
                            access_token: page.access_token
                        }
                    });
                    const fbPosts = res.data?.data || [];

                    const liveIds = new Set<string>();
                    const livePermalinks: string[] = [];
                    const liveCaptions: string[] = [];

                    for (const fp of fbPosts) {
                        const rawId = fp.id;
                        const shortId = fp.id.includes('_') ? fp.id.split('_')[1] : fp.id;
                        const reelId = extractReelId(fp.permalink_url);

                        liveIds.add(rawId);
                        if (shortId) liveIds.add(shortId);
                        if (reelId) liveIds.add(reelId);
                        if (fp.permalink_url) livePermalinks.push(fp.permalink_url);
                        if (fp.message) liveCaptions.push(fp.message);

                        // De-duplication check: does this post match an existing post created from webapp or DB?
                        let matchedPost = existingPosts.find((p: any) => {
                            // 1. Direct ID match on targets
                            const hasId = p.targets?.some((t: any) =>
                                t.platform_post_id && (
                                    t.platform_post_id === rawId ||
                                    t.platform_post_id === shortId ||
                                    (reelId && t.platform_post_id === reelId)
                                )
                            );
                            if (hasId) return true;

                            // 2. Permalink contains existing target platform_post_id
                            if (fp.permalink_url && p.targets?.some((t: any) => t.platform_post_id && fp.permalink_url.includes(t.platform_post_id))) {
                                return true;
                            }

                            // 3. Caption + Timestamp similarity (posted within 4 hours)
                            if (captionsMatch(p.caption, fp.message) && timestampsClose(p.created_at, fp.created_time, 240)) {
                                return true;
                            }

                            return false;
                        });

                        if (matchedPost) {
                            // Already exists — ensure target has live feed ID and is marked success
                            let target = matchedPost.targets?.find((t: any) =>
                                t.platform === 'facebook' && (t.page_id === page.id || t.page_name === page.page_name)
                            );

                            if (target) {
                                if (target.platform_post_id !== rawId || target.status !== 'success') {
                                    await this.supabase.from('social_post_targets').update({
                                        platform_post_id: rawId,
                                        status: 'success',
                                        published_at: fp.created_time,
                                        updated_at: new Date().toISOString()
                                    }).eq('id', target.id);
                                    target.platform_post_id = rawId;
                                    target.status = 'success';
                                }
                            } else {
                                const { data: newTarget } = await this.supabase.from('social_post_targets').insert({
                                    post_id: matchedPost.id,
                                    page_id: page.id,
                                    platform: 'facebook',
                                    page_name: page.page_name,
                                    status: 'success',
                                    platform_post_id: rawId,
                                    published_at: fp.created_time
                                }).select().single();
                                if (newTarget) {
                                    matchedPost.targets = matchedPost.targets || [];
                                    matchedPost.targets.push(newTarget);
                                }
                            }
                            existingIds.add(rawId);
                            if (shortId) existingIds.add(shortId);
                            continue;
                        }

                        // Completely new external post
                        const caption = fp.message || '';
                        const mediaUrl = fp.attachments?.data?.[0]?.media?.image?.src || fp.full_picture || null;
                        const isVideo = fp.attachments?.data?.[0]?.media_type === 'video';
                        const mediaType = isVideo ? 'video' : (mediaUrl ? 'photo' : 'none');

                        const { data: newPost, error: postErr } = await this.supabase
                            .from('social_posts')
                            .insert({
                                caption: caption,
                                media_url: mediaUrl,
                                media_type: mediaType,
                                status: 'published',
                                platform_content: { is_synced: true, origin: 'platform_sync' },
                                created_at: fp.created_time,
                                updated_at: fp.created_time
                            })
                            .select()
                            .single();

                        if (postErr) {
                            this.logger.error(`[PublishingService] Sync insert error: ${postErr.message}`);
                            continue;
                        }

                        const { data: createdTarget } = await this.supabase.from('social_post_targets').insert({
                            post_id: newPost.id,
                            page_id: page.id,
                            platform: 'facebook',
                            page_name: page.page_name,
                            status: 'success',
                            platform_post_id: rawId,
                            published_at: fp.created_time
                        }).select().single();

                        newPost.targets = [createdTarget];
                        existingPosts.push(newPost);
                        existingIds.add(rawId);
                        if (shortId) existingIds.add(shortId);
                        newSynced++;
                    }

                    // Live feed verification: check webapp posts that targeted this page
                    for (const p of existingPosts) {
                        const target = p.targets?.find((t: any) =>
                            t.platform === 'facebook' && (t.page_id === page.id || t.page_name === page.page_name)
                        );
                        if (target && target.status === 'success') {
                            const ageMinutes = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60);
                            // Only check posts created more than 10 minutes ago
                            if (ageMinutes > 10) {
                                const foundInLive = liveIds.has(target.platform_post_id) ||
                                    (target.platform_post_id && liveIds.has(target.platform_post_id.split('_')[1])) ||
                                    (target.platform_post_id && livePermalinks.some(u => u.includes(target.platform_post_id))) ||
                                    liveCaptions.some(c => captionsMatch(p.caption, c));

                                if (!foundInLive) {
                                    this.logger.log(`[PublishingService] Target ${target.id} on post ${p.id} not found on Facebook live feed. Marking as not published / failed.`);
                                    await this.supabase.from('social_post_targets').update({
                                        status: 'failed',
                                        error_message: 'Post not found in page feed (deleted or unpublished).',
                                        updated_at: new Date().toISOString()
                                    }).eq('id', target.id);
                                    target.status = 'failed';

                                    const allFailed = (p.targets || []).every((t: any) => t.status === 'failed');
                                    if (allFailed) {
                                        await this.supabase.from('social_posts').update({
                                            status: 'failed',
                                            updated_at: new Date().toISOString()
                                        }).eq('id', p.id);
                                        p.status = 'failed';
                                    }
                                }
                            }
                        }
                    }

                } catch (err: any) {
                    const isTokenError = err.response?.data?.error?.code === 190 || err.response?.status === 400;
                    if (isTokenError) {
                        this.logger.log(`[PublishingService] Facebook page ${page.page_name} token expired or requires reconnect.`);
                    } else {
                        this.logger.warn(`[PublishingService] Failed to sync Facebook page ${page.page_name}: ${err.message}`);
                    }
                }
            } else if (page.platform === 'instagram') {
                try {
                    const isIgToken = page.access_token.startsWith('IG');
                    const base = isIgToken ? 'https://graph.instagram.com/v21.0' : 'https://graph.facebook.com/v21.0';
                    const endpoint = isIgToken ? `${base}/me/media` : `${base}/${page.page_id}/media`;

                    const res = await axios.get(endpoint, {
                        params: {
                            fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
                            limit: 50,
                            access_token: page.access_token
                        }
                    });
                    const igPosts = res.data?.data || [];

                    const liveIds = new Set<string>();
                    const liveCaptions: string[] = [];

                    for (const ip of igPosts) {
                        liveIds.add(ip.id);
                        if (ip.caption) liveCaptions.push(ip.caption);

                        // De-duplication check
                        let matchedPost = existingPosts.find((p: any) => {
                            const hasId = p.targets?.some((t: any) => t.platform_post_id === ip.id);
                            if (hasId) return true;
                            if (captionsMatch(p.caption, ip.caption) && timestampsClose(p.created_at, ip.timestamp, 240)) {
                                return true;
                            }
                            return false;
                        });

                        if (matchedPost) {
                            let target = matchedPost.targets?.find((t: any) =>
                                t.platform === 'instagram' && (t.page_id === page.id || t.page_name === page.page_name)
                            );
                            if (target) {
                                if (target.platform_post_id !== ip.id || target.status !== 'success') {
                                    await this.supabase.from('social_post_targets').update({
                                        platform_post_id: ip.id,
                                        status: 'success',
                                        published_at: ip.timestamp,
                                        updated_at: new Date().toISOString()
                                    }).eq('id', target.id);
                                    target.platform_post_id = ip.id;
                                    target.status = 'success';
                                }
                            } else {
                                const { data: newTarget } = await this.supabase.from('social_post_targets').insert({
                                    post_id: matchedPost.id,
                                    page_id: page.id,
                                    platform: 'instagram',
                                    page_name: page.page_name,
                                    status: 'success',
                                    platform_post_id: ip.id,
                                    published_at: ip.timestamp
                                }).select().single();
                                if (newTarget) {
                                    matchedPost.targets = matchedPost.targets || [];
                                    matchedPost.targets.push(newTarget);
                                }
                            }
                            existingIds.add(ip.id);
                            continue;
                        }

                        // Completely new Instagram post
                        const caption = ip.caption || '';
                        const mediaUrl = ip.media_url || ip.thumbnail_url || null;
                        const mediaType = ip.media_type === 'VIDEO' ? 'video' : (mediaUrl ? 'photo' : 'none');

                        const { data: newPost, error: postErr } = await this.supabase
                            .from('social_posts')
                            .insert({
                                caption: caption,
                                media_url: mediaUrl,
                                media_type: mediaType,
                                status: 'published',
                                platform_content: { is_synced: true, origin: 'platform_sync' },
                                created_at: ip.timestamp,
                                updated_at: ip.timestamp
                            })
                            .select()
                            .single();

                        if (postErr) {
                            this.logger.error(`[PublishingService] Sync insert error: ${postErr.message}`);
                            continue;
                        }

                        const { data: createdTarget } = await this.supabase.from('social_post_targets').insert({
                            post_id: newPost.id,
                            page_id: page.id,
                            platform: 'instagram',
                            page_name: page.page_name,
                            status: 'success',
                            platform_post_id: ip.id,
                            published_at: ip.timestamp
                        }).select().single();

                        newPost.targets = [createdTarget];
                        existingPosts.push(newPost);
                        existingIds.add(ip.id);
                        newSynced++;
                    }

                    // Live feed verification for Instagram
                    for (const p of existingPosts) {
                        const target = p.targets?.find((t: any) =>
                            t.platform === 'instagram' && (t.page_id === page.id || t.page_name === page.page_name)
                        );
                        if (target && target.status === 'success') {
                            const ageMinutes = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60);
                            if (ageMinutes > 10) {
                                const foundInLive = liveIds.has(target.platform_post_id) ||
                                    liveCaptions.some(c => captionsMatch(p.caption, c));

                                if (!foundInLive) {
                                    this.logger.log(`[PublishingService] Target ${target.id} on post ${p.id} not found on Instagram feed. Marking as not published / failed.`);
                                    await this.supabase.from('social_post_targets').update({
                                        status: 'failed',
                                        error_message: 'Post not found in Instagram feed (deleted or unpublished).',
                                        updated_at: new Date().toISOString()
                                    }).eq('id', target.id);
                                    target.status = 'failed';

                                    const allFailed = (p.targets || []).every((t: any) => t.status === 'failed');
                                    if (allFailed) {
                                        await this.supabase.from('social_posts').update({
                                            status: 'failed',
                                            updated_at: new Date().toISOString()
                                        }).eq('id', p.id);
                                        p.status = 'failed';
                                    }
                                }
                            }
                        }
                    }

                } catch (err: any) {
                    this.logger.warn(`[PublishingService] Failed to sync Instagram ${page.page_name}: ${err.message}`);
                }
            } else if (page.platform === 'tiktok') {
                try {
                    const res = await axios.post(
                        'https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link,share_url',
                        { max_count: 20 },
                        {
                            headers: {
                                Authorization: `Bearer ${page.access_token}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                    const ttVideos = res.data?.data?.videos || [];
                    for (const tv of ttVideos) {
                        if (existingIds.has(tv.id)) continue;
                        const caption = tv.video_description || tv.title || '';
                        const mediaUrl = tv.cover_image_url || null;

                        const { data: newPost, error: postErr } = await this.supabase
                            .from('social_posts')
                            .insert({
                                caption: caption,
                                media_url: mediaUrl,
                                media_type: 'video',
                                status: 'published',
                                platform_content: { is_synced: true, origin: 'platform_sync' },
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            })
                            .select()
                            .single();

                        if (!postErr && newPost) {
                            await this.supabase.from('social_post_targets').insert({
                                post_id: newPost.id,
                                page_id: page.id,
                                platform: 'tiktok',
                                page_name: page.page_name,
                                status: 'success',
                                platform_post_id: tv.id,
                                published_at: new Date().toISOString(),
                            });
                            existingIds.add(tv.id);
                            newSynced++;
                        }
                    }
                } catch (err: any) {
                    this.logger.log(`[PublishingService] TikTok sync note: ${err.response?.data?.error?.message || err.message}`);
                }
            }
        }

        this.logger.log(`[PublishingService] Sync finished! Synced ${newSynced} new external posts.`);
        return { syncedCount: newSynced };
    }
}