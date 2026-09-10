'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShoppingBag,
  RefreshCw,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Receipt,
  Truck,
  Copy,
  CheckCheck
} from 'lucide-react';

export interface ImportantPoint {
  type: 'phone' | 'address' | 'order' | 'issue' | 'inquiry' | 'human_help' | 'general';
  label: string;
  value: string;
  urgency?: 'normal' | 'medium' | 'high';
}

export interface OrderAnalysisItem {
  name: string;
  quantity?: number;
  price?: number | string;
  notes?: string;
}

export interface OrderAnalysis {
  phone?: string;
  phones?: string[];
  address?: string;
  confirmed_products?: OrderAnalysisItem[];
  product_price?: number | string;
  ai_quoted_price?: number | string;
  delivery_charge?: string;
  total_amount?: number | string;
  order_notes?: string;
}

export interface ConversationTriageResult {
  status: 'order_confirmed' | 'urgent_issue' | 'item_inquiry' | 'resolved' | 'normal';
  urgency: 'low' | 'medium' | 'high';
  important_points: ImportantPoint[];
  order_analysis?: OrderAnalysis;
  ai_action_summary: string;
  customer_current_intent: string;
  suggested_action: string;
  analyzed_at: string;
}

interface AiChatIntelligenceProps {
  conversationId: string;
  initialTriage?: ConversationTriageResult | null;
  customerOrders?: any[];
  onTriageChange?: (newTriage: ConversationTriageResult) => void;
  onCreateOrderPrefill?: (data: { phone?: string; address?: string }) => void;
}

