import { RiderInventoryService } from './rider-inventory.service';
export declare class RiderInventoryController {
    private readonly riderInventoryService;
    constructor(riderInventoryService: RiderInventoryService);
    assignStock(body: any, req: any): Promise<any>;
    getMyStock(req: any): Promise<any[]>;
    getAllStock(req: any): Promise<any[]>;
    updateStatus(id: string, status: string, req: any): Promise<any>;
    quickSale(body: any, req: any): Promise<{
        order: any;
        inventory: any;
    }>;
}
