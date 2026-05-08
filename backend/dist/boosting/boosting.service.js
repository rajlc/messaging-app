"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostingService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let BoostingService = class BoostingService {
    async findAll() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('boosting_costs')
            .select('*')
            .order('date', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async create(data) {
        const { data: result, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('boosting_costs')
            .insert({
            date: data.date,
            platform: data.platform,
            page_name: data.page_name,
            product_names: data.product_names || [],
            cost: data.cost,
        })
            .select()
            .single();
        if (error)
            throw error;
        return result;
    }
};
exports.BoostingService = BoostingService;
exports.BoostingService = BoostingService = __decorate([
    (0, common_1.Injectable)()
], BoostingService);
//# sourceMappingURL=boosting.service.js.map