import React, { useState, useEffect } from 'react';
import { X, Calendar, Facebook, Instagram, Globe, Package, DollarSign, Search, Check, Loader2, Plus } from 'lucide-react';
import axios from 'axios';

interface AddBoostingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Page {
    id: string;
    platform: string;
    page_name: string;
}

interface Product {
    product_id: string;
    product_name: string;
}

export default function AddBoostingModal({ isOpen, onClose, onSuccess }: AddBoostingModalProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [platform, setPlatform] = useState('Facebook');
    const [pageName, setPageName] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [cost, setCost] = useState('');

    const [pages, setPages] = useState<Page[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchPages();
            fetchProducts();
        }
    }, [isOpen]);

    const fetchPages = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPages(res.data || []);
        } catch (error) {
            console.error('Failed to fetch pages:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/inventory-products?search=`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                setAllProducts(res.data.data);
            } else if (Array.isArray(res.data)) {
                setAllProducts(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    const filteredPages = pages.filter(p => {
        if (platform === 'Facebook') return p.platform.toLowerCase() === 'facebook';
        if (platform === 'Instagram') return p.platform.toLowerCase() === 'instagram';
        return true;
    });

    const toggleProduct = (name: string) => {
        if (selectedProducts.includes(name)) {
            setSelectedProducts(selectedProducts.filter(p => p !== name));
        } else {
            setSelectedProducts([...selectedProducts, name]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !platform || !pageName || !cost) {
            alert('Please fill all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/boosting-costs`, {
                date,
                platform,
                page_name: pageName,
                product_names: selectedProducts,
                cost: parseFloat(cost)
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                onSuccess();
            } else {
                alert('Failed to save: ' + res.data.error);
            }
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <Plus className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-whiteTracking-tight">Add Boosting Cost</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Date */}
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

                    {/* Platform */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Platform</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => { setPlatform('Facebook'); setPageName(''); }}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-bold text-xs ${platform === 'Facebook' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-gray-100 dark:border-slate-800 text-slate-500'}`}
                            >
                                <Facebook size={16} /> Facebook
                            </button>
                            <button
                                type="button"
                                onClick={() => { setPlatform('Instagram'); setPageName(''); }}
                                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all font-bold text-xs ${platform === 'Instagram' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'border-gray-100 dark:border-slate-800 text-slate-500'}`}
                            >
                                <Instagram size={16} /> Instagram
                            </button>
                        </div>
                    </div>

                    {/* Page Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Page Name</label>
                        <select
                            value={pageName}
                            onChange={(e) => setPageName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all appearance-none"
                            required
                        >
                            <option value="">Select Page</option>
                            {filteredPages.map(p => (
                                <option key={p.id} value={p.page_name}>{p.page_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Product Selection (Multi) */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Product Name (Multiple)</label>
                        <div className="relative">
                            <div
                                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer flex flex-wrap gap-1 min-h-[42px]"
                            >
                                {selectedProducts.length === 0 ? (
                                    <span className="text-slate-400 font-medium">Select products...</span>
                                ) : (
                                    selectedProducts.map(p => (
                                        <span key={p} className="bg-white dark:bg-slate-700 px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-sm border border-gray-100 dark:border-slate-600">
                                            {p}
                                            <X size={10} className="hover:text-red-500" onClick={(e) => { e.stopPropagation(); toggleProduct(p); }} />
                                        </span>
                                    ))
                                )}
                            </div>

                            {isProductDropdownOpen && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 border-b border-gray-50 dark:border-slate-700">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search products..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-900 border border-transparent rounded-lg text-xs font-bold outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto p-1 py-2 custom-scrollbar">
                                        {allProducts
                                            .filter(p => !productSearch || p.product_name.toLowerCase().includes(productSearch.toLowerCase()))
                                            .map(p => (
                                                <div
                                                    key={p.product_id}
                                                    onClick={() => toggleProduct(p.product_name)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-between group ${selectedProducts.includes(p.product_name) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'}`}
                                                >
                                                    {p.product_name}
                                                    {selectedProducts.includes(p.product_name) && <Check size={14} />}
                                                </div>
                                            ))}
                                        {allProducts.length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400 font-medium italic">No products found</div>
                                        )}
                                    </div>
                                    <div className="p-2 bg-gray-50 dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsProductDropdownOpen(false)}
                                            className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cost */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Cost (Amount)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="number"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Saving Record...
                            </>
                        ) : (
                            'Save Boosting Cost'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
