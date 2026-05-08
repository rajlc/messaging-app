import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { FacebookGraphService } from '../facebook/facebook-graph.service';

@Module({
    controllers: [CommentsController],
    providers: [CommentsService, FacebookGraphService],
    exports: [CommentsService]
})
export class CommentsModule { }
