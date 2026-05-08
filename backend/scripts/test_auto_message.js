
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const API_URL = 'http://localhost:3001';

async function test() {
    console.log('--- Debugging Auto-Message Flow ---');

    // 1. Check Env
    if (!PAGE_ACCESS_TOKEN) {
        console.error('❌ META_PAGE_ACCESS_TOKEN is missing in .env');
        return;
    }
    console.log('✅ META_PAGE_ACCESS_TOKEN is present');

    // 2. Fetch Templates
    try {
        console.log('Testing Fetch Templates...');
        const res = await axios.get(`${API_URL}/api/templates`);
        console.log(`✅ Templates fetched: Found ${res.data.length} templates`);
        console.log('Sample Template:', res.data.find(t => t.status === 'Cancel')?.template);
    } catch (error) {
        console.error('❌ Failed to fetch templates:', error.message);
    }

    // 3. Test Debug Endpoint
    try {
        console.log('Testing Debug Endpoint (test-message)...');
        const res = await axios.post(`${API_URL}/api/orders/test-message`, {
            orderId: '281f3f89-a688-49b2-b981-c3b5f1ae9407',
            status: 'Cancel'
        });
        console.log('✅ Debug Endpoint Response:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error('❌ Debug Endpoint Failed:', error.response?.data || error.message);
    }
}

test();
