import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<any>;
    updateProfile(req: any, body: any): Promise<any>;
    checkActiveStatus(req: any): Promise<{
        isActive: boolean;
        status: any;
    }>;
    getStaff(req: any): Promise<any[]>;
    updateStaff(req: any, body: any): Promise<any>;
}
