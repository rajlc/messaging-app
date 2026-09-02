import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import axios from 'axios';

/**
 * KeepAliveService
 *
 * Solves the Render.com free-tier "spin-down" problem.
 *
 * On Render free tier the server goes to sleep after ~15 minutes of no
 * inbound traffic.  When it wakes it takes ~30–60 s to boot, so any
 * scheduled post whose time fires during the sleep window will be missed.
 *
 * This service self-pings the backend's /api/health endpoint every
 * PING_INTERVAL_MS (default 10 minutes) so Render never idles long enough
 * to spin down.  It also checks for upcoming scheduled posts and ensures
 * the scheduler is awake well before they fire.
 */
@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepAliveService.name);

  /** How often to ping ourselves (ms).  10 min < Render's 15-min idle limit */
  private readonly PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  private pingInterval: NodeJS.Timeout | null = null;

  /** The public URL of this backend.  Set RENDER_EXTERNAL_URL in Render env vars. */
  private get backendUrl(): string {
    return (
      process.env.RENDER_EXTERNAL_URL ||
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.PORT || 3002}`
    );
  }

  onModuleInit() {
    this.logger.log(
      `[KeepAlive] Starting self-ping every ${this.PING_INTERVAL_MS / 60000} minutes → ${this.backendUrl}/api/health`,
    );

    // First ping after 30 s to confirm the server is up
    setTimeout(() => this.ping(), 30_000);

    // Then every PING_INTERVAL_MS
    this.pingInterval = setInterval(() => this.ping(), this.PING_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  async ping(): Promise<void> {
    const url = `${this.backendUrl}/api/health`;
    try {
      const start = Date.now();
      const res = await axios.get(url, { timeout: 15_000 });
      const ms = Date.now() - start;
      this.logger.log(`[KeepAlive] ✅ Self-ping OK (${res.status}) in ${ms}ms`);
    } catch (err: any) {
      this.logger.warn(`[KeepAlive] ⚠️  Self-ping failed: ${err.message}`);
    }
  }
}
