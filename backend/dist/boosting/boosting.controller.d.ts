import { BoostingService } from './boosting.service';
export declare class BoostingController {
    private readonly boostingService;
    constructor(boostingService: BoostingService);
    findAll(): Promise<{
        success: boolean;
        data: any[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    create(body: any): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
}
