import { OnModuleInit } from '@nestjs/common';
export declare class AppService implements OnModuleInit {
    onModuleInit(): Promise<void>;
    getHello(): string;
}
