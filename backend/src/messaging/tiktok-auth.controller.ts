import { Controller, Get, Query, Req, Res, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import axios from 'axios';
import * as crypto from 'crypto';
import { supabaseService } from '../supabase/supabase.service';

@Controller(['api/auth/tiktok', 'auth/tiktok'])
export class TikTokAuthController {
    private readonly logger = new Logger(TikTokAuthController.name);
    private readonly baseUrl = 'https://open.tiktokapis.com/v2';

    private getClientKey(): string {
        return process.env.TIKTOK_CLIENT_KEY || 'sbaw0vxyrl88absiib';
    }

    private getClientSecret(): string {
        return process.env.TIKTOK_CLIENT_SECRET || 'FsLSzB4m3It73dZZOyJ5LZ3IeAbtiX06';
    }

    private getRedirectUri(req: Request): string {
        if (process.env.TIKTOK_REDIRECT_URI) {
            return process.env.TIKTOK_REDIRECT_URI;
        }
        const host = req.headers.host || 'messages.bagmati.shop';
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        const proto = isLocal ? 'http' : 'https';
        return `${proto}://${host}/api/auth/tiktok/callback`;
    }

    /**
     * Step 1: Initiate TikTok OAuth Login
     */
    @Get('login')
    login(@Req() req: Request, @Res() res: Response) {
        const clientKey = this.getClientKey();
        const redirectUri = this.getRedirectUri(req);
        const csrfState = crypto.randomBytes(16).toString('hex');

        // Scopes: user profile info, video publish, video upload, video list
        const scope = 'user.info.basic,video.publish,video.upload,video.list';

        const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${encodeURIComponent(scope)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}`;

        this.logger.log(`[TikTok OAuth] Redirecting to TikTok Auth: ${authUrl}`);
        return res.redirect(authUrl);
    }

    /**
     * Step 2: Handle OAuth Callback from TikTok
     */
    @Get('callback')
    async callback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Query('error_description') errorDesc: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        this.logger.log(`[TikTok OAuth Callback] code: ${code ? 'received' : 'none'}, error: ${error || 'none'}`);

        if (error || !code) {
            const errMessage = errorDesc || error || 'Authorization was cancelled or failed';
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>TikTok Connection Failed</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
                    <div style="text-align: center; max-width: 420px; padding: 2rem; background: #1e293b; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                        <h2 style="margin-bottom: 0.5rem;">TikTok Connection Failed</h2>
                        <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.5;">${errMessage}</p>
                        <button onclick="window.close()" style="margin-top: 1.5rem; background: #ef4444; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer;">Close Window</button>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'TIKTOK_AUTH_ERROR', error: ${JSON.stringify(errMessage)} }, '*');
                        }
                    </script>
                </body>
                </html>
            `);
        }

        try {
            const clientKey = this.getClientKey();
            const clientSecret = this.getClientSecret();
            const redirectUri = this.getRedirectUri(req);

            this.logger.log(`[TikTok OAuth] Exchanging code with TikTok token endpoint...`);

            // 1. Exchange authorization code for access token
            const tokenParams = new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            });

            const tokenRes = await axios.post(`${this.baseUrl}/oauth/token/`, tokenParams.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.logger.log(`[TikTok OAuth] Token Response: ${JSON.stringify(tokenRes.data)}`);

            const raw = tokenRes.data || {};
            // In TikTok API v2, access_token and open_id are returned at the root of the JSON response
            const tokenData = (raw.access_token ? raw : raw.data) || {};

            if (raw.error) {
                const errMsg = raw.error_description || (typeof raw.error === 'object' ? raw.error?.message : raw.error);
                throw new Error(`TikTok Error: ${errMsg || 'OAuth failed'}`);
            }

            const accessToken = tokenData.access_token;
            const openId = tokenData.open_id;
            const refreshToken = tokenData.refresh_token;

            if (!accessToken) {
                const apiErr = raw.error_description || raw.message || 'No access token returned by TikTok';
                throw new Error(apiErr);
            }

            this.logger.log(`[TikTok OAuth] Access token obtained for Open ID: ${openId}`);

            // 2. Fetch User Profile
            let displayName = 'TikTok Account';
            let username = '';
            let avatarUrl = '';

            try {
                const userRes = await axios.get(`${this.baseUrl}/user/info/`, {
                    params: { fields: 'open_id,avatar_url,display_name' },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const user = userRes.data?.data?.user || userRes.data?.user || userRes.data?.data;
                if (user) {
                    displayName = user.display_name || displayName;
                    username = user.display_name || '';
                    avatarUrl = user.avatar_url || '';
                }
            } catch (err: any) {
                this.logger.warn(`[TikTok OAuth] Could not fetch profile details: ${err.message}`);
            }

            // 3. Save to database (`pages` table)
            const supabase = (supabaseService as any).supabase;
            const { data: existing } = await supabase
                .from('pages')
                .select('id')
                .eq('page_id', openId)
                .maybeSingle();

            if (existing) {
                await supabase.from('pages').update({
                    page_name: `${displayName} (TikTok)`,
                    username: username,
                    profile_picture_url: avatarUrl,
                    access_token: accessToken,
                    tiktok_open_id: openId,
                    tiktok_refresh_token: refreshToken,
                    platform: 'tiktok',
                    updated_at: new Date().toISOString()
                }).eq('id', existing.id);
            } else {
                await supabase.from('pages').insert({
                    page_name: `${displayName} (TikTok)`,
                    username: username,
                    profile_picture_url: avatarUrl,
                    page_id: openId,
                    access_token: accessToken,
                    tiktok_open_id: openId,
                    tiktok_refresh_token: refreshToken,
                    platform: 'tiktok',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            this.logger.log(`[TikTok OAuth] Successfully connected TikTok account: ${displayName} (@${username || openId})`);

            // 4. Return success HTML to close popup
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>TikTok Connected</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
                    <div style="text-align: center; max-width: 420px; padding: 2.5rem; background: #1e293b; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);">
                        <div style="width: 60px; height: 60px; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.25rem;">✓</div>
                        <h2 style="margin: 0 0 0.5rem; font-size: 1.4rem;">Connected Successfully!</h2>
                        <p style="color: #94a3b8; font-size: 0.95rem; margin: 0 0 1rem;">
                            TikTok account <b>${displayName}</b> (${username ? '@' + username : openId}) has been linked.
                        </p>
                        <p style="color: #64748b; font-size: 0.8rem;">Closing window in a moment…</p>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'TIKTOK_AUTH_SUCCESS', username: ${JSON.stringify(username || displayName)} }, '*');
                            setTimeout(() => { window.close(); }, 1500);
                        } else {
                            setTimeout(() => { window.location.href = '/settings'; }, 2000);
                        }
                    </script>
                </body>
                </html>
            `);
        } catch (err: any) {
            this.logger.error(`[TikTok OAuth Error]: ${err.message}`, err.response?.data);
            const resData = err.response?.data;
            const detail = resData?.error_description || resData?.error?.message || resData?.error || err.message;
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>TikTok Auth Error</title></head>
                <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
                    <div style="text-align: center; max-width: 450px; padding: 2rem; background: #1e293b; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                        <h2 style="margin-bottom: 0.5rem;">Token Exchange Failed</h2>
                        <p style="color: #ef4444; font-size: 0.9rem; line-height: 1.5; word-break: break-word;">${detail}</p>
                        <button onclick="window.close()" style="margin-top: 1.5rem; background: #64748b; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 0.75rem; font-weight: bold; cursor: pointer;">Close Window</button>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'TIKTOK_AUTH_ERROR', error: ${JSON.stringify(detail)} }, '*');
                        }
                    </script>
                </body>
                </html>
            `);
        }
    }
}
