import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';

@Injectable()
export class AdsManagementService {
    // --- Ads Campaigns ---
    async findAllCampaigns() {
        // Fetch all campaigns
        const { data: campaigns, error: campaignError } = await supabaseService.getSupabaseClient()
            .from('ads_campaigns')
            .select('*')
            .order('name', { ascending: true });

        if (campaignError) throw campaignError;

        // Fetch all spends to aggregate
        const { data: spends, error: spendError } = await supabaseService.getSupabaseClient()
            .from('ads_spends')
            .select('campaign_id, amount');

        if (spendError) throw spendError;

        // Map spends to campaigns
        const campaignsWithSpend = campaigns.map(campaign => {
            const totalSpend = spends
                .filter(s => s.campaign_id === campaign.id)
                .reduce((sum, s) => sum + Number(s.amount), 0);
            return {
                ...campaign,
                total_spend: totalSpend
            };
        });

        return campaignsWithSpend;
    }

    async createCampaign(data: { name: string; product_names: string[]; status?: string }) {
        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('ads_campaigns')
            .insert({
                name: data.name,
                product_names: data.product_names || [],
                status: data.status || 'On'
            })
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async updateCampaign(id: string, data: { name?: string; product_names?: string[]; status?: string }) {
        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('ads_campaigns')
            .update({
                name: data.name,
                product_names: data.product_names,
                status: data.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async findCampaignDetails(id: string) {
        const supabase = supabaseService.getSupabaseClient();

        // 1. Get Campaign info
        const { data: campaign, error: campaignError } = await supabase
            .from('ads_campaigns')
            .select('*')
            .eq('id', id)
            .single();
        if (campaignError || !campaign) throw new NotFoundException('Campaign not found');

        // 2. Get all spends for this campaign to calculate total and find first date
        const { data: campaignSpends, error: spendError } = await supabase
            .from('ads_spends')
            .select('amount, date')
            .eq('campaign_id', id);

        if (spendError) throw spendError;

        const firstSpendDate = campaignSpends && campaignSpends.length > 0
            ? new Date(Math.min(...campaignSpends.map(s => new Date(s.date).getTime())))
            : null;

        const totalCampaignSpend = campaignSpends.reduce((sum, s) => sum + Number(s.amount), 0);

        // 3. Fetch product metrics (est_purchase_cost) for campaign products
        const campaignProductNames = campaign.product_names || [];
        if (campaignProductNames.length === 0) {
            return {
                campaign,
                metrics: [],
                orders: [],
                total_profit: 0
            };
        }

        const { data: metricsData, error: metricsError } = await supabase
            .from('product_ads_metrics')
            .select('*')
            .in('product_name', campaignProductNames);
        if (metricsError) throw metricsError;

        // 4. Fetch orders containing ANY of these campaign products
        // Optimization: use jsonb filter if possible, but for simplicity we fetch and filter in JS 
        // OR better filter by campaign products if many orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('order_number, status, amount, est_delivery_charge, items, order_status_history(status, changed_at)')
            .not('items', 'is', null); // Ensure items exist
        if (ordersError) throw ordersError;

        const productMap = new Map<string, any>();
        campaignProductNames.forEach(name => {
            productMap.set(name, {
                product_name: name,
                shipped_qty: 0,
                delivered_qty: 0,
                est_ads_cost: 0,
                actual_ads_cost: 0,
                est_purchase_cost: (metricsData || []).find(m => m.product_name === name)?.est_purchase_cost || 0
            });
        });

        let totalCampaignShippedQty = 0;
        let totalCampaignDeliveredQty = 0;
        const campaignOrders: any[] = [];

        // If campaign is 'Off', we don't count orders (based on user request)
        if (campaign.status === 'On') {
            orders.forEach((order: any) => {
                const history = order.order_status_history || [];

                // Find the shipped date from history
                const shippedEvent = history.find((h: any) => h.status === 'Shipped');
                if (!shippedEvent) return;

                const shippedDate = new Date(shippedEvent.changed_at);

                // Date condition: shipped date >= first ads spend date
                if (firstSpendDate && shippedDate < firstSpendDate) return;

                const items = order.items || [];
                const historyStatuses = history.map((h: any) => h.status);

                const hasShipped = historyStatuses.includes('Shipped');
                const hasNegativeLogs = historyStatuses.some(status => ['Return Delivered', 'Return Process', 'Cancel', 'Cancelled', 'Follow up again'].includes(status));
                const hasDelivered = historyStatuses.includes('Delivered');

                let orderEstPurchaseCost = 0;
                let hasCampaignProduct = false;
                const campaignProductsInOrderRaw: string[] = [];

                items.forEach((item: any) => {
                    const name = item.product_name;
                    if (!productMap.has(name)) return;

                    hasCampaignProduct = true;
                    campaignProductsInOrderRaw.push(`${name} (${item.qty})`);
                    const metrics = productMap.get(name);
                    orderEstPurchaseCost += (metrics.est_purchase_cost * Number(item.qty || 0));

                    if (hasShipped && !hasNegativeLogs) {
                        const qty = Number(item.qty || 0);
                        metrics.shipped_qty += qty;
                        totalCampaignShippedQty += qty;
                    }

                    if (hasDelivered && !hasNegativeLogs) {
                        const qty = Number(item.qty || 0);
                        metrics.delivered_qty += qty;
                        totalCampaignDeliveredQty += qty;
                    }
                });

                if (hasCampaignProduct) {
                    campaignOrders.push({
                        order_number: order.order_number,
                        status: order.status,
                        product_names: campaignProductsInOrderRaw.join(', '),
                        est_purchase_cost: orderEstPurchaseCost,
                        sales_price: Number(order.amount || 0),
                        est_delivery_charge: Number(order.est_delivery_charge || 0),
                        is_delivered: hasDelivered && !hasNegativeLogs
                    });
                }
            });
        }

        // Calculate Ad Costs
        const estAdsCost = totalCampaignShippedQty > 0 ? totalCampaignSpend / totalCampaignShippedQty : 0;
        const actualAdsCost = totalCampaignDeliveredQty > 0 ? totalCampaignSpend / totalCampaignDeliveredQty : 0;

        // Assign to each product
        productMap.forEach(metrics => {
            metrics.est_ads_cost = estAdsCost;
            metrics.actual_ads_cost = actualAdsCost;
        });

        // Finalize Campaign Orders with Profit and Ads Cost
        let totalCampaignProfit = 0;
        const finalizedOrders = campaignOrders.map(o => {
            const profit = o.is_delivered
                ? (o.sales_price - o.est_purchase_cost - o.est_delivery_charge - actualAdsCost)
                : 0;

            if (o.is_delivered) {
                totalCampaignProfit += profit;
            }

            return {
                ...o,
                ads_cost: actualAdsCost,
                profit: profit
            };
        });

        return {
            campaign,
            metrics: Array.from(productMap.values()).sort((a, b) => a.product_name.localeCompare(b.product_name)),
            orders: finalizedOrders.sort((a, b) => b.order_number.localeCompare(a.order_number)),
            total_profit: totalCampaignProfit
        };
    }

    // --- Ads Spends ---
    async findAllSpends() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('ads_spends')
            .select('*, ads_campaigns(name)')
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    }

    async createSpend(data: { campaign_id: string; date: string; amount: number; remarks: string }) {
        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('ads_spends')
            .insert({
                campaign_id: data.campaign_id,
                date: data.date,
                amount: data.amount,
                remarks: data.remarks,
            })
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async updateSpend(id: string, data: { campaign_id?: string; date?: string; amount?: number; remarks?: string }) {
        // Check 24-hour restriction
        const { data: existing, error: fetchError } = await supabaseService.getSupabaseClient()
            .from('ads_spends')
            .select('created_at')
            .eq('id', id)
            .single();

        if (fetchError || !existing) throw new NotFoundException('Ads spend record not found');

        const createdAt = new Date(existing.created_at).getTime();
        const now = new Date().getTime();
        const diffHours = (now - createdAt) / (1000 * 60 * 60);

        if (diffHours > 24) {
            throw new ForbiddenException('Ads spend record can only be edited within 24 hours of creation');
        }

        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('ads_spends')
            .update({
                campaign_id: data.campaign_id,
                date: data.date,
                amount: data.amount,
                remarks: data.remarks,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    // --- Product Ads Metrics ---
    async findAllProductMetrics() {
        const supabase = supabaseService.getSupabaseClient();

        // 1. Fetch metrics (est_purchase_cost)
        const { data: metricsData, error: metricsError } = await supabase
            .from('product_ads_metrics')
            .select('*');
        if (metricsError) throw metricsError;

        // 2. Fetch all spends to find the earliest globally
        const { data: spends, error: spendError } = await supabase
            .from('ads_spends')
            .select('date')
            .order('date', { ascending: true })
            .limit(1);
        if (spendError) throw spendError;

        const firstEverSpendDate = spends && spends.length > 0 ? new Date(spends[0].date) : null;

        // 3. Fetch orders with status_history to calculate Shipped/Delivered Qty
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('items, order_status_history(status, changed_at)');
        if (ordersError) throw ordersError;

        const productMap = new Map<string, any>();

        orders.forEach((order: any) => {
            const history = order.order_status_history || [];

            // Find the shipped date from history
            const shippedEvent = history.find((h: any) => h.status === 'Shipped');
            if (!shippedEvent) return;

            const shippedDate = new Date(shippedEvent.changed_at);

            // Date condition: shipped date >= first ads spend date
            if (firstEverSpendDate && shippedDate < firstEverSpendDate) return;

            const items = order.items || [];
            const historyStatuses = history.map((h: any) => h.status);

            const hasShipped = historyStatuses.includes('Shipped');
            const hasNegativeLogs = historyStatuses.some(status => ['Return Delivered', 'Return Process', 'Cancel', 'Cancelled', 'Follow up again'].includes(status));
            const hasDelivered = historyStatuses.includes('Delivered');

            items.forEach((item: any) => {
                const name = item.product_name;
                if (!name) return;

                if (!productMap.has(name)) {
                    productMap.set(name, {
                        product_name: name,
                        shipped_qty: 0,
                        delivered_qty: 0,
                        est_purchase_cost: 0
                    });
                }

                const metrics = productMap.get(name);

                // Shipped Qty: has Shipped log but NO negative logs
                if (hasShipped && !hasNegativeLogs) {
                    metrics.shipped_qty += Number(item.qty || 0);
                }

                // Delivered Qty: has Delivered log AND NO negative logs
                if (hasDelivered && !hasNegativeLogs) {
                    metrics.delivered_qty += Number(item.qty || 0);
                }
            });
        });

        // 4. Merge with metrics data
        metricsData.forEach(m => {
            if (productMap.has(m.product_name)) {
                productMap.get(m.product_name).est_purchase_cost = m.est_purchase_cost;
            } else {
                productMap.set(m.product_name, {
                    product_name: m.product_name,
                    shipped_qty: 0,
                    delivered_qty: 0,
                    est_purchase_cost: m.est_purchase_cost
                });
            }
        });

        return Array.from(productMap.values()).sort((a, b) => a.product_name.localeCompare(b.product_name));
    }

    async upsertProductMetric(product_name: string, est_purchase_cost: number) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('product_ads_metrics')
            .upsert({
                product_name,
                est_purchase_cost,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
