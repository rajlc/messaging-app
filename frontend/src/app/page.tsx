"use client";

import { useEffect, useState, useRef, Suspense, useCallback, Fragment } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Send, Instagram, Facebook, MessageCircle, ShoppingCart, ShoppingBag, Settings, Eye, Zap, Truck, Package, User, Image as ImageIcon, Paperclip, X, Camera, Reply } from 'lucide-react';
import OrderModal from '@/components/OrderModal';
import ViewOrderModal from '@/components/ViewOrderModal';
import QuickReplyModal from '@/components/QuickReplyModal';
import CommentMessage from '@/components/CommentMessage';
import CommentReplyModal from '@/components/CommentReplyModal';
import InventorySettings from '@/components/settings/InventorySettings';
import QuickReplyTemplates from '@/components/settings/QuickReplyTemplates';
import LogisticIntegration from '@/components/settings/LogisticIntegration';
import Sidebar from '@/components/Sidebar';

import OrdersView from '@/components/OrdersView';
import SettingsView from '@/components/SettingsView';
import ProfileView from '@/components/ProfileView';
import ReportView from '@/components/ReportView';
import DailyReportView from '@/components/DailyReportView';
import InventoryReportView from '@/components/InventoryReportView';
import FinanceView from '@/components/FinanceView';
import DeliveryView from '@/components/DeliveryView';
import { useAuth } from '@/context/AuthContext';

type PostComment = {
  id: string;
  comment_id: string;
  post_id: string;
  post_message?: string;
  customer_id: string;
  customer_name: string;
  comment_text: string;
  platform: string;
  page_id?: string;
  is_hidden: boolean;
  is_replied: boolean;
  customer_profile_pic?: string;
  created_at: string;
};

type Message = {
  id: string;
  text: string;
  sender: 'customer' | 'agent';
  platform: 'facebook' | 'instagram' | 'tiktok';
  pageId?: string;
  senderId?: string;
  recipientId?: string; // Added to fix agent message filtering
  timestamp: Date;
  type?: 'message' | 'comment';
  comment?: PostComment;
  fileType?: string;
  imageUrl?: string;
  conversationId?: string;
  isOptimistic?: boolean;
  messageId?: string;
  tempId?: string;
  replyToMid?: string;
  replyToText?: string;
  replyToSender?: string;
};

type Conversation = {
  id?: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  messages: Message[];
  hasOrders?: boolean;
  orderStatus?: string;
  pageName?: string;
  pageId?: string;
  platform?: string; // e.g. 'facebook' | 'instagram'
  orderNumber?: string;
  orderCount?: number;
  hasPhoneNumber?: boolean;
  customerProfilePic?: string;
};

// Define PageInfo type based on its usage
type PageInfo = { connected: boolean; pageName?: string; pageId?: string };

const getPlatformIcon = (platform: string) => {
  switch (platform?.toLowerCase()) {
    case 'facebook':
      return <Facebook size={14} className="text-blue-600" />;
    case 'instagram':
      return <Instagram size={14} className="text-pink-600" />;
    case 'tiktok':
      return <MessageCircle size={14} className="text-black dark:text-white" />;
    default:
      return <MessageCircle size={14} className="text-slate-400" />;
  }
};

