import * as express from 'express';
import { LogisticsService } from './logistics.service';
import { PickDropService } from './pick-drop.service';
import { NcmService } from './ncm.service';
export declare class LogisticsWebhookController {
    private readonly logisticsService;
    private readonly pickDropService;
    private readonly ncmService;
    constructor(logisticsService: LogisticsService, pickDropService: PickDropService, ncmService: NcmService);
    handlePathaoWebhook(payload: any, headers: any, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
    verifyPickDropWebhook(): Promise<{
        message: string;
        expectedPath: string;
        method: string;
    }>;
    handlePickDropWebhook(payload: any, headers: any, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
    handleNcmWebhook(payload: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
}
