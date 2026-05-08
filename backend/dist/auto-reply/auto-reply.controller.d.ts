import { AutoReplyService } from './auto-reply.service';
export declare class AutoReplyController {
    private readonly autoReplyService;
    constructor(autoReplyService: AutoReplyService);
    createRule(data: any): Promise<any>;
    getRules(pageId: string): Promise<any[]>;
    updateRule(id: string, data: any): Promise<any>;
    deleteRule(id: string): Promise<boolean>;
}
