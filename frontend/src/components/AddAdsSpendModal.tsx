import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Loader2, Plus, LayoutGrid, FileText } from 'lucide-react';
import axios from 'axios';

interface AddAdsSpendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingSpend?: any;
}

export default function AddAdsSpendModal({ isOpen, onClose, onSuccess, editingSpend }: AddAdsSpendModalProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [campaignId, setCampaignId] = useState('');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCampaigns();
            if (editingSpend) {
                setDate(editingSpend.date);
                setCampaignId(editingSpend.campaign_id);
                setAmount(editingSpend.amount.toString());
                setRemarks(editingSpend.remarks || '');
            } else {
                setDate(new Date().toISOString().split('T')[0]);
                setCampaignId('');
                setAmount('');
                setRemarks('');
            }
        }
    }, [isOpen, editingSpend]);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                // Only show campaigns with status 'On' and exclude "No Ads Cost Campaign"
                setCampaigns(res.data.data.filter((c: any) => c.status === 'On' && c.name !== 'No Ads Cost Campaign'));

            }
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignId || !amount || !date) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/spends${editingSpend ? `/${editingSpend.id}` : ''}`;
            const method = editingSpend ? 'put' : 'post';

            const res = await axios[method](url, {
                campaign_id: campaignId,
                date,
                amount: parseFloat(amount),
                remarks
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                onSuccess();
            } else {
                alert('Failed to save: ' + (res.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            alert('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <DollarSign className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {editingSpend ? 'Edit Ads Spend' : 'Add Ads Spend'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (Rs.)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all"
                                    placeholder="0.00"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Campaign</label>
                        <div className="relative">
                            <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={campaignId}
                                onChange={(e) => setCampaignId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all appearance-none"
                                required
                            >
                                <option value="">Select Campaign</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Remarks</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all min-h-[100px] resize-none"
                                placeholder="Add any details..."
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingSpend ? 'Save Changes' : 'Record Spend')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
