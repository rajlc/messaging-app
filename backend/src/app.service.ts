import { Injectable, OnModuleInit } from '@nestjs/common';
import { supabaseService } from './supabase/supabase.service';

@Injectable()
export class AppService implements OnModuleInit {
  async onModuleInit() {
    try {
      console.log('Checking default pages...');
      const existing = await supabaseService.getPageByFacebookId('facebook_marketplace');
      if (!existing) {
        console.log('Creating default page "Facebook Marketplace"...');
        await supabaseService.createPage({
          platform: 'facebook_marketplace',
          pageName: 'Facebook Marketplace',
          pageId: 'facebook_marketplace',
          accessToken: 'none'
        });
        console.log('✅ Default page "Facebook Marketplace" created.');
      } else {
        console.log('Default page "Facebook Marketplace" already exists.');
      }
    } catch (e) {
      console.warn('Failed to seed default Facebook Marketplace page:', e.message);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
