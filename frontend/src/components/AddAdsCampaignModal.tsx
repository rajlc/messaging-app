import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Check, Loader2, Plus, Search } from 'lucide-react';
import axios from 'axios';

interface AddAdsCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingCampaign?: any;
}

export default function AddAdsCampaignModal({ isOpen, onClose, onSuccess, editingCampaign }: AddAdsCampaignModalProps) {
    const [name, setName] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProductDropdownOpen(false);
            }
        };

        if (isProductDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProductDropdownOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            if (editingCampaign) {
                setName(editingCampaign.name);
                setSelectedProducts(editingCampaign.product_names || []);
            } else {
                setName('');
                setSelectedProducts([]);
            }
        }
    }, [isOpen, editingCampaign]);

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

    const toggleProduct = (productName: string) => {
        if (selectedProducts.includes(productName)) {
            setSelectedProducts(selectedProducts.filter(p => p !== productName));
        } else {
            setSelectedProducts([...selectedProducts, productName]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/campaigns${editingCampaign ? `/${editingCampaign.id}` : ''}`;
            const method = editingCampaign ? 'put' : 'post';

            const res = await axios[method](url, {
                name,
                product_names: selectedProducts
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                onSuccess();
            } else {
                alert('Failed to save: ' + (res.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredProducts = allProducts.filter(p =>
        p.product_name.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <Package className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {editingCampaign ? 'Edit Ads Campaign' : 'Add Ads Campaign'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Campaign Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none transition-all"
                            placeholder="Enter campaign name..."
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Product Name (Multiple)</label>
                        <div className="relative" ref={dropdownRef}>
                            <div
                                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 dark:text-white cursor-pointer flex flex-wrap gap-1 min-h-[42px]"
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
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold outline-none"
                                                placeholder="Search products..."
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.product_id}
                                                onClick={() => toggleProduct(product.product_name)}
                                                className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors"
                                            >
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{product.product_name}</span>
                                                {selectedProducts.includes(product.product_name) && (
                                                    <Check size={14} className="text-indigo-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingCampaign ? 'Save Changes' : 'Create Campaign')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
