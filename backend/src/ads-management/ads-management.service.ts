import { Injectable, ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class AdsManagementService {
    constructor(
        private readonly ordersService: OrdersService
    ) {}
    // --- Ads Campaigns ---
    async findAllCampaigns() {
        const supabase = supabaseService.getSupabaseClient();
        
        // 1. Fetch campaigns
        const { data: campaigns, error: campaignError } = await supabase
            .from('ads_campaigns')
            .select('*')
            .order('name', { ascending: true });

        if (campaignError) throw campaignError;

        // 2. Fetch all spends
        const { data: spends, error: spendError } = await supabase
            .from('ads_spends')
            .select('campaign_id, amount');

        if (spendError) throw spendError;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // 3. Map spends and apply Auto-Off logic
        const campaignsWithSpend = campaigns.map(campaign => {
            const totalSpend = spends
                .filter(s => s.campaign_id === campaign.id)
                .reduce((sum, s) => sum + Number(s.amount), 0);

            let currentStatus = campaign.status || 'On';
            
            // Auto-Off logic: If today is past end_date, treat as Off in UI/Response
            if (campaign.end_date && currentStatus === 'On') {
                const end = new Date(campaign.end_date);
                if (now > end) {
                    currentStatus = 'Off';
                }
            }

            return {
                ...campaign,
                status: currentStatus,
                total_spend: totalSpend
            };
        });

        // 4. Prepend Virtual "No Ads Cost" Campaign
        const virtualCampaign = {
            id: 'virtual-no-ads',
            name: 'No Ads Cost Campaign',
            status: 'On',
            start_date: '2020-01-01',
            end_date: null,
            product_names: ['All Products'],
            total_spend: 0,
            is_virtual: true
        };

        return [virtualCampaign, ...campaignsWithSpend];
    }

    async createCampaign(data: { name: string; product_names: string[]; status?: string; start_date?: string; end_date?: string }) {
        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('ads_campaigns')
            .insert({
                name: data.name,
                product_names: data.product_names || [],
                status: data.status || 'On',
                start_date: data.start_date || new Date().toISOString().split('T')[0],
                end_date: data.end_date || null
            })
            .select()
            .single();

        if (error) throw error;
        return result;
    }


    async findCampaignDetails(id: string) {
        const supabase = supabaseService.getSupabaseClient();
        const isVirtual = id === 'virtual-no-ads';

        // Nepali Time helper
        const getNepaliNow = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            return new Date(utc + (3600000 * 5.75));
        };

        const nepaliTodayStart = getNepaliNow();
        nepaliTodayStart.setHours(0, 0, 0, 0);

        // 1. Get Campaign info
        let campaign: any;
        if (isVirtual) {
            campaign = {
                id: 'virtual-no-ads',
                name: 'No Ads Cost Campaign',
                status: 'On',
                start_date: '2020-01-01',
                product_names: ['All Products']
            };
        } else {
            const { data, error } = await supabase
                .from('ads_campaigns')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !data) throw new NotFoundException('Campaign not found');
            campaign = data;
        }

        // 2. Get all spends
        let totalCampaignSpend = 0;
        if (!isVirtual) {
            const { data: campaignSpends, error: spendError } = await supabase
                .from('ads_spends')
                .select('amount, date')
                .eq('campaign_id', id);
            if (!spendError) {
                totalCampaignSpend = campaignSpends.reduce((sum, s) => sum + Number(s.amount), 0);
            }
        }

        // 2.5 Fetch Inventory Products for pricing
        const inventoryProducts = await this.ordersService.getInventoryProducts();
        const inventoryPriceMap = new Map<string, number>();
        (inventoryProducts || []).forEach((p: any) => {
            inventoryPriceMap.set(p.product_name, Number(p.est_price || 0));
        });

        // 3. Fetch product metrics (est_purchase_cost)
        const campaignProductNames = campaign.product_names || [];
        const { data: metricsData, error: metricsError } = await supabase
            .from('product_ads_metrics')
            .select('*');
        if (metricsError) throw metricsError;

        // 4. Fetch orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, order_number, order_status, total_amount, delivery_charge, items, order_type, created_at, courier_provider, city_name, campaign_ads_cost, order_status_history(status, changed_at)')
            .not('items', 'is', null); 
        if (ordersError) throw ordersError;

        const productMap = new Map<string, any>();
        if (!isVirtual) {
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
        }

        const campaignOrders: any[] = [];
        const campaignStart = new Date(campaign.start_date);
        const campaignEnd = campaign.end_date ? new Date(campaign.end_date) : null;
        const excludedStatuses = ['New Order', 'Pending', 'Confirmed Order', 'Cancel', 'Canceled', 'Cancelled'];

        orders.forEach((order: any) => {
            // Virtual Campaign Logic: Order Type 'Others' and NO date/product filtering
            if (isVirtual) {
                if (order.order_type !== 'Others') return;
            } else {
                if (order.order_type !== 'Ads') return;
                
                // Date check
                const orderDate = new Date(order.created_at);
                if (orderDate < campaignStart) return;
                if (campaignEnd) {
                    const endOfCampaign = new Date(campaignEnd);
                    endOfCampaign.setHours(23, 59, 59, 999);
                    if (orderDate > endOfCampaign) return;
                }
            }

            if (excludedStatuses.includes(order.order_status)) return;

            const history = order.order_status_history || [];
            const historyStatuses = history.map((h: any) => h.status);
            const hasShipped = historyStatuses.includes('Shipped') || order.order_status === 'Shipped' || order.order_status === 'Delivered';
            const hasDelivered = historyStatuses.includes('Delivered') || order.order_status === 'Delivered';
            const hasNegativeLogs = historyStatuses.some(status => ['Return Delivered', 'Return Process', 'Cancel', 'Cancelled', 'Canceled', 'Follow up again'].includes(status));

            const items = order.items || [];
            let orderEstPurchaseCost = 0;
            let hasCampaignProduct = false;
            const campaignProductsInOrderRaw: string[] = [];
            const campaignItemsInOrder: any[] = [];

            items.forEach((item: any) => {
                const name = item.product_name;
                
                // For virtual campaign, treat all products as "campaign products"
                if (!isVirtual && !productMap.has(name)) return;

                hasCampaignProduct = true;
                const qty = Number(item.qty || 0);
                campaignProductsInOrderRaw.push(`${name} (${qty})`);
                campaignItemsInOrder.push({ product_name: name, qty: qty });
                
                // Pricing Logic
                const invPrice = inventoryPriceMap.get(name);
                const metricPrice = (metricsData || []).find(m => m.product_name === name)?.est_purchase_cost || 0;
                const unitPrice = invPrice !== undefined ? invPrice : metricPrice;
                
                orderEstPurchaseCost += (unitPrice * qty);

                // Update product-level metrics (only for non-virtual for now to avoid massive lists)
                if (!isVirtual) {
                    const metrics = productMap.get(name);
                    if (hasShipped && !hasNegativeLogs) metrics.shipped_qty += qty;
                    if (hasDelivered && !hasNegativeLogs) metrics.delivered_qty += qty;
                } else {
                    // For virtual, build the map dynamically for all products involved
                    if (!productMap.has(name)) {
                        productMap.set(name, {
                            product_name: name,
                            shipped_qty: 0,
                            delivered_qty: 0,
                            est_ads_cost: 0,
                            actual_ads_cost: 0,
                            est_purchase_cost: unitPrice
                        });
                    }
                    const metrics = productMap.get(name);
                    if (hasShipped && !hasNegativeLogs) metrics.shipped_qty += qty;
                    if (hasDelivered && !hasNegativeLogs) metrics.delivered_qty += qty;
                }
            });

            if (hasCampaignProduct) {
                campaignOrders.push({
                    order_number: order.order_number,
                    status: order.order_status,
                    product_names: campaignProductsInOrderRaw.join(', '),
                    campaign_items: campaignItemsInOrder,
                    est_purchase_cost: orderEstPurchaseCost,
                    sales_price: Number(order.total_amount || 0),
                    est_delivery_charge: Number(order.delivery_charge || 0),
                    is_delivered: hasDelivered && !hasNegativeLogs,
                    created_at: order.created_at,
                    courier: order.courier_provider,
                    city: order.city_name,
                    order_id: order.id
                });
            }
        });

        // --- Ads Management Metrics ---
        const adsOrders = campaignOrders.length;
        let pastOrderCount = 0;
        let pastAdsSpend = 0;

        campaignOrders.forEach(o => {
            const orderObj = orders.find(ord => ord.id === o.order_id);
            if (!orderObj) return; // Guard against undefined

            const history = orderObj.order_status_history || [];
            const shippedLog = history.find((h: any) => h.status === 'Shipped');
            
            if (shippedLog) {
                const shippedDate = new Date(shippedLog.changed_at);
                const shippedUtc = shippedDate.getTime() + (shippedDate.getTimezoneOffset() * 60000);
                const shippedNepali = new Date(shippedUtc + (3600000 * 5.75));
                shippedNepali.setHours(0,0,0,0);

                if (shippedNepali < nepaliTodayStart) {
                    o.is_past = true;
                    pastOrderCount++;
                    pastAdsSpend += Number(orderObj.campaign_ads_cost || 0);
                }
            }
        });

        const totalAdsAmount = totalCampaignSpend;
        const remainingOrders = adsOrders - pastOrderCount;
        const adsAmount = remainingOrders > 0 ? (totalAdsAmount - pastAdsSpend) / remainingOrders : 0;

        // Apply and Lock costs
        for (const o of campaignOrders) {
            const orderObj = orders.find(ord => ord.id === o.order_id);
            if (!orderObj) continue;

            if (o.is_past) {
                o.ads_cost = Number(orderObj.campaign_ads_cost || adsAmount);
                if (!orderObj.campaign_ads_cost && adsAmount > 0) {
                    await supabase.from('orders').update({ campaign_ads_cost: adsAmount }).eq('id', orderObj.id);
                }
            } else {
                o.ads_cost = adsAmount;
            }
            
            const status = o.status;
            const profitFormula = o.sales_price - o.est_purchase_cost - o.est_delivery_charge - o.ads_cost;
            const lossFormula = -(o.est_delivery_charge + o.ads_cost);

            if (['Packed', 'Ready to Ship', 'Shipped', 'Arrived at Branch', 'Hold'].includes(status)) {
                o.profit = profitFormula;
                o.profit_label = 'Est. Profit';
            } else if (['Return Process', 'Delivery Failed'].includes(status)) {
                o.profit = lossFormula;
                o.profit_label = 'Est. Loss';
            } else if (status === 'Delivered') {
                o.profit = profitFormula;
                o.profit_label = ''; // Finalized
            } else if (status === 'Returned Delivered') {
                o.profit = lossFormula;
                o.profit_label = ''; // Finalized loss
            } else {
                o.profit = 0;
                o.profit_label = 'TBD';
            }
        }

        const statusBreakdown = {
            shipped: { qty: 0, amount: 0 },
            returning: { qty: 0, amount: 0 },
            delivered: { qty: 0, amount: 0 },
            returned: { qty: 0, amount: 0 }
        };

        campaignOrders.forEach(o => {
            const qty = (o.campaign_items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
            const amount = Number(o.sales_price || 0);

            if (['Packed', 'Ready to Ship', 'Shipped', 'Arrived at Branch', 'Hold'].includes(o.status)) {
                statusBreakdown.shipped.qty += qty;
                statusBreakdown.shipped.amount += amount;
            } else if (['Return Process', 'Delivery Failed'].includes(o.status)) {
                statusBreakdown.returning.qty += qty;
                statusBreakdown.returning.amount += amount;
            } else if (o.status === 'Delivered') {
                statusBreakdown.delivered.qty += qty;
                statusBreakdown.delivered.amount += amount;
            } else if (o.status === 'Returned Delivered') {
                statusBreakdown.returned.qty += qty;
                statusBreakdown.returned.amount += amount;
            }
        });

        return {
            campaign,
            orders: campaignOrders.sort((a, b) => b.order_number.localeCompare(a.order_number)),
            metrics: Array.from(productMap.values()).sort((a, b) => a.product_name.localeCompare(b.product_name)),
            total_profit: campaignOrders.reduce((sum, o) => sum + (o.profit || 0), 0),
            ads_management: {
                total_ads_amount: totalAdsAmount,
                ads_orders: adsOrders,
                ads_spend: pastAdsSpend,
                past_orders: pastOrderCount,
                ads_amount: adsAmount
            },
            status_breakdown: statusBreakdown
        };
    }

    async updateCampaign(id: string, data: { name?: string; product_names?: string[]; status?: string; start_date?: string; end_date?: string }) {
        if (id === 'virtual-no-ads') throw new ForbiddenException('Cannot edit the default organic campaign');
        const { data: result, error } = await supabaseService.getSupabaseClient()
            .from('ads_campaigns')
            .update({
                name: data.name,
                product_names: data.product_names,
                status: data.status,
                start_date: data.start_date,
                end_date: data.end_date,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return result;
    }

    async deleteCampaign(id: string) {
        if (id === 'virtual-no-ads') throw new ForbiddenException('Cannot delete the default organic campaign');
        const { error } = await supabaseService.getSupabaseClient()
            .from('ads_campaigns')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
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
        if (data.campaign_id === 'virtual-no-ads') throw new ForbiddenException('Cannot add spend to the organic campaign');
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
        if (data.campaign_id === 'virtual-no-ads') throw new ForbiddenException('Cannot move spend to the organic campaign');
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

    async getDailyProfitAnalysis() {
        const supabase = supabaseService.getSupabaseClient();

        // 1. Fetch active campaigns
        const { data: campaigns, error: campaignError } = await supabase
            .from('ads_campaigns')
            .select('*')
            .eq('status', 'On');
        if (campaignError) throw campaignError;

        const allCampaigns = [
            { id: 'virtual-no-ads', name: 'No Ads Cost Campaign', status: 'On', start_date: '2020-01-01', product_names: ['All Products'], is_virtual: true },
            ...campaigns
        ];

        // 2. Fetch all spends
        const { data: allSpends, error: spendError } = await supabase
            .from('ads_spends')
            .select('campaign_id, amount, date');
        if (spendError) throw spendError;

        // 3. Fetch Inventory Products
        const inventoryProducts = await this.ordersService.getInventoryProducts();
        const inventoryPriceMap = new Map<string, number>();
        (inventoryProducts || []).forEach((p: any) => {
            inventoryPriceMap.set(p.product_name, Number(p.est_price || 0));
        });

        // 4. Fetch metrics
        const { data: metricsData, error: metricsError } = await supabase
            .from('product_ads_metrics')
            .select('*');
        if (metricsError) throw metricsError;

        // 5. Fetch orders (last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, order_number, order_status, total_amount, delivery_charge, items, order_type, created_at, campaign_ads_cost, order_status_history(status, changed_at)')
            .gte('created_at', sixtyDaysAgo.toISOString())
            .not('items', 'is', null);
        if (ordersError) throw ordersError;

        // Nepali Time helper
        const getNepaliDateStr = (dateInput: string | Date) => {
            const date = new Date(dateInput);
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const nepali = new Date(utc + (3600000 * 5.75));
            return nepali.toISOString().split('T')[0];
        };

        const nepaliTodayStr = getNepaliDateStr(new Date());

        const dailyData: Record<string, { date: string, totalProfit: number, campaignBreakdown: Record<string, { name: string, profit: number }> }> = {};

        // Process each campaign
        for (const campaign of allCampaigns) {
            const isVirtual = (campaign as any).is_virtual;
            const campaignSpends = allSpends.filter(s => s.campaign_id === campaign.id);
            const totalCampaignSpend = campaignSpends.reduce((sum, s) => sum + Number(s.amount), 0);
            const campaignProductNames = (campaign as any).product_names || [];

            const campaignStart = new Date(campaign.start_date);
            const campaignEnd = (campaign as any).end_date ? new Date((campaign as any).end_date) : null;
            const excludedStatuses = ['New Order', 'Pending', 'Confirmed Order', 'Cancel', 'Canceled', 'Cancelled'];

            // Identify campaign orders
            const campaignOrders: any[] = [];
            orders.forEach((order: any) => {
                if (isVirtual) {
                    if (order.order_type !== 'Others') return;
                } else {
                    if (order.order_type !== 'Ads') return;
                    const orderDate = new Date(order.created_at);
                    if (orderDate < campaignStart) return;
                    if (campaignEnd) {
                        const endOfCampaign = new Date(campaignEnd);
                        endOfCampaign.setHours(23, 59, 59, 999);
                        if (orderDate > endOfCampaign) return;
                    }

                    // Product check
                    const items = order.items || [];
                    const hasProduct = items.some((item: any) => campaignProductNames.includes(item.product_name));
                    if (!hasProduct) return;
                }

                if (excludedStatuses.includes(order.order_status)) return;
                campaignOrders.push(order);
            });

            // Calculate ads_amount (per order cost)
            let pastOrderCount = 0;
            let pastAdsSpend = 0;
            campaignOrders.forEach(order => {
                const history = order.order_status_history || [];
                const shippedLog = history.find((h: any) => h.status === 'Shipped');
                if (shippedLog) {
                    const shippedDateStr = getNepaliDateStr(shippedLog.changed_at);
                    if (shippedDateStr < nepaliTodayStr) {
                        (order as any).is_past = true;
                        pastOrderCount++;
                        pastAdsSpend += Number(order.campaign_ads_cost || 0);
                    }
                }
            });

            const remainingOrders = campaignOrders.length - pastOrderCount;
            const adsAmount = remainingOrders > 0 ? (totalCampaignSpend - pastAdsSpend) / remainingOrders : 0;

            // Calculate profit for each order and aggregate
            campaignOrders.forEach(order => {
                const orderDateStr = getNepaliDateStr(order.created_at);
                if (!dailyData[orderDateStr]) {
                    dailyData[orderDateStr] = { date: orderDateStr, totalProfit: 0, campaignBreakdown: {} };
                }

                const adsCost = (order as any).is_past ? Number(order.campaign_ads_cost || adsAmount) : adsAmount;
                
                // Purchase Cost
                let purchaseCost = 0;
                (order.items || []).forEach((item: any) => {
                    const name = item.product_name;
                    const invPrice = inventoryPriceMap.get(name);
                    const metricPrice = (metricsData || []).find(m => m.product_name === name)?.est_purchase_cost || 0;
                    const unitPrice = invPrice !== undefined ? invPrice : metricPrice;
                    purchaseCost += (unitPrice * Number(item.qty || 0));
                });

                const status = order.order_status;
                const salesPrice = Number(order.total_amount || 0);
                const deliveryCharge = Number(order.delivery_charge || 0);
                const profitFormula = salesPrice - purchaseCost - deliveryCharge - adsCost;
                const lossFormula = -(deliveryCharge + adsCost);

                let profit = 0;
                if (['Packed', 'Ready to Ship', 'Shipped', 'Arrived at Branch', 'Hold'].includes(status)) {
                    profit = profitFormula;
                } else if (['Return Process', 'Delivery Failed'].includes(status)) {
                    profit = lossFormula;
                } else if (status === 'Delivered') {
                    profit = profitFormula;
                } else if (status === 'Returned Delivered') {
                    profit = lossFormula;
                }

                dailyData[orderDateStr].totalProfit += profit;
                if (!dailyData[orderDateStr].campaignBreakdown[campaign.id]) {
                    dailyData[orderDateStr].campaignBreakdown[campaign.id] = { name: campaign.name, profit: 0 };
                }
                dailyData[orderDateStr].campaignBreakdown[campaign.id].profit += profit;
            });
        }

        return Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date));
    }
}
