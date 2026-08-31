-- Migration 030: Create Social Media Publishing tables & columns

-- 1. Social Posts Table
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    media_url TEXT,
    media_type TEXT DEFAULT 'none', -- 'none', 'photo', 'video'
    status TEXT DEFAULT 'draft',    -- 'draft', 'queued', 'processing', 'partial', 'published', 'failed', 'scheduled'
    platform_content JSONB DEFAULT '{}'::jsonb, -- custom per-platform overrides: { facebook: { caption, hashtags }, instagram: {...}, tiktok: {...} }
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Social Post Targets Table (one entry per target account per post)
CREATE TABLE IF NOT EXISTS social_post_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,         -- 'facebook', 'instagram', 'tiktok'
    page_name TEXT,
    status TEXT DEFAULT 'pending',  -- 'pending', 'queued', 'processing', 'success', 'failed', 'retrying'
    platform_post_id TEXT,          -- ID returned by Facebook / Instagram / TikTok
    error_message TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_post_targets_post_id ON social_post_targets(post_id);
CREATE INDEX IF NOT EXISTS idx_social_post_targets_platform ON social_post_targets(platform);

-- 3. Extend pages table with TikTok support & encrypted token columns
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tiktok_open_id TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tiktok_refresh_token TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tiktok_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tiktok_refresh_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS username TEXT;