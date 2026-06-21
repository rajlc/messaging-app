"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const supabase_service_1 = require("./supabase/supabase.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: '*',
        credentials: true,
    });
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Backend server is running on http://localhost:${port}`);
    supabase_service_1.supabaseService.autoFixCustomerNames().catch(err => {
        console.error('Error running startup auto-fix:', err);
    });
}
bootstrap();
//# sourceMappingURL=main.js.map