import { forwardRef, Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
    imports: [forwardRef(() => MessagingModule)],
    providers: [MessagingGateway],
    exports: [MessagingGateway]
})
export class SocketModule { }
