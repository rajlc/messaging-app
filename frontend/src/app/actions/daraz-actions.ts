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

export interface GetAllDarazOrdersParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sellerAccount?: string;
    fromDate?: string;
    toDate?: string;
}

export async function getAllDarazOrdersAction(params: GetAllDarazOrdersParams = {}) {
    const {
        page = 1,
        limit = 50,
        search = '',
        status = 'all',
        sellerAccount = 'all',
        fromDate = '',
        toDate = '',
    } = params;

    const supabase = getInvSupabaseAdminClient();

    let query = supabase
        .from('daraz_orders')
        .select('*, daraz_order_items(*, product:products(id, product_id, product_name))', { count: 'exact' })
        .or('deleted.is.null,deleted.eq.false');

    // Filter Logic: Hide "Unpaid", "Cancel", and "Cancelled" orders by default when status is 'all'
    if (!status || status === 'all') {
        query = query.not('order_status', 'in', '("Unpaid","Cancel","Cancelled","unpaid","cancel","cancelled")');
    } else {
        query = query.eq('order_status', status);
    }

    // Seller account filter
    if (sellerAccount && sellerAccount !== 'all') {
        query = query.eq('seller_account', sellerAccount);
    }

    // Date range filter (on order_date)
    if (fromDate) {
        query = query.gte('order_date', fromDate);
    }
    if (toDate) {
        query = query.lte('order_date', toDate);
    }

    // Search: order#, tracking#, customer name
    if (search.trim()) {
        const term = search.trim();
        query = query.or(
            `order_number.ilike.%${term}%,tracking_number.ilike.%${term}%,customer_name.ilike.%${term}%`
        );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: rawOrders, count, error } = await query
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error in getAllDarazOrdersAction:', error.message);
        throw new Error(error.message);
    }

    // Collect product UUIDs and SKUs to resolve exact product_id numbers from products table
    const productUuids: string[] = [];
    const sellerSkus: string[] = [];

    (rawOrders || []).forEach((order: any) => {
        (order.daraz_order_items || []).forEach((item: any) => {
            if (item.product_id) productUuids.push(item.product_id);
            if (item.seller_sku) sellerSkus.push(item.seller_sku.trim());
        });
    });

    const uniqueUuids = Array.from(new Set(productUuids)).filter(Boolean);
    const uniqueSkus = Array.from(new Set(sellerSkus)).filter(Boolean);

    const productCodeMap = new Map<string, { product_id: string; product_name: string }>();

    if (uniqueUuids.length > 0 || uniqueSkus.length > 0) {
        try {
            let prodQuery = supabase
                .from('products')
                .select('id, product_id, product_name, seller_sku1, seller_sku2, seller_sku3, seller_sku4')
                .eq('is_deleted', false);

            const conditions: string[] = [];
            if (uniqueUuids.length > 0) {
                conditions.push(`id.in.(${uniqueUuids.map(u => `"${u}"`).join(',')})`);
            }
            if (uniqueSkus.length > 0) {
                uniqueSkus.slice(0, 50).forEach((sku) => {
                    conditions.push(`seller_sku1.eq."${sku}",seller_sku2.eq."${sku}",seller_sku3.eq."${sku}",seller_sku4.eq."${sku}"`);
                });
            }

            if (conditions.length > 0) {
                const { data: prods } = await prodQuery.or(conditions.join(','));
                (prods || []).forEach((p: any) => {
                    const info = { product_id: String(p.product_id || p.id), product_name: p.product_name };
                    if (p.id) productCodeMap.set(p.id, info);
                    if (p.seller_sku1) productCodeMap.set(p.seller_sku1.trim().toLowerCase(), info);
                    if (p.seller_sku2) productCodeMap.set(p.seller_sku2.trim().toLowerCase(), info);
                    if (p.seller_sku3) productCodeMap.set(p.seller_sku3.trim().toLowerCase(), info);
                    if (p.seller_sku4) productCodeMap.set(p.seller_sku4.trim().toLowerCase(), info);
                });
            }
        } catch (e) {
            console.error('Error fetching product codes:', e);
        }
    }

    const orders = (rawOrders || []).map((order: any) => {
        const items: any[] = order.daraz_order_items || [];
        const firstItem = items[0];

        const skuClean = firstItem?.seller_sku?.trim()?.toLowerCase();
        const matchedProd = (firstItem?.product_id ? productCodeMap.get(firstItem.product_id) : null)
            || (skuClean ? productCodeMap.get(skuClean) : null);

        const firstProductName = matchedProd?.product_name || firstItem?.product_name || firstItem?.seller_sku || 'Product Not Found';
        const firstProductCode = matchedProd?.product_id
            || (firstItem?.product?.product_id ? String(firstItem.product.product_id) : null);

        const itemCount = items.length;
        const totalQty = items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0);
        const grandTotal = items.reduce((s: number, i: any) => s + Number(i.amount || 0) * Number(i.quantity || 1), 0)
            || Number(order.total_amount || 0);

        // item_statuses: array of each item's status (or order status as fallback)
        const itemStatuses: string[] = items.map((i: any) => i.item_status || order.order_status || '');

        return {
            ...order,
            items,
            first_product_name: firstProductName,
            first_product_code: firstProductCode,
            item_count: itemCount,
            total_quantity: totalQty || order.total_quantity || 1,
            grand_total: grandTotal,
            item_statuses: itemStatuses,
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

/**
 * Get single Daraz Order by ID with full item details & timestamps for ViewDarazOrderModal.
 */
export async function getDarazOrderByIdAction(orderId: string) {
    const supabase = getInvSupabaseAdminClient();

    const { data: order, error: orderError } = await supabase
        .from('daraz_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (orderError || !order) return null;

    const { data: items } = await supabase
        .from('daraz_order_items')
        .select('*, product:products(id, product_id, product_name)')
        .eq('order_id', orderId)
        .order('item_sequence');

    // Fetch product codes map for items missing product link
    const itemSkus = (items || []).map((i: any) => i.seller_sku?.trim()).filter(Boolean);
    const skuMap = new Map<string, string>();
    if (itemSkus.length > 0) {
        try {
            const { data: prods } = await supabase
                .from('products')
                .select('product_id, seller_sku1, seller_sku2, seller_sku3, seller_sku4')
                .eq('is_deleted', false)
                .or(itemSkus.map(sku => `seller_sku1.eq."${sku}",seller_sku2.eq."${sku}",seller_sku3.eq."${sku}",seller_sku4.eq."${sku}"`).join(','));
            (prods || []).forEach((p: any) => {
                const code = String(p.product_id || '');
                if (p.seller_sku1) skuMap.set(p.seller_sku1.trim().toLowerCase(), code);
                if (p.seller_sku2) skuMap.set(p.seller_sku2.trim().toLowerCase(), code);
                if (p.seller_sku3) skuMap.set(p.seller_sku3.trim().toLowerCase(), code);
                if (p.seller_sku4) skuMap.set(p.seller_sku4.trim().toLowerCase(), code);
            });
        } catch (e) {
            console.error('Error fetching product codes in getDarazOrderByIdAction:', e);
        }
    }

    const enrichedItems = (items || []).map((i: any) => {
        const skuClean = i.seller_sku?.trim()?.toLowerCase();
        const productCode = i.product?.product_id
            ? String(i.product.product_id)
            : (skuClean && skuMap.has(skuClean) ? skuMap.get(skuClean) : null);

        return {
            ...i,
            product_code: productCode,
            total_amount: Number(i.amount || 0) * Number(i.quantity || 1),
        };
    });

    const totalQty = enrichedItems.reduce((sum: number, i: any) => sum + Number(i.quantity || 1), 0);
    const grandTotal = enrichedItems.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0)
        || Number(order.total_amount || 0);

    return {
        ...order,
        items: enrichedItems,
        total_quantity: totalQty || order.total_quantity || 1,
        grand_total: grandTotal,
    };
}


/**
 * Get unique seller accounts for filter dropdown.
 */
export async function getSellerAccountsAction(): Promise<string[]> {
    const supabase = getInvSupabaseAdminClient();
    const { data, error } = await supabase
        .from('online_stores')
        .select('seller_account')
        .order('seller_account');

    if (error) return [];
    return (data || []).map((s: any) => s.seller_account).filter(Boolean);
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

// ---------------------------------------------------------------------------
// ORDER SUMMARY PAGE ACTIONS
// All logic mirrors inventory-webapp/features/sales/actions/daraz-actions.ts
// ---------------------------------------------------------------------------

export interface DailySalesReportRow {
    date: string;
    seller_account: string;
    shipped_qty: number;
    shipped_amount: number;
    delivered_qty: number;
    delivered_amount: number;
    returning_to_seller_qty: number;
    returned_delivered_qty: number;
    return_qty: number;
    customer_return_delivered_qty: number;
}

export interface AccountSummaryRow {
    seller_account: string;
    shipped_qty: number;
    shipped_amount: number;
    delivered_qty: number;
    delivered_amount: number;
    returning_to_seller_qty: number;
    returned_delivered_qty: number;
    return_qty: number;
    customer_return_delivered_qty: number;
    remain_qty: number;
}

export interface OrderStatusSummaryRow {
    seller_account: string;
    pending: number;
    packed: number;
    ready_to_ship: number;
    shipped: number;
    delivered: number;
    returning_to_seller: number;
    returned_delivered: number;
    customer_return: number;
    customer_return_delivered: number;
}

export interface OrderSummaryStats {
    totalOrdersToday: number;
    pending: number;
    packed: number;
    readyToShip: number;
    shippedToday: number;
    delivered: number;
    returns: number;
    revenueToday: number;
}

/**
 * Daily Sales Report — aggregated by date × seller account.
 * Mirrors getDailySalesReport() in inventory-webapp exactly.
 */
export async function getDailySalesReportAction(): Promise<DailySalesReportRow[]> {
    const supabase = getInvSupabaseAdminClient();

    try {
        let allOrders: any[] = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: orders, error } = await supabase
                .from('daraz_orders')
                .select('id, order_status, price, updated_at, shipped_at, delivered_at, seller_account')
                .or('deleted.is.null,deleted.eq.false')
                .in('order_status', [
                    'Shipped', 'Delivered', 'Returning to Seller',
                    'Returned Delivered', 'Customer Return', 'Customer Return Delivered',
                ])
                .order('updated_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            if (!orders || orders.length === 0) break;

            allOrders = allOrders.concat(orders);
            if (orders.length < pageSize) break;
            page++;
        }

        // Group by date and seller account
        const reportMap = new Map<string, Map<string, DailySalesReportRow>>();

        const getStats = (dateStr: string, sellerAccount: string): DailySalesReportRow => {
            if (!reportMap.has(dateStr)) reportMap.set(dateStr, new Map());
            const dateMap = reportMap.get(dateStr)!;
            if (!dateMap.has(sellerAccount)) {
                dateMap.set(sellerAccount, {
                    date: dateStr,
                    seller_account: sellerAccount,
                    shipped_qty: 0,
                    shipped_amount: 0,
                    delivered_qty: 0,
                    delivered_amount: 0,
                    returning_to_seller_qty: 0,
                    returned_delivered_qty: 0,
                    return_qty: 0,
                    customer_return_delivered_qty: 0,
                });
            }
            return dateMap.get(sellerAccount)!;
        };

        allOrders.forEach((order: any) => {
            const sellerAccount = order.seller_account || 'Unknown';
            const price = parseFloat(order.price) || 0;

            // 1. Shipped metric — use shipped_at if available, else updated_at for legacy
            if (order.shipped_at) {
                const shippedDate = new Date(order.shipped_at).toISOString().split('T')[0];
                const stats = getStats(shippedDate, sellerAccount);
                stats.shipped_qty++;
                stats.shipped_amount += price;
            } else if (order.order_status === 'Shipped') {
                const dateStr = new Date(order.updated_at).toISOString().split('T')[0];
                const stats = getStats(dateStr, sellerAccount);
                stats.shipped_qty++;
                stats.shipped_amount += price;
            }

            // 2. Delivered metric — use delivered_at if available
            if (order.delivered_at) {
                const deliveredDate = new Date(order.delivered_at).toISOString().split('T')[0];
                const stats = getStats(deliveredDate, sellerAccount);
                stats.delivered_qty++;
                stats.delivered_amount += price;
            }

            // 3. Other statuses — use updated_at
            const dateStr = new Date(order.updated_at).toISOString().split('T')[0];
            const stats = getStats(dateStr, sellerAccount);

            switch (order.order_status) {
                case 'Delivered':
                    if (!order.delivered_at) {
                        stats.delivered_qty++;
                        stats.delivered_amount += price;
                    }
                    break;
                case 'Returning to Seller':
                    stats.returning_to_seller_qty++;
                    break;
                case 'Returned Delivered':
                    stats.returned_delivered_qty++;
                    break;
                case 'Customer Return':
                    stats.return_qty++;
                    break;
                case 'Customer Return Delivered':
                    stats.customer_return_delivered_qty++;
                    break;
            }
        });

        // Convert to array sorted by date descending
        const result: DailySalesReportRow[] = [];
        const sortedDates = Array.from(reportMap.keys()).sort((a, b) => b.localeCompare(a));
        sortedDates.forEach((date) => {
            reportMap.get(date)!.forEach((stats) => result.push(stats));
        });

        return result;
    } catch (error) {
        console.error('Error in getDailySalesReportAction:', error);
        return [];
    }
}

/**
 * Account Summary Report — aggregated by seller account (all-time).
 * Mirrors getOrderSummaryReport() in inventory-webapp exactly.
 */
export async function getOrderSummaryReportAction(): Promise<AccountSummaryRow[]> {
    const supabase = getInvSupabaseAdminClient();

    try {
        // 1. Get all seller accounts
        const { data: stores } = await supabase
            .from('online_stores')
            .select('seller_account')
            .order('seller_account');

        const summaryMap = new Map<string, AccountSummaryRow>();

        stores?.forEach((store: any) => {
            if (store.seller_account) {
                summaryMap.set(store.seller_account, {
                    seller_account: store.seller_account,
                    shipped_qty: 0,
                    shipped_amount: 0,
                    delivered_qty: 0,
                    delivered_amount: 0,
                    returning_to_seller_qty: 0,
                    returned_delivered_qty: 0,
                    return_qty: 0,
                    customer_return_delivered_qty: 0,
                    remain_qty: 0,
                });
            }
        });

        // 2. Batch-fetch all non-deleted orders
        let allOrders: any[] = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: orders, error } = await supabase
                .from('daraz_orders')
                .select('order_status, price, seller_account')
                .or('deleted.is.null,deleted.eq.false')
                .range(from, to);

            if (error) throw error;
            if (!orders || orders.length === 0) break;

            allOrders = allOrders.concat(orders);
            if (orders.length < pageSize) break;
            page++;
        }

        // 3. Aggregate with priority buckets (mirrors inventory-webapp logic)
        const dispatchedStatuses = [
            'Shipped', 'Delivered', 'Returning to Seller', 'Returned Delivered',
            'Customer Return', 'Customer Return Delivered', 'Delivery Failed',
            'Fail Delivered', 'Lost', 'Damaged',
        ];

        allOrders.forEach((order: any) => {
            const sellerAccount = order.seller_account || 'Unknown';
            const price = parseFloat(order.price) || 0;
            const mainStatus = order.order_status;

            if (!summaryMap.has(sellerAccount)) {
                summaryMap.set(sellerAccount, {
                    seller_account: sellerAccount,
                    shipped_qty: 0, shipped_amount: 0,
                    delivered_qty: 0, delivered_amount: 0,
                    returning_to_seller_qty: 0, returned_delivered_qty: 0,
                    return_qty: 0, customer_return_delivered_qty: 0, remain_qty: 0,
                });
            }

            const stats = summaryMap.get(sellerAccount)!;

            if (mainStatus === 'Customer Return Delivered') stats.customer_return_delivered_qty++;
            else if (mainStatus === 'Customer Return') stats.return_qty++;
            else if (mainStatus === 'Returned Delivered') stats.returned_delivered_qty++;
            else if (mainStatus === 'Returning to Seller') stats.returning_to_seller_qty++;
            else if (mainStatus === 'Delivered') { stats.delivered_qty++; stats.delivered_amount += price; }
            else if (mainStatus === 'Shipped') stats.remain_qty++;

            if (dispatchedStatuses.includes(mainStatus)) {
                stats.shipped_qty++;
                stats.shipped_amount += price;
            }
        });

        return Array.from(summaryMap.values()).sort((a, b) =>
            a.seller_account.localeCompare(b.seller_account)
        );
    } catch (error) {
        console.error('Error in getOrderSummaryReportAction:', error);
        return [];
    }
}

