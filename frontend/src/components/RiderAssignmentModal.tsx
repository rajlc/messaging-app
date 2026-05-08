"use client";

import { useState, useEffect } from 'react';
import { X, User, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

interface Rider {
    id: string;
    full_name: string;
    email: string;
    is_delivery_person: boolean;
}

interface RiderAssignmentModalProps {
    orderIds: string[];
    orderNumber?: string;
    onClose: () => void;
    onAssigned: () => void;
}

export default function RiderAssignmentModal({ orderIds, orderNumber, onClose, onAssigned }: RiderAssignmentModalProps) {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState<string | null>(null);

    useEffect(() => {
        fetchRiders();
    }, []);

    const fetchRiders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/users/staff`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Filter riders who are designated as delivery persons
            const deliveryPersons = (res.data || []).filter((u: Rider) => u.is_delivery_person === true);
            setRiders(deliveryPersons);
        } catch (error) {
            console.error('Failed to fetch riders', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (riderId: string) => {
        setAssigning(riderId);
        try {
            const token = localStorage.getItem('token');
            let successCount = 0;
            let failCount = 0;

            for (const id of orderIds) {
                try {
                    await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${id}/assign-rider`, 
                        { riderId },
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    successCount++;
                } catch (err) {
                    failCount++;
                }
            }

            if (orderIds.length > 1) {
                alert(`Bulk Process Complete!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
            }

            onAssigned();
            onClose();
        } catch (error) {
            console.error('Failed to assign rider', error);
            alert('Failed to assign rider. Please try again.');
        } finally {
            setAssigning(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign to Rider</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {orderIds.length === 1 ? `Order #${orderNumber}` : `${orderIds.length} Orders Selected`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                            <p className="text-sm text-slate-500">Loading delivery persons...</p>
                        </div>
                    ) : riders.length > 0 ? (
                        <div className="space-y-2">
                            {riders.map((rider) => (
                                <button
                                    key={rider.id}
                                    onClick={() => handleAssign(rider.id)}
                                    disabled={!!assigning}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <User size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-900 dark:text-white">{rider.full_name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{rider.email}</p>
                                        </div>
                                    </div>
                                    {assigning === rider.id ? (
                                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={18} className="text-slate-200 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-400 mb-4">
                                <User size={32} />
                            </div>
                            <p className="text-slate-900 dark:text-white font-bold">No Riders Found</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">Designate staff as "Delivery Person" in Settings to see them here.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
