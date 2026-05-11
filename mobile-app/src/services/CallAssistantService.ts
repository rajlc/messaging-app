import { Alert, Platform, Linking, NativeModules, ToastAndroid, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

import * as NavigationService from '../navigation/NavigationService';

let callDetector: any = null;
let onCallDetectedListener: ((data: any) => void) | null = null;

export const setCallListener = (listener: (data: any) => void) => {
    onCallDetectedListener = listener;
};

export const startCallAssistant = async () => {
    const nativeModule = NativeModules.CallDetectionManager || NativeModules.CallDetectorManager;
    if (Platform.OS === 'android' && !nativeModule) {
        console.warn('Call Assistant: Native module not found. This feature requires a native build/APK.');
        return;
    }

    // Permission check for Android
    if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const permissions = [
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
        ];
        
        try {
            const granted = await PermissionsAndroid.requestMultiple(permissions);
            const allGranted = Object.values(granted).every(status => status === PermissionsAndroid.RESULTS.GRANTED);
            if (!allGranted) {
                console.warn('Call Assistant: Permissions not granted.');
                return;
            }
        } catch (err) {
            console.error('Call Assistant: Permission request error', err);
        }
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
                // Note: On some Android versions, Incoming event might not have the phoneNumber
                // but Offhook/Incoming combined with READ_CALL_LOG permission usually works.
                if (event === 'Incoming' || event === 'Offhook') { 
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
        console.log('Handling call for:', phoneNumber);
        
        // Immediate feedback
        if (Platform.OS === 'android') {
            Vibration.vibrate(500);
            ToastAndroid.show(`Call Assistant: Processing ${phoneNumber}`, ToastAndroid.SHORT);
        }

        // 1. Lookup customer in Supabase
        // Clean phone number (remove +, spaces, etc for lookup)
        const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10); // Last 10 digits

        const { data: customer, error } = await supabase
            .from('orders')
            .select('customer_name, total_amount, created_at')
            .or(`phone_number.ilike.%${cleanPhone}%,phone_number.eq.${phoneNumber}`)
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
            // To show over other apps, we'd need a native activity, 
            // but ToastAndroid + Alert is the best we can do with standard RN in background
            if (Platform.OS === 'android') {
                ToastAndroid.show(`${title}\n${message}`, ToastAndroid.LONG);
            }

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
