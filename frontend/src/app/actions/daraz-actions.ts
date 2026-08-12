'use server';

import { getInvSupabaseAdminClient } from '@/lib/inv-supabase';

export interface DarazOrderItemInput {
    seller_sku: string;
    product_name?: string;
    product_id?: string;
    quantity: number;
    amount: number;
    item_sequence?: number;
    seller_account?: string;
    item_status?: string;
}

export interface CreateDarazOrderPayload {
    order_number: string;
    tracking_number?: string;
    customer_name: string;
    order_date: string;
    order_status: string;
    seller_account?: string;
    remarks?: string;
    items: DarazOrderItemInput[];
}

export interface GetDarazOrdersParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sellerAccount?: string;
    unprintedOnly?: boolean;
    todayOnly?: boolean;
}

export async function getDarazOrdersAction(params: GetDarazOrdersParams = {}) {
    const {
        page = 1,
        limit = 1000,
        status = 'all',
        search = '',
        sellerAccount = 'all',
        unprintedOnly = false,
        todayOnly = false,
    } = params;

    const supabase = getInvSupabaseAdminClient();

    let query = supabase
        .from('daraz_orders')
        .select('*, daraz_order_items(*)', { count: 'exact' })
        .or('deleted.is.null,deleted.eq.false');

    // Seller Account Filter
    if (sellerAccount && sellerAccount !== 'all') {
        query = query.eq('seller_account', sellerAccount);
    }

    // Status Filter
    if (status && status !== 'all') {
        query = query.eq('order_status', status);
    }

    // Unprinted Filter
    if (unprintedOnly) {
        query = query.or('is_printed.is.null,is_printed.eq.false');
    }

    // Search Filter
    if (search.trim()) {
        const term = search.trim();
        query = query.or(`order_number.ilike.%${term}%,tracking_number.ilike.%${term}%,customer_name.ilike.%${term}%`);
    }

    // Today Only filter logic from inventory webapp
    if (todayOnly) {
        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00.000Z`;
        query = query.or(`order_status.eq.Pending,order_status.eq.Packed,order_status.eq."Ready to Ship",order_date.eq.${today},and(order_status.eq.Shipped,shipped_at.gte.${todayStart}),and(order_status.eq.Shipped,order_date.eq.${today}),and(order_status.eq.Shipped,created_at.gte.${todayStart})`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: rawOrders, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching Daraz orders:', error.message);
        throw new Error(error.message);
    }

    const orders = (rawOrders || []).map((order: any) => {
        const items = order.daraz_order_items || [];
        const firstItem = items[0];
        const firstProductName = firstItem?.product_name || firstItem?.seller_sku || 'Product Not Found';
        const itemCount = items.length;
        const totalQty = items.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0);
        const grandTotal = items.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0) || Number(order.total_amount || 0);

        const determinedSellerAccount =
            order.seller_account ||
            firstItem?.seller_account ||
            'Bagmati Traders';

        return {
            ...order,
            items,
            seller_account: determinedSellerAccount,
            first_product_name: firstProductName,
            item_count: itemCount,
            total_quantity: totalQty || order.total_quantity || 1,
            grand_total: grandTotal,
            total_amount: grandTotal,
            is_printed: Boolean(order.is_printed),
        };
    });

    return {
        orders,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

export async function getDarazOrderStatsAction(sellerAccount: string = 'all') {
    const supabase = getInvSupabaseAdminClient();
    const today = new Date().toISOString().split('T')[0];

    try {
        let query = supabase
            .from('daraz_orders')
            .select('order_status, order_date, created_at')
            .or('deleted.is.null,deleted.eq.false');

        if (sellerAccount && sellerAccount !== 'all') {
            query = query.eq('seller_account', sellerAccount);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching Daraz order stats:', error.message);
            return { pending: 0, packed: 0, readyToShip: 0, shipped: 0 };
        }

        const stats = {
            pending: 0,
            packed: 0,
            readyToShip: 0,
            shipped: 0,
        };

        (data || []).forEach((row: any) => {
            const st = (row.order_status || '').trim();
            if (st === 'Pending') stats.pending++;
            else if (st === 'Packed') stats.packed++;
            else if (st === 'Ready to Ship') stats.readyToShip++;
            else if (st === 'Shipped') stats.shipped++;
        });

        return stats;
    } catch (err: any) {
        console.error('Error in getDarazOrderStatsAction:', err);
        return { pending: 0, packed: 0, readyToShip: 0, shipped: 0 };
    }
}

export async function getOrdersStockInfoAction(orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) return {};

    const supabase = getInvSupabaseAdminClient();

    const { data: items } = await supabase
        .from('daraz_order_items')
        .select('order_id, seller_sku')
        .in('order_id', orderIds);

    if (!items || items.length === 0) return {};

    const skus = Array.from(new Set(items.map((i: any) => i.seller_sku?.trim()).filter(Boolean)));

    let stockMap: Record<string, { product_name: string; total_stock: number }> = {};
    if (skus.length > 0) {
        const { data: products } = await supabase
            .from('products')
            .select('product_name, current_stock, seller_sku1, seller_sku2, seller_sku3, seller_sku4')
            .or(skus.map((s) => `seller_sku1.eq.${s},seller_sku2.eq.${s},seller_sku3.eq.${s},seller_sku4.eq.${s}`).join(','));

        (products || []).forEach((p: any) => {
            const stock = p.current_stock ?? 10;
            [p.seller_sku1, p.seller_sku2, p.seller_sku3, p.seller_sku4].forEach((sku) => {
                if (sku) stockMap[sku.trim()] = { product_name: p.product_name, total_stock: stock };
            });
        });
    }

    const stockInfo: Record<string, any> = {};

    orderIds.forEach((id) => {
        const orderItems = items.filter((i: any) => i.order_id === id);
        const orderProducts = orderItems.map((i: any) => {
            const sku = i.seller_sku?.trim();
            const info = stockMap[sku] || { product_name: sku || 'Product', total_stock: 0 };
            return info;
        });

        const inStockCount = orderProducts.filter((p) => p.total_stock > 0).length;

        stockInfo[id] = {
            products: orderProducts,
            in_stock_count: inStockCount,
            total_count: orderProducts.length,
        };
    });

    return stockInfo;
}

export async function createDarazOrderAction(data: CreateDarazOrderPayload) {
    const supabase = getInvSupabaseAdminClient();

    const todayStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }).replace('/', '');
    const randomSeq = Math.floor(10000 + Math.random() * 90000);
    const invoiceNumber = `Inv ${todayStr} - ${randomSeq}`;

    const { data: order, error: orderError } = await supabase
        .from('daraz_orders')
        .insert({
            invoice_number: invoiceNumber,
            order_number: data.order_number,
            tracking_number: data.tracking_number || null,
            customer_name: data.customer_name,
            order_date: data.order_date,
            order_status: data.order_status || 'Pending',
            seller_account: data.seller_account || 'Bagmati Traders',
            remarks: data.remarks || null,
            order_source: 'manual',
            import_source: 'manual',
            deleted: false,
        })
        .select()
        .single();

    if (orderError) throw new Error(orderError.message);

    const itemsToInsert = await Promise.all(
        data.items.map(async (item, idx) => {
            const cleanSku = item.seller_sku.trim();
            const { data: matchedProduct } = await supabase
                .from('products')
                .select('id, product_name, seller_account1, seller_sku1, seller_sku2, seller_sku3, seller_sku4')
                .or(`seller_sku1.eq.${cleanSku},seller_sku2.eq.${cleanSku},seller_sku3.eq.${cleanSku},seller_sku4.eq.${cleanSku}`)
                .eq('is_deleted', false)
                .maybeSingle();

            return {
                order_id: order.id,
                seller_sku: cleanSku,
                quantity: item.quantity || 1,
                amount: item.amount || 0,
                item_sequence: idx + 1,
                seller_account: item.seller_account || data.seller_account || matchedProduct?.seller_account1 || null,
                product_name: item.product_name || matchedProduct?.product_name || `Product (${cleanSku})`,
                product_id: matchedProduct?.id || null,
            };
        })
    );

    const { error: itemsError } = await supabase
        .from('daraz_order_items')
        .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);

    return order;
}

export async function updateDarazOrderAction(orderId: string, data: Partial<CreateDarazOrderPayload>) {
    const supabase = getInvSupabaseAdminClient();

    const { error: updateError } = await supabase
        .from('daraz_orders')
        .update({
            order_number: data.order_number,
            tracking_number: data.tracking_number || null,
            customer_name: data.customer_name,
            order_date: data.order_date,
            order_status: data.order_status,
            seller_account: data.seller_account || null,
            remarks: data.remarks || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

    if (updateError) throw new Error(updateError.message);

    if (data.items) {
        await supabase.from('daraz_order_items').delete().eq('order_id', orderId);

        const itemsToInsert = data.items.map((item, idx) => ({
            order_id: orderId,
            seller_sku: item.seller_sku,
            quantity: item.quantity || 1,
            amount: item.amount || 0,
            item_sequence: idx + 1,
            seller_account: item.seller_account || data.seller_account || null,
            product_name: item.product_name || `Product (${item.seller_sku})`,
        }));

        const { error: itemsError } = await supabase.from('daraz_order_items').insert(itemsToInsert);
        if (itemsError) throw new Error(itemsError.message);
    }
}

export async function updateDarazOrderStatusAction(orderIds: string[], status: string) {
    const supabase = getInvSupabaseAdminClient();
    const now = new Date().toISOString();

    const updatePayload: any = {
        order_status: status,
        updated_at: now,
    };

    if (status === 'Shipped') {
        updatePayload.shipped_at = now;
    }

    const { error } = await supabase
        .from('daraz_orders')
        .update(updatePayload)
        .in('id', orderIds);

    if (error) throw new Error(error.message);
}

export async function deleteDarazOrderAction(orderId: string) {
    const supabase = getInvSupabaseAdminClient();

    const { error } = await supabase
        .from('daraz_orders')
        .update({
            deleted: true,
            order_status: 'Cancelled',
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

    if (error) throw new Error(error.message);
}

export async function syncDarazOrderProductsAction(orderId: string) {
    const supabase = getInvSupabaseAdminClient();

    const { data: items } = await supabase
        .from('daraz_order_items')
        .select('*')
        .eq('order_id', orderId);

    if (!items || items.length === 0) return { success: true, message: 'No items to sync' };

    let updatedCount = 0;
    for (const item of items) {
        const cleanSku = item.seller_sku?.trim();
        if (!cleanSku) continue;

        const { data: matchedProduct } = await supabase
            .from('products')
            .select('id, product_name, seller_account1, seller_sku1')
            .or(`seller_sku1.eq.${cleanSku},seller_sku2.eq.${cleanSku},seller_sku3.eq.${cleanSku},seller_sku4.eq.${cleanSku}`)
            .eq('is_deleted', false)
            .maybeSingle();

        if (matchedProduct) {
            await supabase
                .from('daraz_order_items')
                .update({
                    product_name: matchedProduct.product_name,
                    product_id: matchedProduct.id,
                    seller_account: matchedProduct.seller_account1 || null,
                })
                .eq('id', item.id);
            updatedCount++;
        }
    }

    return { success: true, message: `Synced product details for ${updatedCount} items.` };
}
