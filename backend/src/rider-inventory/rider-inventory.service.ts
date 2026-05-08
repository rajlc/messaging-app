import { Injectable, Logger } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class RiderInventoryService {
    private readonly logger = new Logger(RiderInventoryService.name);

    constructor(
        private readonly ordersService: OrdersService
    ) { }

    async assignStock(assignmentData: any) {
        const { rider_id, product_name, quantity, amount, assigned_by } = assignmentData;

        const { data, error } = await supabaseService.getSupabaseClient()
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

    async getMyStock(riderId: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
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
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('rider_inventory')
            .select('*, users!rider_id(full_name, email)')
            .order('assigned_at', { ascending: false });

        if (error) {
            this.logger.error(`Failed to fetch all rider stock: ${error.message}`);
            throw error;
        }

        return data;
    }

    async updateStockStatus(id: string, status: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
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

    async recordQuickSale(riderId: string, saleData: any, riderName: string = 'Rider') {
        const { rider_inventory_id, customerName, phoneNumber, address, quantity, amount } = saleData;
        const qty = parseInt(quantity) || 1;
        const totalAmount = parseFloat(amount) || 0;

        // 1. Get the inventory item
        const { data: inventoryItem, error: invError } = await supabaseService.getSupabaseClient()
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

        // 2. Create the order
        const orderNumber = `QS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Prepare package description
        const shortName = inventoryItem.product_name.length > 20 
            ? inventoryItem.product_name.substring(0, 17) + '...' 
            : inventoryItem.product_name;
        const packageDesc = `${qty}, ${shortName}`;

        const { data: order, error: orderError } = await supabaseService.getSupabaseClient()
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

        // 3. Create Audit Trail
        try {
            await this.ordersService.recordStatusHistory(
                order.id, 
                'Delivered', 
                `Sales by Rider (${riderName})`, 
                `Quick sale created and delivered by rider ${riderName}. Items: ${packageDesc}`
            );
        } catch (auditError) {
            this.logger.error(`Failed to record audit trail: ${auditError.message}`);
        }

        // 4. Update inventory quantity
        const newQty = inventoryItem.quantity - qty;
        const newStatus = newQty <= 0 ? 'sold' : 'assigned';

        const { error: updateError } = await supabaseService.getSupabaseClient()
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
}
