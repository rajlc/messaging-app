"use client";

import { useState, useEffect } from 'react';
import { X, Package, Trash2, Plus, Edit2, Save } from 'lucide-react';
import axios from 'axios';

interface ViewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
}

export default function ViewOrderModal({ isOpen, onClose, customerId }: ViewOrderModalProps) {
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editedOrder, setEditedOrder] = useState<any>(null);

    useEffect(() => {
        if (isOpen && customerId) {
            loadOrders();
        }
    }, [isOpen, customerId]);

    const loadOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders?customer_id=${customerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOrders(response.data || []);
            if (response.data && response.data.length > 0) {
                setSelectedOrder(response.data[0]);
                setEditedOrder(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (editedOrder.courier_provider && (editedOrder.courier_delivery_fee || 0) <= 0) {
                alert("Est Delivery Cost is required");
                setLoading(false);
                return;
            }
            const token = localStorage.getItem('token');
            // Update order logic here
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${editedOrder.id}`, editedOrder, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Order updated successfully!');
            setIsEditing(false);
            loadOrders();
        } catch (error: any) {
            alert('Failed to update order: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...editedOrder.items];
        (newItems[index] as any)[field] = value;
        if (field === 'qty' || field === 'amount') {
            newItems[index].total_amount = newItems[index].qty * newItems[index].amount;
        }
        setEditedOrder({ ...editedOrder, items: newItems });
    };

    const addItem = () => {
        setEditedOrder({
            ...editedOrder,
            items: [...editedOrder.items, { product_name: '', qty: 1, amount: 0, total_amount: 0 }]
        });
    };

    const removeItem = (index: number) => {
        setEditedOrder({
            ...editedOrder,
            items: editedOrder.items.filter((_: any, i: number) => i !== index)
        });
    };

    if (!isOpen) return null;

    const displayOrder = isEditing ? editedOrder : selectedOrder;
    const totalAmount = displayOrder?.items?.reduce((sum: number, item: any) => sum + (item.qty * item.amount), 0) + (displayOrder?.delivery_charge || 0);

    return (
        <div className="flex flex-col h-full">
            <div className="pb-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Package className="text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {orders.length > 0 ? `Orders (${orders.length})` : 'No Orders'}
                    </h2>
                </div>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-2 p-8 text-center">
                    <Package className="w-12 h-12 opacity-50 mb-2" />
                    <p className="font-semibold text-slate-900 dark:text-white">No Previous Orders</p>
                    <p className="text-xs max-w-[200px]">This customer hasn't placed any orders yet.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Order Selector */}
                    {orders.length > 1 && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Select Order</label>
                            <select
                                value={selectedOrder?.id}
                                onChange={(e) => {
                                    const order = orders.find(o => o.id === e.target.value);
                                    setSelectedOrder(order);
                                    setEditedOrder(order);
                                    setIsEditing(false);
                                }}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                {orders.map((order) => (
                                    <option key={order.id} value={order.id}>
                                        {order.order_number} - {new Date(order.created_at).toLocaleDateString()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {displayOrder && (
                        <>
                            {/* Row 1: Customer Name */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Customer Name</label>
                                <input
                                    type="text"
                                    value={displayOrder.customer_name}
                                    onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, customer_name: e.target.value })}
                                    readOnly={!isEditing}
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Row 2: Phone Number and Alternative Phone */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Phone Number</label>
                                    <input
                                        type="text"
                                        value={displayOrder.phone_number}
                                        onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, phone_number: e.target.value })}
                                        readOnly={!isEditing}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Alternative Phone</label>
                                    <input
                                        type="text"
                                        value={displayOrder.alternative_phone || ''}
                                        onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, alternative_phone: e.target.value })}
                                        readOnly={!isEditing}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Address */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Address</label>
                                <input
                                    type="text"
                                    value={displayOrder.address}
                                    onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, address: e.target.value })}
                                    readOnly={!isEditing}
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Row: Remarks */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Remarks</label>
                                <textarea
                                    value={displayOrder.remarks || ''}
                                    onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, remarks: e.target.value })}
                                    readOnly={!isEditing}
                                    placeholder="No remarks"
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none"
                                />
                            </div>

                            {/* Package Description (Display for all, editable if needed) */}
                            {(displayOrder.package_description || isEditing) && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Package Description</label>
                                    <input
                                        type="text"
                                        value={displayOrder.package_description || ''}
                                        onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, package_description: e.target.value })}
                                        readOnly={!isEditing}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="General Items"
                                    />
                                </div>
                            )}

                            {/* Logistics Section */}
                            {(displayOrder.logistic_name || displayOrder.courier_provider || displayOrder.city_name) && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg p-3">
                                    <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2 block">
                                        {displayOrder.logistic_name ? 'LOCAL LOGISTICS' : 'COURIER LOGISTICS'}
                                    </label>

                                    {isEditing && (
                                        <div className="mb-3">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Change Provider</label>
                                            <select
                                                value={displayOrder.courier_provider || ''}
                                                onChange={(e) => setEditedOrder({ ...editedOrder, courier_provider: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                            >
                                                <option value="">None</option>
                                                <option value="pathao">Pathao Parcel</option>
                                                <option value="pickdrop">Pick & Drop</option>
                                                <option value="ncm">Nepal Can Move (NCM)</option>
                                                <option value="local">Local</option>
                                                <option value="self">Self Delivered</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Local Logistics */}
                                    {displayOrder.logistic_name && (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Logistics Name</p>
                                                    <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.logistic_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Branch</p>
                                                    <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.delivery_branch || 'N/A'}</p>
                                                </div>
                                            </div>
                                            {displayOrder.courier_delivery_fee && (
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Est Cost</p>
                                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">Rs. {displayOrder.courier_delivery_fee}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Pathao/Courier Logistics */}
                                    {displayOrder.courier_provider && !displayOrder.logistic_name && (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Provider</p>
                                                    <p className="text-sm text-slate-900 dark:text-white font-semibold">
                                                        {displayOrder.courier_provider === 'self' ? 'Self Delivered' : displayOrder.courier_provider.charAt(0).toUpperCase() + displayOrder.courier_provider.slice(1)}
                                                    </p>
                                                </div>
                                                {displayOrder.city_name && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">City</p>
                                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.city_name}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* NCM Specific Fields */}
                                            {displayOrder.courier_provider === 'ncm' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">From Branch</p>
                                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.ncm_from_branch || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">To Branch</p>
                                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.ncm_to_branch || 'N/A'}</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Delivery Type</p>
                                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.ncm_delivery_type || 'Door2Door'}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                {displayOrder.zone_name && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Zone</p>
                                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.zone_name}</p>
                                                    </div>
                                                )}
                                                {displayOrder.area_name && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Area</p>
                                                        <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.area_name}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {displayOrder.weight && (
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Weight</p>
                                                    <p className="text-sm text-slate-900 dark:text-white font-semibold">{displayOrder.weight} kg</p>
                                                </div>
                                            )}
                                            {displayOrder.courier_delivery_fee && (
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Delivery Fee</p>
                                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">Rs. {displayOrder.courier_delivery_fee}</p>
                                                </div>
                                            )}
                                            {displayOrder.courier_consignment_id && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">Consignment ID</p>
                                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-mono font-semibold">{displayOrder.courier_consignment_id}</p>
                                                    </div>
                                                    {displayOrder.shipped_at && (
                                                        <div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">Shipped At</p>
                                                            <p className="text-sm text-slate-900 dark:text-white font-semibold">{new Date(displayOrder.shipped_at).toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Row 4: Order Items */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Order Items</label>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                                        >
                                            <Plus size={14} /> Add Item
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {displayOrder.items?.map((item: any, index: number) => (
                                        <div key={index} className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg space-y-2 border border-gray-100 dark:border-transparent">
                                            {/* Product Name - Full Width */}
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Product Name"
                                                    value={item.product_name}
                                                    onChange={(e) => isEditing && updateItem(index, 'product_name', e.target.value)}
                                                    readOnly={!isEditing}
                                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>

                                            {/* Quantity and Amount - Same Row */}
                                            <div className="flex gap-2 items-center">
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Quantity</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={item.qty}
                                                        onChange={(e) => isEditing && updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                                                        readOnly={!isEditing}
                                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Amount</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Price"
                                                        value={item.amount}
                                                        onChange={(e) => isEditing && updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                                        readOnly={!isEditing}
                                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                {isEditing && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        disabled={displayOrder.items.length === 1}
                                                        className="mt-5 p-2 text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Delivery Charge */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Delivery Charge</label>
                                <input
                                    type="number"
                                    value={displayOrder.delivery_charge || 0}
                                    onChange={(e) => isEditing && setEditedOrder({ ...editedOrder, delivery_charge: parseFloat(e.target.value) || 0 })}
                                    readOnly={!isEditing}
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Order Status */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Order Status</label>
                                {isEditing ? (
                                    <select
                                        value={displayOrder.order_status}
                                        onChange={(e) => setEditedOrder({ ...editedOrder, order_status: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="New Order">New Order</option>
                                        <option value="Confirmed Order">Confirmed Order</option>
                                        <option value="Ready to Ship">Ready to Ship</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivery Process">Delivery Process</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Delivery Failed">Delivery Failed</option>
                                        <option value="Hold">Hold</option>
                                        <option value="Return Process">Return Process</option>
                                        <option value="Return Delivered">Return Delivered</option>
                                        <option value="Follow up again">Follow up again</option>
                                        <option value="Cancel">Cancel</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={displayOrder.order_status}
                                        readOnly
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                                    />
                                )}
                            </div>

                            {/* Total Amount */}
                            <div className="flex justify-between items-center bg-gray-100 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-transparent">
                                <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Total Amount</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">Rs. {totalAmount.toLocaleString()}</p>
                            </div>
                        </>
                    )}
                </div>
            )}




            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-all font-semibold"
                >
                    Close
                </button>
                {displayOrder && (
                    <>
                        {isEditing ? (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg text-sm text-white font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleEdit}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg text-sm text-white font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Edit2 size={16} />
                                Edit Order
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
