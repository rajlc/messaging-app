import axios from 'axios';

async function testNcmChangelog() {
    const url = 'http://localhost:3002/api/logistics/ncm/webhook';

    const payload = {
        order_id: '19057881',
        status: 'Order Dispatched',
        cod: 2500, // Changed from 2000
        charge: 200 // Changed from 170
    };

    console.log('Testing NCM Webhook with changed COD and Charge...');
    try {
        const response = await axios.post(url, payload);
        console.log('Response:', response.data);
    } catch (error: any) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testNcmChangelog();