export default function AiChatIntelligence({
  conversationId,
  initialTriage,
  customerOrders,
  onTriageChange,
  onCreateOrderPrefill
}: AiChatIntelligenceProps) {
  const [triage, setTriage] = useState<ConversationTriageResult | null>(initialTriage || null);
  const [loading, setLoading] = useState<boolean>(!initialTriage);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [resolving, setResolving] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper to detect placeholder sentences like "Already available from previous order"
  const isPlaceholderPhone = (val?: string | null): boolean => {
    if (!val) return true;
    const lower = String(val).toLowerCase();
    return (
      (lower.includes('already') || lower.includes('previous') || lower.includes('record') || lower.includes('available') || lower.includes('on file')) &&
      !/(?:98\d{8}|97\d{8}|01\d{7})/.test(val)
    );
  };

  // Extract real phone numbers from past customer orders
  const pastOrderPhones = React.useMemo(() => {
    const list: string[] = [];
    if (customerOrders && customerOrders.length > 0) {
      for (const ord of customerOrders) {
        const rawCandidates = [ord.phone_number, ord.customer_phone, ord.alternative_phone, ord.alt_phone];
        for (const raw of rawCandidates) {
          if (!raw) continue;
          const cleanRaw = String(raw).trim();
          const matches = cleanRaw.match(/(?:\+?977[- ]?)?(?:98\d{8}|97\d{8}|01[- ]?\d{7})/g);
          if (matches) {
            for (const m of matches) {
              const digits = m.replace(/[\s\-\(\)]/g, '').replace(/^(?:\+?977)/, '');
              if (digits && !list.includes(digits)) list.push(digits);
            }
          } else {
            const digits = cleanRaw.replace(/\D/g, '');
            const norm = digits.startsWith('977') && digits.length > 10 ? digits.slice(3) : digits;
            if ((norm.length === 10 || norm.length === 9 || norm.length === 8) && !list.includes(norm)) {
              list.push(norm);
            }
          }
        }
      }
    }
    return list;
  }, [customerOrders]);

  // Helper to get distinct list of phone numbers
  const getDistinctPhones = (): string[] => {
    const list: string[] = [];
    if (triage?.order_analysis) {
      if (Array.isArray(triage.order_analysis.phones)) {
        for (const p of triage.order_analysis.phones) {
          const clean = String(p).trim();
          if (clean && !isPlaceholderPhone(clean) && !list.includes(clean)) {
            list.push(clean);
          }
        }
      }
      if (triage.order_analysis.phone && !isPlaceholderPhone(triage.order_analysis.phone)) {
        const parts = String(triage.order_analysis.phone).split(',').map(s => s.trim());
        for (const p of parts) {
          if (p && !isPlaceholderPhone(p) && !list.includes(p)) {
            list.push(p);
          }
        }
      }
    }

    if (Array.isArray(triage?.important_points)) {
      for (const pt of triage!.important_points) {
        if (pt.type === 'phone' && pt.value && !isPlaceholderPhone(pt.value)) {
          const matches = pt.value.match(/(?:98\d{8}|97\d{8}|01\d{7})/g);
          if (matches) {
            for (const m of matches) {
              if (!list.includes(m)) list.push(m);
            }
          }
        }
      }
    }

    // If chat has no direct phone, but customer has phone on file from past orders:
    if (list.length === 0 && pastOrderPhones.length > 0) {
      return pastOrderPhones;
    }
    return list;
  };

  // Sync with prop if it changes
  useEffect(() => {
    if (initialTriage) {
      setTriage(initialTriage);
      setLoading(false);
    } else {
      fetchTriage();
    }
  }, [conversationId, initialTriage]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const fetchTriage = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/triage`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setTriage(data.data);
        if (onTriageChange) onTriageChange(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch triage intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!conversationId || refreshing) return;
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/triage/summary`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setTriage(data.data);
        if (onTriageChange) onTriageChange(data.data);
      }
    } catch (err) {
      console.error('Failed to refresh triage intelligence:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkDone = async () => {
    if (!conversationId || resolving) return;
    try {
      setResolving(true);
      const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/triage/resolve`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data?.success && data?.data) {
        setTriage(data.data);
        if (onTriageChange) onTriageChange(data.data);
      }
    } catch (err) {
      console.error('Failed to resolve triage:', err);
    } finally {
      setResolving(false);
    }
  };

  // Status visual badge
  const renderStatusBadge = () => {
    if (!triage) return null;

    switch (triage.status) {
      case 'order_confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
            <ShoppingBag size={13} className="text-emerald-600 dark:text-emerald-400" />
            Order Confirmed
          </span>
        );
      case 'urgent_issue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs animate-pulse">
            <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400" />
            Urgent Issue / Damage
          </span>
        );
      case 'item_inquiry':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
            <HelpCircle size={13} className="text-amber-600 dark:text-amber-400" />
            Product Inquiry
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
            <CheckCircle2 size={13} className="text-slate-500 dark:text-slate-400" />
            Solved / Handled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs">
            <Sparkles size={13} className="text-blue-500" />
            Normal Chat
          </span>
        );
    }
  };

  const phoneList = getDistinctPhones();

  return (
    <div className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all my-0">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-3.5 py-2.5 bg-linear-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/95 dark:to-slate-800/95 backdrop-blur-xs border-b border-gray-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
            Chat Intelligence
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          {renderStatusBadge()}

          {/* "Done" button */}
          {triage && triage.status !== 'resolved' ? (
            <button
              onClick={handleMarkDone}
              disabled={resolving}
              title="Mark this customer inquiry or issue as Solved (clears status icon)"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Check size={13} className="stroke-[3]" />
              {resolving ? 'Saving...' : 'Done'}
            </button>
          ) : triage?.status === 'resolved' ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
              <CheckCircle2 size={13} /> Solved
            </span>
          ) : null}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Re-analyze chat messages with AI"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Content Area - Scrollable when content is long */}
      <div className="p-3.5 space-y-3 overflow-y-auto max-h-[460px] custom-scrollbar">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={20} className="animate-spin text-indigo-500" />
            <span className="text-[13px] font-medium">Analyzing chat history...</span>
          </div>
        ) : !triage ? (
          <div className="text-center py-6 text-[13px] text-slate-400">
            No intelligence data available. Click refresh to analyze.
          </div>
        ) : (
          <>
            {/* 1. Important Points (Key detected items) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Important Points
                </span>
                {triage.important_points?.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {triage.important_points.length}
                  </span>
                )}
              </div>

              {triage.important_points && triage.important_points.length > 0 ? (
                <div className="space-y-2">
                  {triage.important_points.map((pt, idx) => {
                    const isUrgent = pt.urgency === 'high' || pt.type === 'issue';
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors border ${
                          isUrgent
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                            : pt.type === 'phone'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200'
                            : pt.type === 'address'
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {pt.type === 'phone' && <Phone size={15} className="text-emerald-600 dark:text-emerald-400" />}
                          {pt.type === 'address' && <MapPin size={15} className="text-blue-600 dark:text-blue-400" />}
                          {pt.type === 'issue' && <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400" />}
                          {pt.type === 'order' && <ShoppingBag size={15} className="text-indigo-600 dark:text-indigo-400" />}
                          {pt.type === 'inquiry' && <HelpCircle size={15} className="text-amber-600 dark:text-amber-400" />}
                          {pt.type === 'human_help' && <UserCheck size={15} className="text-purple-600 dark:text-purple-400" />}
                          {pt.type === 'general' && <Sparkles size={15} className="text-slate-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs leading-tight mb-0.5 text-slate-500 dark:text-slate-400">
                            {pt.type === 'phone' && isPlaceholderPhone(pt.value) && pastOrderPhones.length > 0 ? 'Phone Number' : pt.label}
                          </div>
                          <div className="font-semibold text-[13.5px] leading-snug break-words">
                            {pt.type === 'phone' && isPlaceholderPhone(pt.value) && pastOrderPhones.length > 0 ? (
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 dark:text-slate-100 select-all">{pastOrderPhones[0]}</span>
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.2 rounded">
                                  on file
                                </span>
                              </div>
                            ) : (
                              pt.value
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-2.5 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-slate-800 text-xs text-slate-400">
                  No critical contact, address, or issue flags detected.
                </div>
              )}
            </div>

            {/* 2. Order Analysis Section */}
            {triage.order_analysis && (
              phoneList.length > 0 ||
              (triage.order_analysis.phone && !isPlaceholderPhone(triage.order_analysis.phone)) ||
              triage.order_analysis.address ||
              (triage.order_analysis.confirmed_products && triage.order_analysis.confirmed_products.length > 0) ||
              triage.order_analysis.product_price ||
              triage.order_analysis.ai_quoted_price ||
              triage.order_analysis.delivery_charge
            ) && (
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-linear-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/10 p-3.5 space-y-3 shadow-xs">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    <Receipt size={15} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="uppercase tracking-wider">Order Analysis</span>
                  </div>
                  {triage.status === 'order_confirmed' ? (
                    <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60">
                      Order Confirmed
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      Detected Details
                    </span>
                  )}
                </div>

                {/* Customer Contact & Delivery Address */}
                {(phoneList.length > 0 || (triage.order_analysis.phone && !isPlaceholderPhone(triage.order_analysis.phone)) || triage.order_analysis.address) && (
                  <div className="grid grid-cols-1 gap-2 bg-white/90 dark:bg-slate-800/90 rounded-xl p-2.5 border border-indigo-100/60 dark:border-slate-800">
                    {/* Multi-phone rendering */}
                    {phoneList.length > 0 ? (
                      <div className="space-y-1.5">
                        {phoneList.map((ph, idx) => {
                          const isFromFile = pastOrderPhones.includes(ph) && (!triage?.order_analysis?.phones || !triage.order_analysis.phones.includes(ph));
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Phone size={13} className="text-emerald-500 flex-shrink-0" />
                                <span className="font-bold text-[14px] text-slate-800 dark:text-slate-100 tracking-tight select-all">
                                  {ph}
                                </span>
                                {isFromFile ? (
                                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Previous Order
                                  </span>
                                ) : phoneList.length > 1 ? (
                                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    {idx === 0 ? 'Primary' : `Alt ${idx + 1}`}
                                  </span>
                                ) : null}
                              </div>
                              <button
                                onClick={() => copyToClipboard(ph, `phone-${idx}`)}
                                className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 font-medium"
                                title="Copy phone"
                              >
                                {copiedField === `phone-${idx}` ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                <span>{copiedField === `phone-${idx}` ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : triage.order_analysis.phone && !isPlaceholderPhone(triage.order_analysis.phone) ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 min-w-0">
                          <Phone size={13} className="text-emerald-500 flex-shrink-0" />
                          <span className="font-bold text-[14px] text-slate-800 dark:text-slate-200 truncate">{triage.order_analysis.phone}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(triage.order_analysis?.phone || '', 'phone')}
                          className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 font-medium"
                          title="Copy phone"
                        >
                          {copiedField === 'phone' ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          <span>{copiedField === 'phone' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    ) : null}

                    {triage.order_analysis.address && (
                      <div className={`flex items-start justify-between gap-2 ${(phoneList.length > 0 || triage.order_analysis.phone) ? 'pt-2 border-t border-slate-100 dark:border-slate-700/50' : ''}`}>
                        <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400 flex-1 min-w-0">
                          <MapPin size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="font-semibold text-[13.5px] text-slate-800 dark:text-slate-200 break-words leading-tight">{triage.order_analysis.address}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(triage.order_analysis?.address || '', 'address')}
                          className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 font-medium"
                          title="Copy address"
                        >
                          {copiedField === 'address' ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          <span>{copiedField === 'address' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirmed Products */}
                {triage.order_analysis.confirmed_products && triage.order_analysis.confirmed_products.length > 0 && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Confirmed Product(s)
                    </span>
                    <div className="space-y-1.5">
                      {triage.order_analysis.confirmed_products.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 text-[13.5px]">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ShoppingBag size={14} className="text-indigo-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                            {item.quantity && item.quantity > 1 && (
                              <span className="text-[11px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded font-bold">x{item.quantity}</span>
                            )}
                          </div>
                          {item.price && (
                            <span className="font-bold text-[13.5px] text-slate-900 dark:text-white flex-shrink-0 ml-2">
                              {item.price}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Breakdown (Product Price, Delivery Charge, AI Quoted Total) */}
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 border border-indigo-100/60 dark:border-slate-800 space-y-2">
                  {/* Product Price */}
                  {triage.order_analysis.product_price && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[13px]">
                      <span>Product Price:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{triage.order_analysis.product_price}</span>
                    </div>
                  )}

                  {/* Delivery Charge */}
                  {triage.order_analysis.delivery_charge && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Truck size={14} className="text-slate-400" /> Delivery Charge:
                      </span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        triage.order_analysis.delivery_charge.toLowerCase().includes('free')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {triage.order_analysis.delivery_charge}
                      </span>
                    </div>
                  )}

                  {/* AI Quoted Price / Total */}
                  {(triage.order_analysis.ai_quoted_price || triage.order_analysis.total_amount) && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/70 font-bold">
                      <span className="text-slate-800 dark:text-slate-200 text-[13px] flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-500" /> AI Quoted Total:
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black text-[15px]">
                        {triage.order_analysis.ai_quoted_price || triage.order_analysis.total_amount}
                      </span>
                    </div>
                  )}
                </div>

                {/* Special order notes */}
                {triage.order_analysis.order_notes && (
                  <div className="text-[13px] text-slate-600 dark:text-slate-300 italic bg-white/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-snug">
                    📌 {triage.order_analysis.order_notes}
                  </div>
                )}

                {/* Pre-fill into Create Order shortcut */}
                {onCreateOrderPrefill && (phoneList.length > 0 || triage.order_analysis.phone || triage.order_analysis.address) && (
                  <button
                    onClick={() => onCreateOrderPrefill({
                      phone: phoneList[0] || triage.order_analysis?.phone,
                      address: triage.order_analysis?.address
                    })}
                    className="w-full mt-1 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ShoppingBag size={13} /> Auto-Fill Into Create Order
                  </button>
                )}
              </div>
            )}

            {/* 3. Customer Intent & Comprehensive AI Action Summary */}
            <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-slate-800">
              {/* Customer Current Intent */}
              {triage.customer_current_intent && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Customer Current Request
                  </span>
                  <p className="text-[13.5px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {triage.customer_current_intent}
                  </p>
                </div>
              )}

              {/* AI Action Summary - Enhanced & Detailed */}
              {triage.ai_action_summary && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                    <Sparkles size={13} className="text-indigo-500" /> AI / Agent Handling Summary
                  </span>
                  <div className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/30 dark:bg-slate-800/40 p-3 rounded-xl border border-indigo-100/50 dark:border-slate-800">
                    <p className="font-medium whitespace-pre-line">
                      {triage.ai_action_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommended Next Staff Action */}
              {triage.suggested_action && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs">
                  <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    Next Step:
                  </span>
                  <span className="font-medium text-[13px] leading-snug">
                    {triage.suggested_action}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
