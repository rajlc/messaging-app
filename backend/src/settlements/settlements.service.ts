import { Injectable, Logger } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

@Injectable()
export class SettlementsService {
    private readonly logger = new Logger(SettlementsService.name);

    constructor() {}

    async getRiders() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('users')
            .select('id, full_name, email')
            .or('is_delivery_person.eq.true,role.eq.rider');
        
        if (error) throw error;
        return data;
    }

    async createSettlement(riderId: string, amount: number, date: string, actorName: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .insert({
                rider_id: riderId,
                amount: amount,
                settlement_date: date,
                created_by: actorName
            })
            .select();
        
        if (error) throw error;
        return data[0];
    }

    async getAllSettlements() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .select(`
                *,
                rider:users!rider_id (
                    full_name
                )
            `)
            .order('settlement_date', { ascending: false });
        
        if (error) throw error;
        return data;
    }

    async getPendingSummary() {
        // 1. Get all riders
        const riders = await this.getRiders();
        
        const summary = await Promise.all(riders.map(async (rider) => {
            const supabase = supabaseService.getSupabaseClient();
            
            // 2. Pending Amount (Delivered, Delivery Failed, etc - excluding Packed/Shipped)
            const { data: pendingData } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('assigned_rider_id', rider.id)
                .in('order_status', ['Delivered', 'Delivery Failed', 'Return Process', 'Returned Delivered']);
            
            const pendingAmount = pendingData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

            // 3. Returned Amount (Delivery Failed)
            const { data: returnedData } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('assigned_rider_id', rider.id)
                .in('order_status', ['Delivery Failed', 'Return Process', 'Returned Delivered']);
            
            const returnedAmount = returnedData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

            // 4. Settled Amount
            const { data: settledData } = await supabase
                .from('rider_settlements')
                .select('amount')
                .eq('rider_id', rider.id);
            
            const settledAmount = settledData?.reduce((sum, s) => sum + Number(s.amount || 0), 0) || 0;
            
            // 5. Pending Orders Count
            const { count: ordersCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_rider_id', rider.id)
                .not('order_status', 'in', '("Delivered","delivered","Returned Delivered")');

            // 6. Assigned Stock Count
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

    async getMySummary(riderId: string) {
        const supabase = supabaseService.getSupabaseClient();
        
        // 1. Get rider details
        const { data: rider, error: riderError } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', riderId)
            .single();
        
        if (riderError) throw riderError;

        // 2. Pending Amount (Delivered, Delivery Failed, etc - excluding Packed/Shipped)
        const { data: pendingData } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('assigned_rider_id', riderId)
            .in('order_status', ['Delivered', 'Delivery Failed', 'Return Process', 'Returned Delivered']);
        
        const pendingAmount = pendingData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

        // 3. Returned Amount (Delivery Failed)
        const { data: returnedData } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('assigned_rider_id', riderId)
            .in('order_status', ['Delivery Failed', 'Return Process', 'Returned Delivered']);
        
        const returnedAmount = returnedData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

        // 4. Settled Amount
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

    async getDeliveryReport(startDate?: string, endDate?: string, riderId?: string) {
        const supabase = supabaseService.getSupabaseClient();
        
        // 1. Get all "Delivered" events from history
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
        
        if (startDate) query = query.gte('changed_at', `${startDate}T00:00:00`);
        if (endDate) query = query.lte('changed_at', `${endDate}T23:59:59`);

        const { data: history, error } = await query;
        if (error) throw error;

        // 2. Process and Group by Date and Rider
        const reportMap = new Map<string, any>();

        history.forEach((h: any) => {
            const order = h.order;
            if (!order || !order.assigned_rider_id) return;
            
            // Only count if the order is still in Delivered status
            if (order.order_status?.toLowerCase() !== 'delivered') return;
            
            // Filter by rider if provided
            if (riderId && order.assigned_rider_id !== riderId) return;

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

        // Convert map to array and sort by date desc
        return Array.from(reportMap.values()).sort((a, b) => b.date.localeCompare(a.date));
    }

    async updateSettlement(id: string, amount: number, date: string, actorName: string) {
        // 1. Check if it exists and is within 24 hours
        const { data: existing, error: fetchError } = await supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .select('created_at')
            .eq('id', id)
            .single();
        
        if (fetchError || !existing) throw new Error('Settlement not found');
        
        const created = new Date(existing.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 24) {
            throw new Error('Settlements can only be modified within 24 hours of creation');
        }

        const { data, error } = await supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .update({
                amount: amount,
                settlement_date: date,
                updated_by: actorName,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data[0];
    }

    async deleteSettlement(id: string) {
        // 1. Check if it exists and is within 24 hours
        const { data: existing, error: fetchError } = await supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .select('created_at')
            .eq('id', id)
            .single();
        
        if (fetchError || !existing) throw new Error('Settlement not found');
        
        const created = new Date(existing.created_at);
        const now = new Date();
        const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 24) {
            throw new Error('Settlements can only be deleted within 24 hours of creation');
        }

        const { error } = await supabaseService.getSupabaseClient()
            .from('rider_settlements')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    }
}
