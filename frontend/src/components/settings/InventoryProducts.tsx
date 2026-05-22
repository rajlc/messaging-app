import { useState, useEffect } from 'react';
import { Package, Search, RefreshCw, ExternalLink } from 'lucide-react';

interface Product {
    id: string;
    product_name: string;
    image_url: string;
    est_price: number;
    product_type: string;
    product_id: string;
}

export default function InventoryProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [configUrl, setConfigUrl] = useState('');

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchProducts(search);
        }, 500); // Debounce search by 500ms

        return () => clearTimeout(timeoutId);
    }, [search]); // Re-run when search changes

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data && data.INV_APP_URL) {
                setConfigUrl(data.INV_APP_URL);
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const fetchProducts = async (searchTerm = '') => {
        setLoading(true);
        try {
            const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/inventory-products${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProducts(data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    // No client-side filtering needed anymore
    const filteredProducts = products;

    return (
        <div className="h-full flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-slate-100">Inventory Products</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Products synced from external Inventory App</p>
                </div>
                <button
                    onClick={() => fetchProducts(search)}
                    disabled={loading}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shadow-sm border border-gray-200 dark:border-slate-700"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner"
                />
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
                        <tr>
                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Product</th>
                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SKU / ID</th>
                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Price</th>
                            <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {loading && products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    Loading products...
                                </td>
                            </tr>
                        ) : filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 group border-l-[3px] border-transparent hover:border-indigo-500 cursor-default">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package size={20} className="text-slate-400 dark:text-slate-500" />
                                                )}
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-slate-200">{product.product_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{product.product_id}</td>
                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider shadow-sm">
                                            {product.product_type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-900 dark:text-slate-100 text-right">
                                        Rs. {product.est_price?.toLocaleString() || '-'}
                                    </td>
                                    <td className="p-4 text-center">
                                        {configUrl && (
                                            <a
                                                href={`${configUrl}/dashboard/inventory/${product.id}`} // Assuming URL structure
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                                                title="View in Inventory App"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    {search ? 'No products found matching search.' : 'No products loaded. Check connection settings.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