/**
 * Order Status Summary — count per seller account per status.
 * Lightweight single-query aggregation (simpler than inventory-webapp N×M queries).
 */
export async function getOrderStatusSummaryAction(): Promise<OrderStatusSummaryRow[]> {
    const supabase = getInvSupabaseAdminClient();

    try {
        const { data: orders, error } = await supabase
            .from('daraz_orders')
            .select('order_status, seller_account')
            .or('deleted.is.null,deleted.eq.false');

        if (error) throw error;

        const rowMap = new Map<string, OrderStatusSummaryRow>();

        (orders || []).forEach((order: any) => {
            const account = order.seller_account || 'Unknown';
            if (!rowMap.has(account)) {
                rowMap.set(account, {
                    seller_account: account,
                    pending: 0, packed: 0, ready_to_ship: 0, shipped: 0,
                    delivered: 0, returning_to_seller: 0, returned_delivered: 0,
                    customer_return: 0, customer_return_delivered: 0,
                });
            }
            const row = rowMap.get(account)!;
            const st = (order.order_status || '').trim();
            if (st === 'Pending') row.pending++;
            else if (st === 'Packed') row.packed++;
            else if (st === 'Ready to Ship') row.ready_to_ship++;
            else if (st === 'Shipped') row.shipped++;
            else if (st === 'Delivered') row.delivered++;
            else if (st === 'Returning to Seller') row.returning_to_seller++;
            else if (st === 'Returned Delivered') row.returned_delivered++;
            else if (st === 'Customer Return') row.customer_return++;
            else if (st === 'Customer Return Delivered') row.customer_return_delivered++;
        });

        return Array.from(rowMap.values()).sort((a, b) =>
            a.seller_account.localeCompare(b.seller_account)
        );
    } catch (error) {
        console.error('Error in getOrderStatusSummaryAction:', error);
        return [];
    }
}

