import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Keyboard,
    BackHandler,
    Alert,
    Clipboard,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../theme/theme';
import { ChevronLeft, Send, Plus, Camera, Mic, MessageCircle, X } from 'lucide-react-native';
import { supabase } from '../api/supabase';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

interface Message {
    id: string;
    conversation_id: string;
    text: string;
    sender: 'customer' | 'agent';
    created_at: string;
    platform?: string;
    image_url?: string;
    file_type?: string;
}

interface Order {
    id: string;
    order_number: string;
    order_status: string;
}

import { API_URL } from '../api/config';

export default function ChatDetailScreen({ route, navigation }: any) {
    const { conversationId, customerId, customerName, platform } = route.params;
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [recipientId, setRecipientId] = useState<string | null>(null);
    const [pageId, setPageId] = useState<string | null>(null);
    const [pageName, setPageName] = useState<string | null>(null);
    const [platformName, setPlatformName] = useState<string | null>(null);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [quickReplies, setQuickReplies] = useState<{ title: string, message: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [latestOrder, setLatestOrder] = useState<Order | null>(null);
    const [ordersModalVisible, setOrdersModalVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Use array or ImagePicker.MediaType.Images
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const imageAsset = result.assets[0];
            uploadImage(imageAsset.uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setSending(true);
        try {
            const fileName = `chat/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

            // USE MODERN Expo 54 File API
            // Read as base64 and decode to ArrayBuffer
            const file = new File(uri);
            const base64 = await file.base64();
            const arrayBuffer = decode(base64);

            const { data, error } = await supabase.storage
                .from('chat-attachments')
                .upload(fileName, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (error) {
                console.error('Storage upload error:', error);
                throw error;
            }

            // Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(data.path);

            const imageUrl = publicUrlData.publicUrl;

            // Send message with image
            await handleSend('[Image]', imageUrl, 'image');

        } catch (error: any) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const fetchQuickReplies = async () => {
        try {
            const { data, error } = await supabase
                .from('quick_reply_templates')
                .select('title, message')
                .order('title', { ascending: true });

            if (error) throw error;
            setQuickReplies(data || []);
        } catch (error) {
            console.error('Error fetching quick replies:', error);
            // Fallback
            setQuickReplies([
                { title: 'Hi', message: "Hi, how can I help you?" },
                { title: 'Available?', message: "Is this item still available?" },
            ]);
        }
    };

    const fetchConversationDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('customer_id, page_id, page_name, platform')
                .eq('id', conversationId)
                .single();

            if (data && !error) {
                console.log('✅ Fetched conversation details:', data);
                setRecipientId(data.customer_id);
                setPageId(data.page_id);
                setPageName(data.page_name);
                setPlatformName(data.platform);
            } else {
                console.error('⚠️ Could not fetch conversation details or data empty:', error);
            }
        } catch (err) {
            console.error('Error fetching conversation details:', err);
        }
    };

    const fetchLatestOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_number, order_status')
                .or(`conversation_id.eq.${conversationId},customer_id.eq.${customerId}`)
                .order('created_at', { ascending: false });

            if (data && !error) {
                setOrders(data);
                setLatestOrder(data[0] || null);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                setMessages(data.map(msg => ({
                    id: msg.id,
                    conversation_id: msg.conversation_id,
                    text: msg.text,
                    sender: msg.sender,
                    created_at: msg.created_at,
                    platform: msg.platform,
                    image_url: msg.image_url,
                    file_type: msg.file_type
                })));
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchConversationDetails();
        fetchQuickReplies();
        fetchLatestOrder();

        // Subscribe to real-time messages
        const channel = supabase
            .channel(`public:messages:conversation_id=eq.${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const newMessage = payload.new as any;
                    setMessages((prev) => {
                        if (prev.find((m) => m.id === newMessage.id)) return prev;
                        return [{
                            id: newMessage.id,
                            conversation_id: newMessage.conversation_id,
                            text: newMessage.text,
                            sender: newMessage.sender,
                            created_at: newMessage.created_at,
                            platform: newMessage.platform,
                            image_url: newMessage.image_url,
                            file_type: newMessage.file_type
                        }, ...prev];
                    });
                }
            )
            .subscribe();

        // Subscribe to order changes to update badge
        const orderChannel = supabase
            .channel(`public:orders:conversation_id=eq.${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    fetchLatestOrder();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(orderChannel);
        };
    }, [conversationId]);

    useEffect(() => {
        // No auto-scroll logic needed for inverted list
    }, []);

    useEffect(() => {
        const backAction = () => {
            if (showQuickReplies) {
                setShowQuickReplies(false);
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [showQuickReplies]);

    const extractPhoneNumber = () => {
        const phoneRegex = /(\b9\d{9}\b)/;
        for (const m of messages) {
            if (m.sender === 'customer') {
                const match = m.text.match(phoneRegex);
                if (match) return match[0];
            }
        }
        return '';
    };

    const extractAddress = () => {
        const addressKeywords = ['kathmandu', 'lalitpur', 'bhaktapur', 'pokhara', 'street', 'marg', 'tol', 'chowk', 'kathmndu', 'pkr', 'ktm'];
        for (const m of messages) {
            if (m.sender === 'customer') {
                const lowerText = m.text.toLowerCase();
                if (addressKeywords.some(kw => lowerText.includes(kw))) {
                    return m.text;
                }
            }
        }
        return '';
    };

    const handleCreateOrder = () => {
        const phone = extractPhoneNumber();
        const address = extractAddress();

        navigation.navigate('CreateOrder', {
            conversationId,
            customerId: recipientId,
            customerName: route.params.customerName,
            platform: platformName,
            pageName: pageName,
            phone,
            address
        });
    };

    const handleSend = async (text: string = inputText, imageUrl?: string, fileType?: string) => {
        console.log('🔵 handleSend triggered:', { text: text.substring(0, 20), hasImage: !!imageUrl, recipientId, conversationId });

        if ((!text.trim() && !imageUrl) || !conversationId || !recipientId) {
            if (!recipientId) {
                console.error('❌ Cannot send: recipientId is NULL');
                alert('Recipient details not loaded. Please wait a second.');
            }
            return;
        }

        const textToSend = text.trim();
        if (!imageUrl) setInputText('');

        // Optimistic Update
        const optimisticId = Date.now().toString();
        const optimisticMsg: Message = {
            id: optimisticId,
            conversation_id: conversationId,
            text: textToSend || (imageUrl ? '[Image]' : ''),
            sender: 'agent',
            created_at: new Date().toISOString(),
            platform: platform || 'facebook',
            image_url: imageUrl,
            file_type: fileType || (imageUrl ? 'image' : 'text')
        };

        setMessages(prev => [optimisticMsg, ...prev]);

        try {
            console.log('📤 Sending to API:', `${API_URL}/api/messages/send`);
            const response = await fetch(`${API_URL}/api/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: recipientId,
                    text: textToSend,
                    platform: platform || 'facebook',
                    pageId: pageId,
                    imageUrl: imageUrl,
                    fileType: fileType
                }),
            });

            console.log('📥 API Response status:', response.status);

            if (!response.ok) {
                const data = await response.json();
                console.error('❌ API Error data:', data);
                throw new Error(data.message || 'Failed to send message');
            }

            console.log('✅ Message sent successfully via API');
        } catch (error: any) {
            console.error('❌ Error sending message:', error);
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            alert('Error sending message: ' + (error.message || 'Unknown error'));
        }
    };

    const copyToClipboard = (text: string) => {
        Clipboard.setString(text);
        Alert.alert('Copied', 'Message copied to clipboard');
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isAgent = item.sender === 'agent';
        // For inverted list, messages[index + 1] is the PREVIOUS message in time
        const showTime = index === messages.length - 1 ||
            new Date(item.created_at).getTime() - new Date(messages[index + 1].created_at).getTime() > 1800000; // 30 mins

        // Check if message has an image (either via image_url column or checking text content just in case)
        const hasImage = item.file_type === 'image' || (item.image_url && item.image_url.length > 0);

        return (
            <View>
                {showTime && (
                    <Text style={styles.timestamp}>
                        {format(new Date(item.created_at), 'MMM d, h:mm a')}
                    </Text>
                )}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => copyToClipboard(item.text)}
                    style={[
                        styles.messageBubble,
                        isAgent ? styles.agentBubble : styles.customerBubble
                    ]}
                >
                    {hasImage && item.image_url ? (
                        <TouchableOpacity onPress={() => {/* Maybe open full screen */ }}>
                            <Image
                                source={{ uri: item.image_url }}
                                style={{ width: 200, height: 150, borderRadius: 10, marginBottom: 4 }}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    ) : null}

                    {item.text && item.text !== '[Image]' && (
                        <Text style={[
                            styles.messageText,
                            isAgent ? styles.agentMessageText : styles.customerMessageText
                        ]}>
                            {item.text}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=random`;

    return (
        <View style={styles.container}>
            {/* Custom Header stays at the top */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={{ width: 12 }} />
                <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{customerName}</Text>
                    <Text style={styles.headerStatus}>Active now</Text>
                </View>

                {latestOrder && (
                    <TouchableOpacity
                        style={[
                            styles.orderBadge,
                            {
                                backgroundColor:
                                    orders.length > 1 ? Colors.primary :
                                        latestOrder.order_status === 'New Order' ? '#FEF9C3' :
                                            latestOrder.order_status === 'Shipped' ? '#DBEAFE' :
                                                latestOrder.order_status === 'Delivered' ? '#DCFCE7' :
                                                    latestOrder.order_status === 'Returned' ? '#FEE2E2' : '#F3F4F6'
                            }
                        ]}
                        onPress={() => {
                            if (orders.length > 1) {
                                setOrdersModalVisible(true);
                            } else {
                                navigation.navigate('OrderDetails', { orderId: latestOrder.id });
                            }
                        }}
                    >
                        <Text style={[
                            styles.orderBadgeText,
                            {
                                color:
                                    orders.length > 1 ? Colors.white :
                                        latestOrder.order_status === 'New Order' ? '#854D0E' :
                                            latestOrder.order_status === 'Shipped' ? '#1E40AF' :
                                                latestOrder.order_status === 'Delivered' ? '#166534' :
                                                    latestOrder.order_status === 'Returned' ? '#991B1B' : '#374151'
                            }
                        ]}>
                            {orders.length > 1 ? '#Orders' : `#${latestOrder.order_number}`}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            inverted={true}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.messageList}
                        />
                    )}

                    {/* Quick Replies Modal/Sheet */}
                    {showQuickReplies && (
                        <View style={styles.quickRepliesContainer}>
                            <Text style={styles.quickReplyTitle}>Quick Replies</Text>
                            <View style={styles.quickReplyGrid}>
                                {quickReplies.map((reply, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.quickReplyChip}
                                        onPress={() => {
                                            setInputText(reply.message);
                                            setShowQuickReplies(false);
                                        }}
                                    >
                                        <Text style={styles.quickReplyText}>{reply.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={[
                        styles.inputBar,
                        { paddingBottom: Math.max(insets.bottom, Spacing.s) }
                    ]}>
                        <TouchableOpacity style={styles.inputAction} onPress={pickImage}>
                            <Camera size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Message..."
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.inputAction}
                            onPress={() => setShowQuickReplies(!showQuickReplies)}
                        >
                            <MessageCircle size={24} color={Colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.inputAction} onPress={handleCreateOrder}>
                            <Plus size={24} color={Colors.primary} />
                        </TouchableOpacity>

                        {inputText.trim() ? (
                            <TouchableOpacity onPress={() => handleSend()} disabled={sending} style={styles.sendButton}>
                                <Send size={24} color={Colors.primary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Multiple Orders Modal */}
            <Modal
                visible={ordersModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setOrdersModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setOrdersModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>All Orders</Text>
                            <TouchableOpacity onPress={() => setOrdersModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={orders}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.orderListItem}
                                    onPress={() => {
                                        setOrdersModalVisible(false);
                                        navigation.navigate('OrderDetails', { orderId: item.id });
                                    }}
                                >
                                    <View>
                                        <Text style={styles.orderListNumber}>#{item.order_number}</Text>
                                        <Text style={styles.orderListStatus}>{item.order_status}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusDot,
                                        {
                                            backgroundColor:
                                                item.order_status === 'New Order' ? '#EAB308' :
                                                    item.order_status === 'Shipped' ? '#3B82F6' :
                                                        item.order_status === 'Delivered' ? '#22C55E' :
                                                            item.order_status === 'Returned' ? '#EF4444' : '#94A3B8'
                                        }
                                    ]} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.s,
        paddingBottom: Spacing.s,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.white,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    backButton: {
        padding: Spacing.s,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: Radius.full,
        marginHorizontal: Spacing.s,
    },
    headerInfo: {
        flex: 1,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    headerStatus: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    orderBadge: {
        paddingHorizontal: Spacing.s,
        paddingVertical: 4,
        borderRadius: Radius.s,
        marginLeft: Spacing.s,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    orderBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        padding: Spacing.m,
        paddingBottom: Spacing.xl,
    },
    timestamp: {
        alignSelf: 'center',
        fontSize: 12,
        color: Colors.textSecondary,
        marginVertical: Spacing.m,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: Spacing.m,
        paddingVertical: Spacing.s,
        borderRadius: 20,
        marginVertical: 2,
    },
    agentBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#0084FF', // Messenger Blue
        borderBottomRightRadius: 4,
    },
    customerBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#F0F0F0',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    agentMessageText: {
        color: Colors.white,
    },
    customerMessageText: {
        color: Colors.text,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.s,
        paddingVertical: Spacing.s,
        borderTopWidth: 0.5,
        borderTopColor: Colors.border,
        backgroundColor: Colors.white,
    },
    inputAction: {
        padding: Spacing.s,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F2F5',
        borderRadius: 20,
        paddingHorizontal: Spacing.m,
        marginHorizontal: Spacing.s,
        minHeight: 36,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
        color: Colors.text,
    },
    sendButton: {
        padding: Spacing.s,
        marginLeft: Spacing.s,
    },
    quickRepliesContainer: {
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        padding: Spacing.m,
    },
    quickReplyTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        marginBottom: Spacing.s,
    },
    quickReplyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    quickReplyChip: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    quickReplyText: {
        fontSize: 13,
        color: Colors.text,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: Radius.l,
        width: '80%',
        maxHeight: '60%',
        padding: Spacing.m,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: Spacing.s,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    orderListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    orderListNumber: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    orderListStatus: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});
