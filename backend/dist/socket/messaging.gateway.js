"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const facebook_service_1 = require("../messaging/facebook.service");
let MessagingGateway = class MessagingGateway {
    facebookService;
    server;
    constructor(facebookService) {
        this.facebookService = facebookService;
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
    async handleMessage(data, client) {
        console.log('Received message from frontend:', data);
        if (data.platform === 'facebook' && data.recipientId) {
            try {
                await this.facebookService.sendMessage(data.recipientId, data.text);
                console.log('✅ Message successfully sent to Facebook customer');
            }
            catch (error) {
                console.error('❌ Failed to send message to Facebook:', error.message);
            }
        }
        this.server.emit('messageReceived', data);
    }
    broadcastIncomingMessage(platform, message) {
        console.log('📤 Broadcasting message to frontend via socket.io');
        console.log('Platform:', platform);
        console.log('Message:', message);
        console.log('Connected clients:', this.server.sockets.sockets.size);
        this.server.emit('incomingMessage', {
            platform,
            ...message,
            conversationId: message.conversationId
        });
        console.log('✅ Message broadcast complete');
    }
};
exports.MessagingGateway = MessagingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MessagingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], MessagingGateway.prototype, "handleMessage", null);
exports.MessagingGateway = MessagingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [facebook_service_1.FacebookService])
], MessagingGateway);
//# sourceMappingURL=messaging.gateway.js.map