/**
 * Order Summary KPI stats — lightweight single query for top stat cards.
 * Returns today's totals across all seller accounts.
 */
export async function getOrderSummaryStatsAction(): Promise<OrderSummaryStats> {
    const supabase = getInvSupabaseAdminClient();
    const today = new Date().toISOString().split('T')[0];

    const empty: OrderSummaryStats = {
        totalOrdersToday: 0,
        pending: 0,
        packed: 0,
        readyToShip: 0,
        shippedToday: 0,
        delivered: 0,
        returns: 0,
        revenueToday: 0,
    };

    try {
        const { data, error } = await supabase
            .from('daraz_orders')
            .select('order_status, price, created_at, shipped_at, order_date')
            .or('deleted.is.null,deleted.eq.false');

        if (error || !data) return empty;

        const stats = { ...empty };

        data.forEach((row: any) => {
            const st = (row.order_status || '').trim();
            const createdDate = row.order_date?.split('T')[0] || row.created_at?.split('T')[0] || '';
            const shippedDate = row.shipped_at?.split('T')[0] || '';
            const price = parseFloat(row.price) || 0;

            if (createdDate === today) {
                stats.totalOrdersToday++;
                stats.revenueToday += price;
            }
            if (st === 'Pending') stats.pending++;
            else if (st === 'Packed') stats.packed++;
            else if (st === 'Ready to Ship') stats.readyToShip++;
            else if (st === 'Delivered') stats.delivered++;
            else if (['Customer Return', 'Returning to Seller', 'Returned Delivered', 'Customer Return Delivered'].includes(st)) {
                stats.returns++;
            }
            if (shippedDate === today) stats.shippedToday++;
        });

        return stats;
    } catch (error) {
        console.error('Error in getOrderSummaryStatsAction:', error);
        return empty;
    }
}
