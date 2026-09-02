import { Controller, Get } from '@nestjs/common';

/**
 * HealthController
 *
 * Exposes GET /api/health — a lightweight endpoint used by:
 *  1. The KeepAliveService (self-ping every 10 min) to keep Render awake.
 *  2. External uptime monitors (UptimeRobot, BetterUptime, etc.) if configured.
 *  3. The frontend KeepAlive hook to confirm the backend is alive before
 *     a scheduled post fires.
 *
 * This endpoint is intentionally NOT guarded by JWT so monitors can call it.
 */
@Controller('api/health')
export class HealthController {
  @Get()
  health(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
