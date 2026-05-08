import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FacebookService } from '../messaging/facebook.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private facebookService: FacebookService) { }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    console.log('Received message from frontend:', data);

    // Send message to Facebook if platform is facebook
    if (data.platform === 'facebook' && data.recipientId) {
      try {
        await this.facebookService.sendMessage(data.recipientId, data.text);
        console.log('✅ Message successfully sent to Facebook customer');
      } catch (error) {
        console.error('❌ Failed to send message to Facebook:', error.message);
      }
    }

    // Broadcast message to other clients or specific room
    this.server.emit('messageReceived', data);
  }

  // Helper to send message from backend to frontend
  broadcastIncomingMessage(platform: string, message: any) {
    console.log('📤 Broadcasting message to frontend via socket.io');
    console.log('Platform:', platform);
    console.log('Message:', message);
    console.log('Connected clients:', this.server.sockets.sockets.size);
    this.server.emit('incomingMessage', {
      platform,
      ...message,
      conversationId: message.conversationId // Explicitly include conversation UUID
    });
    console.log('✅ Message broadcast complete');
  }
}
