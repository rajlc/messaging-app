
import axios from 'axios';

async function testWebhook() {
    const url = 'http://localhost:3002/api/logistics/webhook';
    const secret = 'f3992ecc-59da-4cbe-a049-a13da2018d51';

    console.log('Testing Webhook Integration Verification...');
    try {
        const response = await axios.post(url, {
            event: 'webhook_integration'
        }, {
            headers: {
                'X-Pathao-Merchant-Webhook-Integration-Secret': secret
            }
        });

        console.log('Status:', response.status);
        console.log('Body:', response.data);
        console.log('Headers:', response.headers);

        const returnedSecret = response.headers['x-pathao-merchant-webhook-integration-secret'];
        if (returnedSecret === secret) {
            console.log('✅ SUCCESS: Integration Secret verified in response header.');
        } else {
            console.error('❌ FAILURE: Missing or incorrect secret in response header.');
            console.log('Received:', returnedSecret);
        }

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

testWebhook();