// --- Sub-component to fix typing lag ---
const MessageInput = ({
  onSend,
  isUploading,
  onFileClick,
  selectedFiles,
  onFileRemove,
  chatInputRef
}: {
  onSend: (text: string) => void;
  isUploading: boolean;
  onFileClick: () => void;
  selectedFiles: File[];
  onFileRemove: (index: number) => void;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
}) => {
  const [text, setText] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && (text.trim() || selectedFiles.length > 0)) {
      e.preventDefault();
      onSend(text);
      setText('');
    }
  };

  const handleButtonClick = () => {
    if (text.trim() || selectedFiles.length > 0) {
      onSend(text);
      setText('');
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
      <div className="flex flex-col flex-1 gap-2">
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
            {selectedFiles.map((file, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="w-16 h-16 object-cover rounded-md border border-gray-200 dark:border-slate-700"
                />
                <button
                  onClick={() => onFileRemove(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <button
            onClick={onFileClick}
            className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
          >
            <Camera size={22} />
          </button>
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              ref={chatInputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-[15px] text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all"
              disabled={isUploading}
            />
          </div>
          <button
            onClick={handleButtonClick}
            disabled={isUploading || (!text.trim() && selectedFiles.length === 0)}
            className={`bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

function UnifiedInboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isViewOrderModalOpen, setIsViewOrderModalOpen] = useState(false);
  const [isQuickReplyModalOpen, setIsQuickReplyModalOpen] = useState(false);
  const [isCommentReplyModalOpen, setIsCommentReplyModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<PostComment | null>(null);

  // Filter state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>('');
  const [connectedPages, setConnectedPages] = useState<{ id: string; platform: string; page_name: string; page_id: string; is_active: boolean }[]>([]);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Bulk message state
  const [comments, setComments] = useState<PostComment[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [currentCustomerId, setCurrentCustomerId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(''); // This will now store the UUID or CustomerID depending on migration. Ideally UUID.
  const [conversationType, setConversationType] = useState<'messages' | 'comments'>('messages');

  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sidebar Resizing Logic
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      // Limit sidebar width between 250px and 500px for usability
      if (isResizing && sidebarRef.current) {
        const newWidth = mouseMoveEvent.clientX - sidebarRef.current.getBoundingClientRect().left;
        if (newWidth > 300 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startResizing();
  };

  // Refactored Order State
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderModalMode, setOrderModalMode] = useState<'create' | 'view' | 'edit'>('create');

  // All orders state for Report View
  const [allOrders, setAllOrders] = useState<any[]>([]);

  const fetchCustomerOrders = async (customerId: string) => {
    if (!customerId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders?customer_id=${customerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomerOrders(data);
      } else if (data.success && Array.isArray(data.data)) {
        setCustomerOrders(data.data);
      } else {
        setCustomerOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch customer orders:', error);
    }
  };

  const fetchAllOrders = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllOrders(data);
      } else if (data.success && Array.isArray(data.data)) {
        setAllOrders(data.data);
      } else {
        setAllOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch all orders:', error);
    }
  };

  // Find active conversation object
  // CRITICAL FIX: Lookup by UUID (id) OR CustomerID (fallback)
  const activeConversation = conversations.find(c => c.id === activeConversationId || c.customerId === activeConversationId);
  const customerName = activeConversation?.customerName || 'Unknown Customer';

  // Derived state from URL
  const activeView = (searchParams.get('view') as 'messages' | 'orders' | 'settings' | 'profile' | 'report' | 'daily-report' | 'inventory-report' | 'finance' | 'delivery') || 'messages';

  const setActiveView = (view: 'messages' | 'orders' | 'settings' | 'profile' | 'report' | 'daily-report' | 'inventory-report' | 'finance' | 'delivery') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);

    // Clear section param if moving away from settings
    if (view !== 'settings') {
      params.delete('section');
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Fetch all orders when report view is active
  useEffect(() => {
    if (activeView === 'report' || activeView === 'daily-report' || activeView === 'inventory-report' || activeView === 'finance') {
      fetchAllOrders();
    }
  }, [activeView]);

  // Consolidated fetching for setup
  useEffect(() => {
    const initApp = async () => {
      try {
        // Run config fetches in parallel
        const [pagesRes, commentsRes, fbInfoRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/facebook/page-info`)
        ]);

        const [pagesData, commentsData, fbInfoData] = await Promise.all([
          pagesRes.json(),
          commentsRes.json(),
          fbInfoRes.json()
        ]);

        const pageList = Array.isArray(pagesData) ? pagesData : [];
        setConnectedPages(pageList);
        if (commentsData && Array.isArray(commentsData)) setComments(commentsData);
        if (fbInfoData && fbInfoData.success) {
          setPageInfo({ ...fbInfoData.data, connected: true });
        }

        // Now load conversations (safest after pages are ready for resolution)
        await loadConversations(pageList);
      } catch (e) {
        console.error('Initialization failed:', e);
      }
    };
    initApp();
  }, []); // Run ONCE on mount

  // Clear all filters when navigating away from messages view
  useEffect(() => {
    if (activeView !== 'messages') {
      setShowFilterDropdown(false);
      setFilterPlatform('');
      setFilterOrderStatus('');
    }
  }, [activeView]);

  // Click-outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterDropdown]);

  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<{ id?: string, customerId: string, pageId?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
    if (activeConversationId) {
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [messages, activeConversationId]);

  useEffect(() => {
    const found = conversations.find(c => c.id === activeConversationId || c.customerId === activeConversationId);
    if (found) {
      activeConversationRef.current = { id: found.id, customerId: found.customerId, pageId: found.pageId };
    } else {
      activeConversationRef.current = null;
    }
  }, [activeConversationId, conversations]);

  // Load conversations from database
  const loadConversations = async (pageList = connectedPages) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const loadedConversations: Conversation[] = data.map((conv: any) => {
          const resolvedPageName = conv.page_name || pageList.find(p => p.page_id === conv.page_id)?.page_name;
          return {
            id: conv.id,
            customerId: conv.customer_id,
            customerName: conv.customer_name,
            lastMessage: conv.last_message || '',
            timestamp: new Date(conv.last_message_at || conv.created_at),
            unreadCount: conv.unread_count || 0,
            messages: [],
            hasOrders: conv.has_orders,
            orderStatus: conv.latest_order_status,
            orderNumber: conv.latest_order_number,
            orderCount: conv.order_count,
            pageName: resolvedPageName,
            pageId: conv.page_id,
            hasPhoneNumber: !!conv.has_phone_number,
            customerProfilePic: conv.customer_profile_pic
          };
        });

        setConversations(loadedConversations);

        if (loadedConversations.length > 0) {
          const firstConv = loadedConversations[0];
          setActiveConversationId(firstConv.id!);
          setCurrentCustomerId(firstConv.customerId);

          // Parallel fetch messages and orders
          const [msgRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/conversations/${firstConv.id}/messages`),
            fetchCustomerOrders(firstConv.customerId)
          ]);

          const messagesData = await msgRes.json();
          if (messagesData && messagesData.length > 0) {
            const loadedMessages: Message[] = messagesData.map((msg: any) => ({
              id: msg.id,
              text: msg.text,
              sender: msg.sender,
              platform: msg.platform,
              pageId: msg.page_id,
              senderId: msg.sender === 'customer' ? firstConv.customerId : 'agent',
              conversationId: msg.conversation_id,
              timestamp: new Date(msg.created_at)
            }));

            setMessages(loadedMessages);
            setConversations(prev => prev.map(conv =>
              conv.id === firstConv.id ? { ...conv, messages: loadedMessages } : conv
            ));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Socket setup effect
  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002');

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
      setPageInfo(prev => ({
        ...(prev || { connected: true }),
        connected: true,
        pageName: prev?.pageName || 'Sasto Online Shopping',
        pageId: prev?.pageId || '104508142519049'
      }));
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setPageInfo(prev => prev ? { ...prev, connected: false } : null);
    });

    socketRef.current.on('incomingMessage', (message: any) => {
      if (user && user.role === 'user') {
        const allowedPlatforms = user.platforms || [];
        const allowedAccounts = user.accounts || [];
        const hasPlatformAccess = allowedPlatforms.length === 0 || allowedPlatforms.includes(message.platform);
        const hasAccountAccess = allowedAccounts.length === 0 || (message.pageId && allowedAccounts.includes(message.pageId));
        if (!hasPlatformAccess || !hasAccountAccess) return;
      }

      const isOwnMessage = message.isOwnMessage || message.senderId === message.pageId;
      const conversationId = isOwnMessage ? message.recipientId : message.senderId;
      const senderRole = isOwnMessage ? 'agent' : 'customer';

      const newMessage: Message = {
        id: message.id || Date.now().toString(),
        text: message.text,
        sender: senderRole,
        platform: message.platform || 'facebook',
        pageId: message.pageId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        conversationId: message.conversationId,
        timestamp: new Date(message.timestamp || Date.now())
      };

      const active = activeConversationRef.current;
      const isMatch = active && (
        (message.conversationId && active.id === message.conversationId) ||
        (active.customerId === conversationId)
      );

      if (isMatch) {
        setMessages(prev => {
          const existingIndex = prev.findIndex(m =>
            (m.id === message.id) || (m.tempId && m.tempId === message.tempId)
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newMessage;
            return updated;
          }
          return [...prev, newMessage];
        });
      }

      setConversations(prev => {
        const existingConvIndex = prev.findIndex(c =>
          (message.conversationId && c.id === message.conversationId) ||
          (c.customerId === conversationId)
        );

        const shouldIncrementUnread = senderRole === 'customer' && !isMatch;

        if (existingConvIndex >= 0) {
          const newConvs = [...prev];
          const c = newConvs[existingConvIndex];
          newConvs[existingConvIndex] = {
            ...c,
            lastMessage: message.text,
            timestamp: new Date(),
            unreadCount: shouldIncrementUnread ? c.unreadCount + 1 : 0,
            hasPhoneNumber: c.hasPhoneNumber || (senderRole === 'customer' && hasPhoneNumber(message.text))
          };
          return newConvs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        } else {
          return [
            {
              id: message.conversationId,
              customerId: conversationId,
              customerName: message.customerName || conversationId,
              lastMessage: message.text,
              timestamp: new Date(),
              unreadCount: shouldIncrementUnread ? 1 : 0,
              messages: [newMessage],
              pageName: connectedPages.find(p => p.page_id === message.pageId)?.page_name,
              platform: message.platform || 'facebook',
              customerProfilePic: message.customerProfilePic,
              hasPhoneNumber: (senderRole === 'customer' && hasPhoneNumber(message.text)) || hasPhoneNumber(conversationId)
            },
            ...prev
          ];
        }
      });
    });

    socketRef.current.on('new-comment', (data: any) => {
      if (data.comment) {
        const commentMessage: Message = {
          id: data.comment.comment_id,
          text: `💬 Comment: ${data.comment.comment_text}`,
          sender: 'customer',
          platform: data.comment.platform || 'facebook',
          pageId: data.comment.page_id,
          timestamp: new Date()
        };

        const isMatch = activeConversationRef.current && activeConversationRef.current.id === data.comment.conversation_id;
        if (isMatch) {
          setMessages(prev => [...prev, commentMessage]);
        }

        setConversations(prev => {
          const existingConvIndex = prev.findIndex(c => c.id === data.comment.conversation_id);
          const isNotActive = !isMatch;

          if (existingConvIndex >= 0) {
            return prev.map(c =>
              c.id === data.comment.conversation_id
                ? {
                  ...c,
                  lastMessage: `💬 Comment: ${data.comment.comment_text}`,
                  timestamp: new Date(),
                  unreadCount: isNotActive ? c.unreadCount + 1 : 0,
                  hasPhoneNumber: c.hasPhoneNumber || hasPhoneNumber(data.comment.comment_text)
                }
                : c
            ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          } else {
            return [
              {
                id: data.comment.conversation_id,
                customerId: data.customerId,
                customerName: data.comment.customer_name || data.customerId,
                lastMessage: `💬 Comment: ${data.comment.comment_text}`,
                timestamp: new Date(),
                unreadCount: isNotActive ? 1 : 0,
                messages: [commentMessage],
                pageId: data.comment.page_id,
                pageName: data.comment.page_name || connectedPages.find(p => p.page_id === data.comment.page_id)?.page_name,
                platform: data.comment.platform || 'facebook',
                hasPhoneNumber: hasPhoneNumber(data.comment.comment_text) || hasPhoneNumber(data.comment.customer_name || '')
              },
              ...prev
            ];
          }
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, connectedPages]);

  // Helper to detect 10-digit phone number
  const hasPhoneNumber = (text: string) => {
    if (!text) return false;
    // Matches 10-digit numbers (Nepali mobiles start with 9, e.g. 98 or 97)
    // We use a strict boundary check to avoid matching long numeric IDs (like Facebook IDs)
    const phoneRegex = /(?:\b9[78]\d{8}\b)|(?:\b\d{10}\b)/;
    return phoneRegex.test(text);
  };


  // Auto-select first conversation if none is selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      const firstConv = conversations[0];
      console.log('Auto-selecting first conversation:', firstConv.id);
      setActiveConversationId(firstConv.id!);
      setCurrentCustomerId(firstConv.customerId);
    }
  }, [conversations, activeConversationId]);

  const handleSend = async (text: string) => {
    if ((!text.trim() && selectedFiles.length === 0) || !activeConversationId) return;

    const currentText = text;
    const currentFiles = [...selectedFiles];
    const currentReplyingTo = replyingTo;

    // Clear other states immediately for UX
    setSelectedFiles([]);
    setReplyingTo(null);

    let uploadedUrls: string[] = [];

    if (currentFiles.length > 0) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        currentFiles.forEach(file => formData.append('files', file));

        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/messages/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.urls) {
          uploadedUrls = uploadData.urls;
        }
      } catch (e) {
        console.error('Upload failed:', e);
      } finally {
        setIsUploading(false);
      }
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: currentText || (uploadedUrls.length > 0 ? `📷 Sent ${uploadedUrls.length} image(s)` : ''),
      sender: 'agent',
      platform: activeConversation?.platform as any || 'facebook',
      timestamp: new Date(),
      imageUrl: uploadedUrls.length > 0 ? uploadedUrls[0] : undefined,
      fileType: uploadedUrls.length > 0 ? 'image' : 'text',
      isOptimistic: true,
      replyToMid: currentReplyingTo?.messageId || currentReplyingTo?.id,
      replyToText: currentReplyingTo?.text,
      replyToSender: currentReplyingTo?.sender
    };

    setMessages(prev => [...prev, newMessage]);

    // Update conversation last message
    setConversations(prev => prev.map(c =>
      (c.id === activeConversationId || c.customerId === activeConversationId)
        ? { ...c, lastMessage: newMessage.text, timestamp: new Date() }
        : c
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

    // Only use POST_PURCHASE_UPDATE tag if this conversation has an order
    const hasOrder = !!(activeConversation?.orderStatus || activeConversation?.hasOrders);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientId: currentCustomerId,
          text: currentText,
          imageUrl: uploadedUrls.length > 0 ? uploadedUrls : undefined,
          platform: activeConversation?.platform || 'facebook',
          pageId: activeConversation?.pageId,
          ...(hasOrder && { tag: 'POST_PURCHASE_UPDATE' }),
          replyToMid: currentReplyingTo?.messageId || currentReplyingTo?.id,
          replyToText: currentReplyingTo?.text,
          replyToSender: currentReplyingTo?.sender
        }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCommentReply = async (message: string, replyType: 'public' | 'private') => {
    if (!selectedComment) return;

    try {
      const endpoint = replyType === 'public'
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/${selectedComment.id}/reply`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/${selectedComment.id}/reply-private`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        }),
      });

      if (response.ok) {
        console.log(`✅ ${replyType} reply sent successfully`);

        // Update the comment as replied in local state
        setComments(prev => prev.map(c =>
          c.id === selectedComment.id
            ? { ...c, is_replied: true }
            : c
        ));

        // Update messages to reflect the replied status
        setMessages(prev => prev.map(msg =>
          msg.comment?.id === selectedComment.id && msg.comment
            ? { ...msg, comment: { ...msg.comment, is_replied: true } }
            : msg
        ));
      } else {
        const errorData = await response.json();
        console.error('Failed to send comment reply:', errorData);
        alert(`Failed to send reply: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending comment reply:', error);
      alert('Error sending reply. Please check console for details.');
    }
  };

  const handleQuickReplySend = async (message: string) => {
    if (!message.trim() || !activeConversationId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'agent',
      platform: activeConversation?.platform as any || 'facebook',
      timestamp: new Date(),
      isOptimistic: true
    };

    setMessages(curr => [...curr, newMessage]);

    // Update conversation last message
    setConversations(prev => prev.map(c =>
      (c.id === activeConversationId || c.customerId === activeConversationId)
        ? { ...c, lastMessage: message, timestamp: new Date() }
        : c
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

    // Only use POST_PURCHASE_UPDATE tag if this conversation has an order
    const hasOrder = !!(activeConversation?.orderStatus || activeConversation?.hasOrders);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientId: currentCustomerId,
          text: message,
          platform: activeConversation?.platform || 'facebook',
          pageId: activeConversation?.pageId,
          ...(hasOrder && { tag: 'POST_PURCHASE_UPDATE' }),
        }),
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };


  const handleConversationClick = async (conv: Conversation) => {
    // PREFER UUID (conv.id) to uniquely identify conversation. 
    // Fallback to customerId only if necessary (legacy behavior), but strictly UUID prevents cross-page merging.
    const uniqueId = conv.id || conv.customerId;
    setActiveConversationId(uniqueId);
    setCurrentCustomerId(conv.customerId);

    // Reset unread count locally and in database
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unreadCount: 0 } : c
    ));

    // Call API to mark as read
    try {
      if (conv.id) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/conversations/${conv.id}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).catch(err => console.error('Failed to mark as read in DB:', err));
      }
    } catch (error) {
      console.error('Error calling mark as read API:', error);
    }

    // Load messages and comments
    try {
      // 1. Fetch messages using UNIQUE Conversation ID
      // We skip the search-by-customer-id step because we already have the ID!
      let messagesData = [];
      if (conv.id) {
        const messagesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/conversations/${conv.id}/messages`);
        if (messagesResponse.ok) {
          messagesData = await messagesResponse.json();
        }
      }

      // Fallback: If no ID or 404, we might try old logic? 
      // But for this bug fix, we assume ID is present. 
      // If messagesData is empty, we just show empty.

      if (messagesData && messagesData.length > 0) {
        const loadedMessages: Message[] = messagesData.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          platform: msg.platform,
          pageId: msg.page_id,
          senderId: msg.sender === 'customer' ? conv.customerId : 'agent', // Use the confirmed customerId
          conversationId: msg.conversation_id,
          timestamp: new Date(msg.created_at)
        }));

        // Load comments for this customer
        const commentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/customer/${conv.customerId}`);
        const commentsData = await commentsResponse.json();

        // Convert comments to message format
        const commentMessages: Message[] = commentsData.map((comment: PostComment) => ({
          id: comment.id,
          text: comment.comment_text,
          sender: 'customer' as const,
          platform: comment.platform as 'facebook' | 'instagram' | 'tiktok',
          senderId: comment.customer_id,
          timestamp: new Date(comment.created_at),
          type: 'comment' as const,
          comment: comment
        }));

        // Combine messages and comments, then sort by timestamp
        const allMessages = [...loadedMessages, ...commentMessages].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        setMessages(allMessages);

        // Update conversation with loaded messages
        setConversations(prev => prev.map(c =>
          c.id === conv.id
            ? { ...c, messages: allMessages }
            : c
        ));
      } else {
        // No messages, but check for comments
        const commentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/comments/customer/${conv.customerId}`);
        const commentsData = await commentsResponse.json();

        if (commentsData && commentsData.length > 0) {
          const commentMessages: Message[] = commentsData.map((comment: PostComment) => ({
            id: comment.id,
            text: comment.comment_text,
            sender: 'customer' as const,
            platform: comment.platform as 'facebook' | 'instagram' | 'tiktok',
            senderId: comment.customer_id,
            timestamp: new Date(comment.created_at),
            type: 'comment' as const,
            comment: comment
          }));
          setMessages(commentMessages);
        } else {
          setMessages([]);
        }
      }


      // Fetch orders for this customer
      fetchCustomerOrders(conv.customerId);

    } catch (error) {
      console.error('Error loading messages and comments', error);
    }
  };

  // EXTRACTING HELPER: Short status code
  const getStatusShortcode = (status: string) => {
    if (!status) return '';
    const statusMap: Record<string, string> = {
      'New Order': 'NEW',
      'Confirmed Order': 'CNF',
      'Ready to Ship': 'RTS',
      'Shipped': 'SHP',
      'Delivery Process': 'DEL',
      'Delivered': 'DLV',
      'Delivery Failed': 'FAI',
      'Hold': 'HLD',
      'Return Process': 'RET',
      'Return Delivered': 'RTD',
      'Cancelled': 'CAN'
    };
    return statusMap[status] || status.substring(0, 3).toUpperCase();
  };

  // EXTRACTING HELPER: Status color — light mode: soft colored bg + dark text; dark mode: dark tones
  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-gray-200 dark:border-slate-600';
    if (status === 'New Order') return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700/50';
    if (status === 'Confirmed Order') return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700/50';
    if (status === 'Ready to Ship') return 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700/50';
    if (status === 'Shipped') return 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700/50';
    if (status === 'Delivery Process') return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700/50';
    if (status === 'Delivered') return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700/50';
    if (status === 'Delivery Failed') return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700/50';
    if (status === 'Hold') return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700/50';
    if (status === 'Return Process') return 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700/50';
    if (status === 'Return Delivered') return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600/50';
    if (status === 'Cancelled') return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700/50';
    return 'bg-gray-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-gray-200 dark:border-slate-600';
  };

  // Filter conversations based on conversation type (messages vs comments) + platform + order status
  const filteredConversations = conversations.filter(conv => {
    // Type filter
    if (conversationType === 'messages') {
      if (!(conv.messages.length === 0 || conv.messages.some(msg => msg.type !== 'comment'))) return false;
    } else {
      if (!conv.messages.some(msg => msg.type === 'comment')) return false;
    }
    // Page filter (filterPlatform holds a page_id value)
    if (filterPlatform && conv.pageId !== filterPlatform) return false;

    // Order status filter
    if (filterOrderStatus && conv.orderStatus !== filterOrderStatus) return false;
    return true;
  });

  const isFilterActive = !!(filterPlatform || filterOrderStatus);

  const messagesCount = conversations.filter(c => c.messages.some(m => m.type !== 'comment')).length;
  const commentsCount = conversations.filter(c => c.messages.some(m => m.type === 'comment')).length;



  // Helper to get extract phone and address...
  const extractPhoneNumber = (msgs: Message[]) => {
    const phoneRegex = /(\b9\d{9}\b)/;
    for (const m of msgs) {
      if (m.sender === 'customer') {
        const match = m.text.match(phoneRegex);
        if (match) return match[0];
      }
    }
    return '';
  };

  const extractAddress = (msgs: Message[]) => {
    // Very naive address extraction - just looks for common keywords
    // In a real app, use NLP or specific regex if possible
    const addressKeywords = ['kathmandu', 'lalitpur', 'bhaktapur', 'pokhara', 'street', 'marg', 'tol', 'chowk'];
    for (const m of msgs) {
      if (m.sender === 'customer') {
        if (addressKeywords.some(kw => m.text.toLowerCase().includes(kw))) {
          return m.text;
        }
      }
    }
    return '';
  };

  // Filter messages to only show those for the active conversation AND matching the active tab
  const displayMessages = messages.filter(msg => {
    if (!activeConversation) return false;

    // 1. Must belong to active conversation
    // Prefer strict UUID match for perfect isolation
    if (msg.conversationId && activeConversation.id) {
      if (msg.conversationId !== activeConversation.id) return false;
    } else {
      // Fallback to customerId + pageId matching for legacy/unsaved messages
      const targetCustomerId = activeConversation.customerId;
      const targetPageId = activeConversation.pageId;

      if (msg.sender === 'customer') {
        if (msg.senderId !== targetCustomerId) return false;
        if (msg.pageId && targetPageId && msg.pageId !== targetPageId) return false;
      } else if (msg.sender === 'agent') {
        if (msg.recipientId && msg.recipientId !== targetCustomerId) return false;
      }
    }

    // 2. Must match the active tab type
    if (conversationType === 'messages') {
      return msg.type !== 'comment';
    } else {
      return msg.type === 'comment';
    }
  });

  // activeConversation moved up

  // Debugging state mismatch
  useEffect(() => {
    if (activeConversationId) {
      console.log('🔄 state debug:', {
        activeId: activeConversationId,
        found: !!activeConversation,
        totalConvs: conversations.length,
        convIds: conversations.map(c => c.customerId)
      });
    }
  }, [activeConversationId, conversations, activeConversation]);


  const extractedPhone = extractPhoneNumber(displayMessages);
  const extractedAddress = extractAddress(displayMessages);


  const renderMessagesView = () => (
    <Fragment>
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div
          style={{ width: `${sidebarWidth}px` }}
          className="bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col flex-shrink-0 relative transition-all duration-75"
        >
          {/* Inbox Header */}
          <div className="relative">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white">Messages</h1>
                {messagesCount > 0 && (
                  <span className="bg-blue-500 text-white text-[10px] rounded-full min-w-[1.25rem] h-4 flex items-center justify-center px-1">{messagesCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowFilterDropdown(v => !v)}
                  className={`p-2 rounded-lg transition-colors relative ${showFilterDropdown || isFilterActive ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  title="Filter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {isFilterActive && <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />}
                </button>
              </div>
            </div>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div ref={filterDropdownRef} className="absolute top-full left-0 right-0 z-30 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl rounded-b-xl p-3 space-y-3">
                {/* Platform / Pages filter */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pages & Accounts</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => { setFilterPlatform(''); }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${filterPlatform === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-indigo-400'}`}
                    >
                      All
                    </button>
                    {connectedPages.filter(p => p.is_active).map(page => (
                      <button
                        key={page.id}
                        onClick={() => { setFilterPlatform(page.page_id); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${filterPlatform === page.page_id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-indigo-400'}`}
                      >
                        {page.platform === 'facebook' && <span className="text-[9px] font-bold opacity-70">FB</span>}
                        {page.platform === 'instagram' && <span className="text-[9px] font-bold opacity-70">IG</span>}
                        {page.platform === 'tiktok' && <span className="text-[9px] font-bold opacity-70">TT</span>}
                        {page.page_name || page.page_id}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Order Status filter */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Order Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', 'New Order', 'Confirmed Order', 'Ready to Ship', 'Shipped', 'Delivery Process', 'Delivered', 'Delivery Failed', 'Hold', 'Return Process', 'Return Delivered', 'Cancelled'].map(s => (
                      <button
                        key={s || 'all'}
                        onClick={() => { setFilterOrderStatus(s); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${filterOrderStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-indigo-400'}`}
                      >
                        {s === '' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Clear filters */}
                {isFilterActive && (
                  <button
                    onClick={() => { setFilterPlatform(''); setFilterOrderStatus(''); setShowFilterDropdown(false); }}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {filteredConversations.map((conv) => {
              const convKey = conv.id || conv.customerId;
              return (
                <div
                  key={convKey}
                  onClick={() => handleConversationClick(conv)}
                  className={`py-6 px-5 border-b border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${activeConversationId === convKey
                    ? 'bg-blue-50 dark:bg-slate-700/50 border-l-4 border-l-blue-600 pl-[15px]'
                    : 'border-l-4 border-l-transparent pl-[19px]'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden transition-transform ${activeConversationId === convKey ? 'scale-110 shadow-lg' : ''} ${conv.customerId.length % 2 === 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                        conv.customerId.length % 3 === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                          'bg-gradient-to-br from-teal-400 to-emerald-500'
                        }`}>
                        {conv.customerProfilePic ? (
                          <img src={conv.customerProfilePic} alt={conv.customerName} className="w-full h-full object-cover" />
                        ) : (
                          conv.customerName ? conv.customerName.charAt(0).toUpperCase() : '?'
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-1 rounded-full shadow-md">
                        {getPlatformIcon(conv.platform || 'facebook')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {/* Line 1: Name and Time */}
                      <div className="flex justify-between items-center">
                        <h3 className={`text-[17px] truncate ${conv.unreadCount > 0
                          ? 'font-[850] text-black dark:text-white'
                          : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                          {conv.customerName}
                        </h3>
                        <span className={`text-[11px] tabular-nums whitespace-nowrap ml-2 ${conv.unreadCount > 0
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500 font-medium'}`}>
                          {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Line 2: Badges and Status */}
                      <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
                        {(conv.pageName || connectedPages.find(p => p.page_id === conv.pageId)?.page_name) && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-md uppercase tracking-tighter border border-blue-100 dark:border-blue-800/30 truncate max-w-[65%] flex-shrink-0">
                            {conv.pageName || connectedPages.find(p => p.page_id === conv.pageId)?.page_name}
                          </span>
                        )}
                        {conv.hasOrders && conv.orderStatus && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-extrabold shadow-sm flex items-center gap-1 flex-shrink-0 ${getStatusColor(conv.orderStatus)}`}>
                            {conv.orderNumber ? `#${conv.orderNumber}` : getStatusShortcode(conv.orderStatus)}
                          </span>
                        )}
                      </div>

                      {/* Line 3: Message Preview and Phone Dot */}
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-[14px] truncate flex-1 ${conv.unreadCount > 0
                          ? 'text-slate-900 dark:text-slate-100 font-bold'
                          : 'text-slate-500 dark:text-slate-400 font-medium'}`}>
                          {conv.lastMessage}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(conv.hasPhoneNumber || hasPhoneNumber(conv.lastMessage) || hasPhoneNumber(conv.customerName)) && (
                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" title="Contains phone number" />
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full shadow-sm shadow-blue-500/50" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">No {conversationType === 'messages' ? 'messages' : 'comments'} yet</p>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={handleMouseDown} />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900 relative">
          <div className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md shadow-blue-500/20 overflow-hidden">
                {activeConversation?.customerProfilePic ? (
                  <img src={activeConversation.customerProfilePic} alt={activeConversation.customerName} className="w-full h-full object-cover" />
                ) : (
                  activeConversation?.customerName?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeConversation?.customerName || 'Select a conversation'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {activeConversation?.orderNumber && (
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                        #{activeConversation.orderNumber}
                      </span>
                    )}
                    {activeConversation?.orderStatus && (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border shadow-sm ${getStatusColor(activeConversation.orderStatus)}`}>
                        {activeConversation.orderStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {activeConversation?.hasOrders && (
                <button onClick={() => setIsViewOrderModalOpen(true)} className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                  <Eye size={16} /> View Orders
                </button>
              )}
              <button onClick={() => setIsOrderModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                Create Order
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
            {displayMessages.map((msg, index) => (
              <div key={msg.id || index} className={`flex group ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.sender !== 'agent' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 self-start mt-1 shadow-sm">
                    {activeConversation?.customerProfilePic ? (
                      <img src={activeConversation.customerProfilePic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {activeConversation?.customerName?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                )}
                {msg.sender === 'agent' && (
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="self-center mr-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full hover:text-indigo-600"
                    title="Reply"
                  >
                    <Reply size={16} />
                  </button>
                )}
                <div className={`max-w-[80%] rounded-2xl shadow-sm border ${msg.sender === 'agent'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none border-blue-500 shadow-blue-500/10'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border-gray-100 dark:border-slate-700'
                  }`}>

                  {/* Replied Message Context */}
                  {(msg.replyToMid || msg.replyToText) && (
                    <div className={`m-1 p-2 rounded-xl text-xs border-l-4 ${msg.sender === 'agent'
                      ? 'bg-blue-700/50 border-blue-400 text-blue-100'
                      : 'bg-gray-200 dark:bg-slate-800 border-indigo-500 text-slate-600 dark:text-slate-400'
                      }`}>
                      <p className="font-bold mb-0.5">{msg.replyToSender === 'agent' ? 'You' : (activeConversation?.customerName || 'Customer')}</p>
                      <p className="truncate line-clamp-1">{msg.replyToText || 'Original message'}</p>
                    </div>
                  )}

                  <div className="p-3">
                    {msg.imageUrl && (
                      <div className="mb-2 -mx-3 -mt-3 overflow-hidden bg-gray-200 dark:bg-slate-800">
                        <img
                          src={msg.imageUrl}
                          alt="Attachment"
                          className="max-w-full max-h-[300px] object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                          onClick={() => window.open(msg.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                    {msg.text && (
                      <p className="text-[16px] whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                    )}
                    <p className={`text-[11px] mt-1.5 opacity-80 font-medium ${msg.sender === 'agent' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {msg.sender !== 'agent' && (
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="self-center ml-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full hover:text-indigo-600"
                    title="Reply"
                  >
                    <Reply size={16} />
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
            {displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 opacity-60">
                <MessageCircle className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No messages to display</p>
              </div>
            )}
          </div>

          <MessageInput
            onSend={handleSend}
            isUploading={isUploading}
            onFileClick={() => fileInputRef.current?.click()}
            selectedFiles={selectedFiles}
            onFileRemove={(i) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
            chatInputRef={chatInputRef}
          />
        </div>

        {/* Right Panel */}
        <div className="w-[28rem] bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden">
              {activeConversation?.customerProfilePic ? (
                <img src={activeConversation.customerProfilePic} alt={customerName} className="w-full h-full object-cover" />
              ) : (
                customerName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">{customerName}</h2>
              <span className="text-[13px] text-slate-500 dark:text-slate-400">Customer Details</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => { setOrderModalMode('create'); setIsOrderModalOpen(true); }} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 flex items-center justify-center gap-2 text-[15px]">
              <ShoppingBag size={15} /> Create Order
            </button>
            <button onClick={() => setIsQuickReplyModalOpen(true)} className="flex-1 bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg py-2 border border-gray-200 dark:border-slate-600 flex items-center justify-center gap-2 text-[15px]">
              <MessageCircle size={15} /> Quick Reply
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-500" /> Recent Orders
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {customerOrders.length > 0 ? (
                customerOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[13px] text-indigo-600 dark:text-indigo-400 font-bold">{order.order_number}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusColor(order.order_status)}`}>{order.order_status}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-900 dark:text-white">
                      <span>{order.items?.length || 0} Items</span>
                      <span className="font-bold text-[13px]">Rs. {order.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                  <p className="text-slate-500 text-xs italic">No recent orders found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );

  const renderMainContent = () => {
    switch (activeView) {
      case 'daily-report': return <DailyReportView orders={allOrders} />;
      case 'inventory-report': return <InventoryReportView orders={allOrders} />;
      case 'report': return (
        <ReportView
          orders={allOrders}
          userRole={user?.role || 'user'}
          userName={(user as any)?.name || user?.full_name || ''}
          userEmail={user?.email || ''}
        />
      );
      case 'profile': return <ProfileView />;
      case 'finance': return <FinanceView orders={allOrders} />;
      case 'orders': return <OrdersView />;
      case 'settings': return <SettingsView />;
      case 'delivery': return <DeliveryView />;
      default: return renderMessagesView();
    }
  };

  const isAnyModalOpen = isOrderModalOpen || isViewOrderModalOpen || isQuickReplyModalOpen || isCommentReplyModalOpen;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans transition-colors duration-200">
      <div className="relative flex-shrink-0">
        <Sidebar activeView={activeView as any} />
        {isAnyModalOpen && <div className="absolute inset-0 z-40 cursor-not-allowed" aria-hidden="true" />}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderMainContent()}
      </div>

      {isOrderModalOpen && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          customerName={activeConversation?.customerName}
          customerId={activeConversation?.customerId}
          pageName={activeConversation?.pageName}
          mode={orderModalMode}
          initialOrder={selectedOrder}
          onOrderUpdate={() => {
            if (activeConversation?.customerId) fetchCustomerOrders(activeConversation.customerId);
            fetchAllOrders();
          }}
        />
      )}
      {isViewOrderModalOpen && (
        <ViewOrderModal
          isOpen={isViewOrderModalOpen}
          onClose={() => setIsViewOrderModalOpen(false)}
          customerId={activeConversation?.customerId || ''}
        />
      )}
      <QuickReplyModal isOpen={isQuickReplyModalOpen} onClose={() => setIsQuickReplyModalOpen(false)} onSend={handleQuickReplySend} />
      {selectedComment && (
        <CommentReplyModal
          isOpen={isCommentReplyModalOpen}
          onClose={() => { setIsCommentReplyModalOpen(false); setSelectedComment(null); }}
          onSend={handleCommentReply}
          commentText={selectedComment.comment_text}
        />
      )}
    </div>
  );
}



export default function UnifiedInboxPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 text-slate-600 dark:text-white">Loading...</div>}>
      <UnifiedInboxContent />
    </Suspense>
  );
}
