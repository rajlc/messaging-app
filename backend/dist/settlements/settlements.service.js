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
var SettlementsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let SettlementsService = SettlementsService_1 = class SettlementsService {
    logger = new common_1.Logger(SettlementsService_1.name);
    constructor() { }
    async getRiders() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('users')
            .select('id, full_name, email')
            .or('is_delivery_person.eq.true,role.eq.rider');
        if (error)
            throw error;
        return data;
    }
    async createSettlement(riderId, amount, date, actorName) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .insert({
            rider_id: riderId,
            amount: amount,
            settlement_date: date,
            created_by: actorName
        })
            .select();
        if (error)
            throw error;
        return data[0];
    }
    async getAllSettlements() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .select(`
                *,
                rider:users!rider_id (
                    full_name
                )
            `)
            .order('settlement_date', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getPendingSummary() {
        const riders = await this.getRiders();
        const summary = await Promise.all(riders.map(async (rider) => {
            const supabase = supabase_service_1.supabaseService.getSupabaseClient();
            const { data: pendingData } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('assigned_rider_id', rider.id)
                .in('order_status', ['Delivered', 'Delivery Failed', 'Return Process', 'Returned Delivered']);
            const pendingAmount = pendingData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
            const { data: returnedData } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('assigned_rider_id', rider.id)
                .in('order_status', ['Delivery Failed', 'Return Process', 'Returned Delivered']);
            const returnedAmount = returnedData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
            const { data: settledData } = await supabase
                .from('rider_settlements')
                .select('amount')
                .eq('rider_id', rider.id);
            const settledAmount = settledData?.reduce((sum, s) => sum + Number(s.amount || 0), 0) || 0;
            const { count: ordersCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_rider_id', rider.id)
                .not('order_status', 'in', '("Delivered","delivered","Returned Delivered")');
            const { count: stockCount } = await supabase
                .from('rider_inventory')
                .select('*', { count: 'exact', head: true })
                .eq('rider_id', rider.id)
                .in('status', ['assigned', 'return_pending']);
            return {
                rider_id: rider.id,
                rider_name: rider.full_name,
                pending_amount: pendingAmount,
                returned_amount: returnedAmount,
                settled_amount: settledAmount,
                net_pending_settlement: pendingAmount - returnedAmount - settledAmount,
                pending_orders_count: ordersCount || 0,
                assigned_stock_count: stockCount || 0
            };
        }));
        return summary;
    }
    async getMySummary(riderId) {
        const supabase = supabase_service_1.supabaseService.getSupabaseClient();
        const { data: rider, error: riderError } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', riderId)
            .single();
        if (riderError)
            throw riderError;
        const { data: pendingData } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('assigned_rider_id', riderId)
            .in('order_status', ['Delivered', 'Delivery Failed', 'Return Process', 'Returned Delivered']);
        const pendingAmount = pendingData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
        const { data: returnedData } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('assigned_rider_id', riderId)
            .in('order_status', ['Delivery Failed', 'Return Process', 'Returned Delivered']);
        const returnedAmount = returnedData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
        const { data: settledData } = await supabase
            .from('rider_settlements')
            .select('amount')
            .eq('rider_id', riderId);
        const settledAmount = settledData?.reduce((sum, s) => sum + Number(s.amount || 0), 0) || 0;
        return {
            rider_name: rider.full_name,
            pending_amount: pendingAmount,
            returned_amount: returnedAmount,
            settled_amount: settledAmount,
            net_pending_settlement: pendingAmount - returnedAmount - settledAmount
        };
    }
    async getDeliveryReport(startDate, endDate, riderId) {
        const supabase = supabase_service_1.supabaseService.getSupabaseClient();
        let query = supabase
            .from('order_status_history')
            .select(`
                changed_at,
                order:orders!order_id (
                    id,
                    total_amount,
                    order_status,
                    assigned_rider_id,
                    rider:users!assigned_rider_id (
                        full_name
                    )
                )
            `)
            .eq('status', 'Delivered');
        if (startDate)
            query = query.gte('changed_at', `${startDate}T00:00:00`);
        if (endDate)
            query = query.lte('changed_at', `${endDate}T23:59:59`);
        const { data: history, error } = await query;
        if (error)
            throw error;
        const reportMap = new Map();
        history.forEach((h) => {
            const order = h.order;
            if (!order || !order.assigned_rider_id)
                return;
            if (order.order_status?.toLowerCase() !== 'delivered')
                return;
            if (riderId && order.assigned_rider_id !== riderId)
                return;
            const date = h.changed_at.split('T')[0];
            const riderName = order.rider?.full_name || 'Unknown Rider';
            const key = `${date}_${order.assigned_rider_id}`;
            if (!reportMap.has(key)) {
                reportMap.set(key, {
                    date,
                    rider_name: riderName,
                    parcel_qty: 0,
                    delivery_amount: 0
                });
            }
            const entry = reportMap.get(key);
            entry.parcel_qty += 1;
            entry.delivery_amount += Number(order.total_amount || 0);
        });
        return Array.from(reportMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    }
    async updateSettlement(id, amount, date, actorName) {
        const { data: existing, error: fetchError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .select('created_at')
            .eq('id', id)
            .single();
        if (fetchError || !existing)
            throw new Error('Settlement not found');
        const created = new Date(existing.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) {
            throw new Error('Settlements can only be modified within 24 hours of creation');
        }
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .update({
            amount: amount,
            settlement_date: date,
            updated_by: actorName,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select();
        if (error)
            throw error;
        return data[0];
    }
    async deleteSettlement(id) {
        const { data: existing, error: fetchError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .select('created_at')
            .eq('id', id)
            .single();
        if (fetchError || !existing)
            throw new Error('Settlement not found');
        const created = new Date(existing.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) {
            throw new Error('Settlements can only be deleted within 24 hours of creation');
        }
        const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return { success: true };
    }
};
exports.SettlementsService = SettlementsService;
exports.SettlementsService = SettlementsService = SettlementsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SettlementsService);
//# sourceMappingURL=settlements.service.js.map