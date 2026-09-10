import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * MessageRetentionService
 *
 * Runs a periodic check (every 6 hours) to auto-delete messages
 * older than the configured number of days if auto_delete_enabled is active.
 */
@Injectable()
export class MessageRetentionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MessageRetentionService.name);
    private intervalRef: NodeJS.Timeout | null = null;

    // Check interval: every 6 hours (6 * 60 * 60 * 1000)
    private readonly CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

    constructor(private readonly settingsService: SettingsService) {}

    onModuleInit() {
        this.logger.log('[MessageRetention] Service initialized. Initial check scheduled in 60s.');

        // Initial check after 60s
        setTimeout(() => this.runDailyCleanup(), 60_000);

        // Periodic check
        this.intervalRef = setInterval(() => this.runDailyCleanup(), this.CHECK_INTERVAL_MS);
    }

    onModuleDestroy() {
        if (this.intervalRef) {
            clearInterval(this.intervalRef);
            this.intervalRef = null;
        }
    }

    async runDailyCleanup() {
        try {
            const settings = await this.settingsService.getMessageRetentionSettings();
            if (!settings.auto_delete_enabled || !settings.auto_delete_days || settings.auto_delete_days <= 0) {
                return;
            }

            this.logger.log(`[MessageRetention] Auto-delete is enabled (${settings.auto_delete_days} days). Starting rolling clean-up...`);
            const result = await this.settingsService.cleanupMessagesByDays(settings.auto_delete_days);
            this.logger.log(`[MessageRetention] Rolling clean-up completed: ${result.deletedCount} messages deleted before ${result.cutoffIso}.`);
        } catch (error: any) {
            this.logger.error('[MessageRetention] Error running daily cleanup:', error.message || error);
        }
    }
}
