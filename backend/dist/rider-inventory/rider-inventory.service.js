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
var RiderInventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderInventoryService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const orders_service_1 = require("../orders/orders.service");
let RiderInventoryService = RiderInventoryService_1 = class RiderInventoryService {
    ordersService;
    logger = new common_1.Logger(RiderInventoryService_1.name);
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async assignStock(assignmentData) {
        const { rider_id, product_name, quantity, amount, assigned_by } = assignmentData;
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .insert({
            rider_id,
            product_name,
            quantity,
            amount,
            assigned_by,
            status: 'assigned'
        })
            .select()
            .single();
        if (error) {
            this.logger.error(`Failed to assign stock: ${error.message}`);
            throw error;
        }
        return data;
    }
    async getMyStock(riderId) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .select('*')
            .eq('rider_id', riderId)
            .in('status', ['assigned', 'return_pending']);
        if (error) {
            this.logger.error(`Failed to fetch stock for rider ${riderId}: ${error.message}`);
            throw error;
        }
        return data;
    }
    async getAllRiderStock() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .select('*, users!rider_id(full_name, email)')
            .order('assigned_at', { ascending: false });
        if (error) {
            this.logger.error(`Failed to fetch all rider stock: ${error.message}`);
            throw error;
        }
        return data;
    }
    async updateStockStatus(id, status) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            this.logger.error(`Failed to update stock status: ${error.message}`);
            throw error;
        }
        return data;
    }
    async recordQuickSale(riderId, saleData, riderName = 'Rider') {
        const { rider_inventory_id, customerName, phoneNumber, address, quantity, amount } = saleData;
        const qty = parseInt(quantity) || 1;
        const totalAmount = parseFloat(amount) || 0;
        const { data: inventoryItem, error: invError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .select('*')
            .eq('id', rider_inventory_id)
            .single();
        if (invError || !inventoryItem) {
            throw new Error('Inventory item not found');
        }
        if (inventoryItem.rider_id !== riderId) {
            throw new Error('Unauthorized: This stock does not belong to you');
        }
        if (inventoryItem.quantity < qty) {
            throw new Error(`Insufficient stock. Available: ${inventoryItem.quantity}`);
        }
        const orderNumber = `QS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const shortName = inventoryItem.product_name.length > 20
            ? inventoryItem.product_name.substring(0, 17) + '...'
            : inventoryItem.product_name;
        const packageDesc = `${qty}, ${shortName}`;
        const { data: order, error: orderError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .insert({
            order_number: orderNumber,
            customer_name: customerName || 'User',
            phone_number: phoneNumber || '1111111111',
            address: address || 'address',
            platform: 'Others',
            page_name: 'Others',
            order_status: 'Delivered',
            total_amount: totalAmount,
            items: [{
                    product_name: inventoryItem.product_name,
                    qty: qty,
                    amount: totalAmount / qty,
                    total_amount: totalAmount
                }],
            package_description: packageDesc,
            courier_provider: 'self',
            logistic_name: 'Self Delivered',
            delivery_charge: 0,
            courier_delivery_fee: 100,
            assigned_rider_id: riderId,
            assigned_at: new Date().toISOString(),
            assigned_by: 'Quick Sale',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (orderError) {
            this.logger.error(`Failed to create quick sale order: ${orderError.message}`);
            throw orderError;
        }
        try {
            await this.ordersService.recordStatusHistory(order.id, 'Delivered', `Sales by Rider (${riderName})`, `Quick sale created and delivered by rider ${riderName}. Items: ${packageDesc}`);
        }
        catch (auditError) {
            this.logger.error(`Failed to record audit trail: ${auditError.message}`);
        }
        const newQty = inventoryItem.quantity - qty;
        const newStatus = newQty <= 0 ? 'sold' : 'assigned';
        const { error: updateError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .update({
            quantity: newQty,
            status: newStatus,
            updated_at: new Date().toISOString()
        })
            .eq('id', rider_inventory_id);
        if (updateError) {
            this.logger.error(`Failed to update stock quantity after sale: ${updateError.message}`);
        }
        return { order, inventory: { ...inventoryItem, quantity: newQty, status: newStatus } };
    }
};
exports.RiderInventoryService = RiderInventoryService;
exports.RiderInventoryService = RiderInventoryService = RiderInventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], RiderInventoryService);
//# sourceMappingURL=rider-inventory.service.js.map