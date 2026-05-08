import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Unified Messaging System Backend is running! 🚀';
  }
}
