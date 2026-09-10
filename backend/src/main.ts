import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { supabaseService } from './supabase/supabase.service';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Enable JSON and URL-encoded body parsing with 50mb limit for image uploads & AI multimodal payloads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

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
