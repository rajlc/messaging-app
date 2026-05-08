import { Alert, Platform, Linking, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

import * as NavigationService from '../navigation/NavigationService';

let callDetector: any = null;
let onCallDetectedListener: ((data: any) => void) | null = null;

export const setCallListener = (listener: (data: any) => void) => {
    onCallDetectedListener = listener;
};

export const startCallAssistant = async () => {
    // 1. Strict Safety Check (prevents crash in Expo Go)
    const nativeModule = NativeModules.CallDetectionManager || NativeModules.CallDetectorManager;
    if (Platform.OS === 'android' && !nativeModule) {
        console.warn('Call Assistant: Native module not found. This feature requires a native build/APK.');
        return;
    }

    try {
        const isEnabled = await AsyncStorage.getItem('call_assistant_enabled');
        if (isEnabled !== 'true') return;

        console.log('Starting Call Assistant...');

        // 2. Lazy Load the library only if native module exists
        const CallDetectorManager = require('react-native-call-detector').default || require('react-native-call-detector');

        if (callDetector) stopCallAssistant();

        callDetector = new CallDetectorManager(
            (event: string, phoneNumber: string) => {
                console.log('Call Event:', event, 'Phone:', phoneNumber);

                // event: Incoming, Connected, Disconnected, Dialing, Offhook
                if (event === 'Incoming' || event === 'Dialing' || event === 'Offhook') { 
                    if (phoneNumber) {
                        handleCallDetected(phoneNumber);
                    }
                }
            },
            true, // readPhoneNumber
            () => {
                console.log('Permission denied for Call Detector');
            },
            {
                title: 'Phone State Permission',
                message: 'This app needs access to your phone state to show the Order Assistant popup during calls.',
            }
        );
    } catch (error) {
        console.error('Failed to start call assistant', error);
    }
};

export const stopCallAssistant = () => {
    if (callDetector) {
        callDetector.dispose();
        callDetector = null;
    }
};

const handleCallDetected = async (phoneNumber: string) => {
    try {
        // 1. Lookup customer in Supabase
        const { data: customer, error } = await supabase
            .from('orders')
            .select('customer_name, total_amount, created_at')
            .eq('phone_number', phoneNumber)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Supabase lookup error:', error);
        }

        // 2. Show the "Popup"
        let message = `Incoming call from ${phoneNumber}`;
        let title = 'New Customer';

        if (customer) {
            title = `Customer: ${customer.customer_name}`;
            message = `Last order: Rs. ${customer.total_amount}\nDate: ${new Date(customer.created_at).toLocaleDateString()}`;
        }

        // Trigger the premium popup if listener is set
        if (onCallDetectedListener) {
            onCallDetectedListener({
                phoneNumber,
                customerName: customer?.customer_name,
                lastOrderInfo: customer ? `Last: Rs. ${customer.total_amount} (${new Date(customer.created_at).toLocaleDateString()})` : undefined
            });
        } else {
            // Fallback to Alert if no UI is mounted
            Alert.alert(
                title,
                message,
                [
                    { text: 'Dismiss', style: 'cancel' },
                    {
                        text: 'Create Order',
                        onPress: () => {
                            NavigationService.navigate('CreateOrder', { 
                                phone: phoneNumber,
                                customerName: customer?.customer_name || ''
                            });
                        },
                    },
                ]
            );
        }
    } catch (error) {
        console.error('Error handling detected call', error);
    }
};
