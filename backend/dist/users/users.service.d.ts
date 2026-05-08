export declare enum UserRole {
    ADMIN = "admin",
    EDITOR = "editor",
    USER = "user",
    RIDER = "rider"
}
export declare enum UserStatus {
    PENDING = "pending",
    ACTIVE = "active",
    DEACTIVE = "deactive"
}
export declare class UsersService {
    constructor();
    findByEmail(email: string): Promise<any>;
    findById(id: string): Promise<any>;
    create(userData: any): Promise<any>;
    update(id: string, updateData: any): Promise<any>;
    findAll(): Promise<any[]>;
}
