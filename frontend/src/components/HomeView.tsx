"use client";

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ShoppingBag, MessageCircle, Truck, TrendingUp, BarChart3,
    ArrowUpRight, Users, MessageSquare, Store, DollarSign,
    CheckCircle2, Clock, AlertCircle, RefreshCw, Smartphone, Facebook, Instagram
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HomeViewProps {
    orders: any[];
    conversations: any[];
    connectedPages: any[];
    user: any;
    setActiveView: (view: any, type?: string) => void;
}

export default function HomeView({
    orders = [],
    conversations = [],
    connectedPages = [],
    user,
    setActiveView
}: HomeViewProps) {
    const router = useRouter();

    const today = new Date();

    const greeting = useMemo(() => {
        const hour = today.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, [today]);

    const formattedDate = useMemo(() => {
        return today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, [today]);

    // Check if order date matches today
    const isToday = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    // Calculate Dashboard Stats
    const stats = useMemo(() => {
        const totalOrders = orders.length;

        // Sales & Revenue
        const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const todayRevenue = orders
            .filter(o => isToday(o.created_at || o.order_date))
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

        const todayOrders = orders.filter(o => isToday(o.created_at || o.order_date)).length;

        // Order Status counts
        const deliveredCount = orders.filter(o => o.order_status === 'Delivered').length;
        const cancelledCount = orders.filter(o => ['Cancel', 'Cancelled', 'Delivery Failed'].includes(o.order_status)).length;
        const pendingCount = totalOrders - deliveredCount - cancelledCount;

        // Conversations/Unread
        const totalConvs = conversations.length;
        const unreadConvs = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

        // Platform Breakdown
        const fbConvs = conversations.filter(c => c.platform === 'facebook').length;
        const igConvs = conversations.filter(c => c.platform === 'instagram').length;
        const ttConvs = conversations.filter(c => c.platform === 'tiktok').length;
        const marketplaceConvs = conversations.filter(c => c.platform === 'facebook_marketplace' || c.platform === 'marketplace').length;

        // Logistics/Shipments
        const inTransitOrders = orders.filter(o => ['Shipped', 'Delivery Process', 'Return Process'].includes(o.order_status));
        const activeShipmentsCount = inTransitOrders.length;

        const pathaoCount = orders.filter(o => o.courier_provider === 'pathao').length;
        const pickdropCount = orders.filter(o => o.courier_provider === 'pickdrop').length;
        const ncmCount = orders.filter(o => o.courier_provider === 'ncm').length;
        const localCount = orders.filter(o => o.courier_provider === 'local').length;
        const selfCount = orders.filter(o => o.courier_provider === 'self').length;

        // Finance
        const totalDeliveryCharge = orders.reduce((sum, o) => sum + (Number(o.delivery_charge) || 0), 0);
        const totalEstCourierFee = orders.reduce((sum, o) => sum + (Number(o.courier_delivery_fee) || 0), 0);
        const aov = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        // Recent 5 orders
        const recentOrders = [...orders]
            .sort((a, b) => new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime())
            .slice(0, 5);

        return {
            totalOrders,
            todayOrders,
            totalRevenue,
            todayRevenue,
            deliveredCount,
            cancelledCount,
            pendingCount,
            totalConvs,
            unreadConvs,
            platformBreakdown: {
                facebook: fbConvs,
                instagram: igConvs,
                tiktok: ttConvs,
                marketplace: marketplaceConvs
            },
            activeShipmentsCount,
            courierBreakdown: {
                pathao: pathaoCount,
                pickdrop: pickdropCount,
                ncm: ncmCount,
                local: localCount,
                self: selfCount
            },
            totalDeliveryCharge,
            totalEstCourierFee,
            aov,
            recentOrders
        };
    }, [orders, conversations]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'New Order':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
            case 'Confirmed Order':
                return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
            case 'Ready to Ship':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800';
            case 'Shipped':
            case 'Delivery Process':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800';
            case 'Delivered':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
            case 'Cancel':
            case 'Cancelled':
            case 'Delivery Failed':
                return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
    };

    const containerVariants: any = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants: any = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
    };

    return (
        <div className="flex-1 bg-gray-50 dark:bg-slate-900 overflow-y-auto p-4 md:p-6 custom-scrollbar transition-colors duration-200">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* 1. Header Card */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-6 md:p-8 text-white shadow-xl shadow-indigo-500/10"
                >
                    <div className="absolute right-0 top-0 -mr-6 -mt-6 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                    <div className="absolute left-1/3 bottom-0 -ml-6 -mb-6 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
                    
                    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md border border-white/10">
                                <Clock size={12} /> {formattedDate}
                            </span>
                            <h1 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">
                                {greeting}, {user?.full_name || 'Admin'}!
                            </h1>
                            <p className="text-indigo-100 text-sm md:text-base mt-1.5 max-w-xl font-medium">
                                Here is a quick snapshot of your messaging channels, sales operations, and logistics performance today.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 self-start md:self-auto">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold">
                                {connectedPages.length}
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Connected Pages</p>
                                <p className="text-sm font-bold">Channels Active</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Top Level Metrics Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <DollarSign size={22} />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <TrendingUp size={10} /> Today
                            </span>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Sales Revenue</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                Rs. {stats.totalRevenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Today: <span className="font-semibold text-indigo-600 dark:text-indigo-400">Rs. {stats.todayRevenue.toLocaleString()}</span>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                                <ShoppingBag size={22} />
                            </div>
                            {stats.todayOrders > 0 && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full">
                                    +{stats.todayOrders} New Today
                                </span>
                            )}
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Orders</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                {stats.totalOrders}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 flex gap-2">
                                <span className="text-emerald-600 font-medium">✓ {stats.deliveredCount} Delivered</span>
                                <span className="text-amber-500 font-medium">🕒 {stats.pendingCount} Pending</span>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                                <MessageCircle size={22} />
                            </div>
                            {stats.unreadConvs > 0 && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full animate-pulse">
                                    {stats.unreadConvs} Unread
                                </span>
                            )}
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Conversations</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                {stats.totalConvs}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Unread Messages: <span className="font-semibold text-purple-600 dark:text-purple-400">{stats.unreadConvs}</span>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <Truck size={22} />
                            </div>
                            {stats.activeShipmentsCount > 0 && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full">
                                    In Transit
                                </span>
                            )}
                        </div>
                        <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Shipments</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                {stats.activeShipmentsCount}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Out for Delivery / Shipped
                            </p>
                        </div>
                    </motion.div>
                </motion.div>

                {/* 3. Main Details Split Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Column 1: Conversations (Inbox Overview) & Logistics */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Inbox Channels Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/20">
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <MessageSquare className="text-indigo-500" size={18} />
                                    Inbox Channels
                                </h2>
                                <button
                                    onClick={() => setActiveView('messages', 'messages')}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                    Open Inbox <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/50 dark:border-blue-900/20 flex flex-col">
                                        <span className="text-[10px] font-bold text-blue-500 uppercase">Facebook</span>
                                        <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{stats.platformBreakdown.facebook}</span>
                                        <span className="text-[10px] text-slate-400">Chats</span>
                                    </div>
                                    <div className="bg-pink-50/50 dark:bg-pink-950/10 p-3 rounded-xl border border-pink-100/50 dark:border-pink-900/20 flex flex-col">
                                        <span className="text-[10px] font-bold text-pink-500 uppercase">Instagram</span>
                                        <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{stats.platformBreakdown.instagram}</span>
                                        <span className="text-[10px] text-slate-400">Chats</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800 flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">TikTok</span>
                                        <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{stats.platformBreakdown.tiktok}</span>
                                        <span className="text-[10px] text-slate-400">Chats</span>
                                    </div>
                                    <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex flex-col">
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase">Marketplace</span>
                                        <span className="text-lg font-extrabold text-slate-800 dark:text-white mt-1">{stats.platformBreakdown.marketplace}</span>
                                        <span className="text-[10px] text-slate-400">Listings</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Courier Performance Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/20">
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Truck className="text-emerald-500" size={18} />
                                    Courier Utilization
                                </h2>
                                <button
                                    onClick={() => setActiveView('delivery')}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                    Deliveries <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <div className="p-5 space-y-3.5">
                                {[
                                    { name: 'Pathao Parcel', count: stats.courierBreakdown.pathao, color: 'bg-red-500' },
                                    { name: 'Pick & Drop', count: stats.courierBreakdown.pickdrop, color: 'bg-orange-500' },
                                    { name: 'NCM (Nepal Can Move)', count: stats.courierBreakdown.ncm, color: 'bg-indigo-500' },
                                    { name: 'Local Deliveries', count: stats.courierBreakdown.local, color: 'bg-emerald-500' },
                                    { name: 'Self Delivered', count: stats.courierBreakdown.self, color: 'bg-blue-500' }
                                ]
                                    .filter(c => c.count > 0 || c.name === 'Pathao Parcel' || c.name === 'Local Deliveries')
                                    .map(courier => {
                                        const percentage = stats.totalOrders > 0
                                            ? Math.round((courier.count / stats.totalOrders) * 100)
                                            : 0;
                                        return (
                                            <div key={courier.name} className="space-y-1">
                                                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                    <span>{courier.name}</span>
                                                    <span className="font-bold">{courier.count} ({percentage}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                    <div className={`h-full ${courier.color}`} style={{ width: `${percentage}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </motion.div>
                    </div>

                    {/* Column 2: Recent Orders & Pipeline Summary */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Order Pipeline Progress Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/20">
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="text-purple-500" size={18} />
                                    Order Fulfillment Pipeline
                                </h2>
                                <button
                                    onClick={() => setActiveView('orders')}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                    Manage Orders <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center flex-shrink-0">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Orders</p>
                                            <p className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">
                                                {orders.filter(o => o.order_status === 'New Order').length}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmed</p>
                                            <p className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">
                                                {orders.filter(o => o.order_status === 'Confirmed Order').length}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center flex-shrink-0">
                                            <Truck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Transit</p>
                                            <p className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">
                                                {orders.filter(o => ['Shipped', 'Delivery Process'].includes(o.order_status)).length}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
                                            <p className="text-xl font-extrabold text-slate-850 dark:text-white mt-0.5">
                                                {stats.deliveredCount}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent Orders List Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/20">
                                <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <ShoppingBag className="text-indigo-500" size={18} />
                                    Recent Orders
                                </h2>
                                <button
                                    onClick={() => setActiveView('orders')}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
                                >
                                    View All Orders <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <div className="p-5">
                                {stats.recentOrders.length === 0 ? (
                                    <div className="text-center py-10">
                                        <ShoppingBag className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
                                        <p className="text-sm text-slate-500 font-medium">No recent orders found</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-slate-700 text-slate-400 uppercase text-[10px] tracking-wider">
                                                    <th className="pb-3 px-1">Order #</th>
                                                    <th className="pb-3 px-1">Customer</th>
                                                    <th className="pb-3 px-1 text-center">Status</th>
                                                    <th className="pb-3 px-1 text-right">Total</th>
                                                    <th className="pb-3 px-1 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                {stats.recentOrders.map((order) => (
                                                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                        <td className="py-3 px-1 text-indigo-600 dark:text-indigo-400 font-bold">
                                                            #{order.order_number}
                                                        </td>
                                                        <td className="py-3 px-1 text-slate-800 dark:text-slate-200">
                                                            <div className="font-bold">{order.customer_name}</div>
                                                            <div className="text-[10px] text-slate-400">{new Date(order.created_at || order.order_date).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="py-3 px-1 text-center">
                                                            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${getStatusStyle(order.order_status)}`}>
                                                                {order.order_status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-1 text-right text-slate-900 dark:text-white font-extrabold">
                                                            Rs. {order.total_amount?.toLocaleString() || '0'}
                                                        </td>
                                                        <td className="py-3 px-1 text-center">
                                                            <button
                                                                onClick={() => router.push(`/orders/${order.id}`)}
                                                                className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 4. Financial Summary Card (Full Width) */}
                {(user?.role === 'admin' || user?.role === 'editor') && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/20">
                            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <BarChart3 className="text-emerald-500" size={18} />
                                Operations Financial Overview
                            </h2>
                            <button
                                onClick={() => setActiveView('finance')}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
                            >
                                Open Financials <ArrowUpRight size={14} />
                            </button>
                        </div>
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Average Order Value (AOV)</span>
                                <span className="text-2xl font-black text-slate-850 dark:text-white mt-2">Rs. {Math.round(stats.aov).toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 mt-1">Gross sales / orders</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Delivery Charges Collected</span>
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-2">Rs. {stats.totalDeliveryCharge.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 mt-1">Amount charged to customers</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Est. Courier Shipping Cost</span>
                                <span className="text-2xl font-black text-amber-600 mt-2">Rs. {stats.totalEstCourierFee.toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 mt-1">Based on courier API estimates</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Net Shipping Margin</span>
                                <span className={`text-2xl font-black mt-2 ${stats.totalDeliveryCharge - stats.totalEstCourierFee >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    Rs. {(stats.totalDeliveryCharge - stats.totalEstCourierFee).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">Charges collected minus courier fees</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
