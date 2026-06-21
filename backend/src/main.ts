import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { supabaseService } from './supabase/supabase.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Log all incoming requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend server is running on http://localhost:${port}`);

  // Trigger auto-fix task for Customer names asynchronously on boot
  supabaseService.autoFixCustomerNames().catch(err => {
    console.error('Error running startup auto-fix:', err);
  });
}
bootstrap();
