import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FacebookService } from '../messaging/facebook.service';
export declare class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private facebookService;
    server: Server;
    constructor(facebookService: FacebookService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(data: any, client: Socket): Promise<void>;
    broadcastIncomingMessage(platform: string, message: any): void;
}
