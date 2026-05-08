import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LogisticsService } from './logistics/logistics.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const logisticsService = app.get(LogisticsService);

    console.log('--- Pathao Area Diagnostic ---');
    try {
        const cities = await logisticsService.getCities();
        console.log(`Total Cities: ${cities.length}`);

        // Find cities that might be the ones the user is missing
        const interestingCities = cities.filter(c =>
            c.city_name.includes('Amuwa') ||
            c.city_name.includes('Amargadi') ||
            c.city_name.includes('Aadarshnagar')
        );

        console.log('Interesting Cities found:', JSON.stringify(interestingCities, null, 2));

        for (const city of interestingCities) {
            console.log(`\nChecking City: ${city.city_name} (ID: ${city.city_id})`);
            const zones = await logisticsService.getZones(city.city_id);
            console.log(`  Zones found: ${zones.length}`);

            if (zones.length === 0) {
                console.log(`  [!] City ${city.city_name} HAS NO ZONES. Current logic would skip this as an area.`);
            }

            for (const zone of zones) {
                console.log(`    Checking Zone: ${zone.zone_name} (ID: ${zone.zone_id})`);
                const areas = await logisticsService.getAreas(zone.zone_id);
                console.log(`      Areas found: ${areas.length}`);
                if (areas.length === 0) {
                    console.log(`      [!] Zone ${zone.zone_name} HAS NO AREAS. Current logic would skip this as an area.`);
                }
            }
        }
    } catch (e) {
        console.error('Diagnostic failed:', e);
    } finally {
        await app.close();
    }
}

bootstrap();
