import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        access_token: string;
        user: any;
    }>;
    signup(body: any): Promise<{
        success: boolean;
        message: string;
        user: {
            email: any;
            status: any;
        };
    }>;
}
