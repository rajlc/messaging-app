import axios from 'axios';

async function testWebhook() {
    const url = 'http://localhost:3001/api/logistics/ncm/webhook';

    const payloads = [
        {
            name: 'Single Order Update',
            data: {
                "order_id": "123456",
                "status": "Delivered",
                "timestamp": "2024-01-15T10:30:00Z",
                "event": "delivery_completed"
            }
        },
        {
            name: 'Bulk Order Update',
            data: {
                "order_ids": ["123456", "123457", "123458"],
                "status": "Dispatched",
                "timestamp": "2024-01-15T10:30:00Z",
                "event": "order_dispatched"
            }
        },
        {
            name: 'Test Webhook',
            data: {
                "event": "order.status.changed",
                "order_id": "TEST-123456",
                "status": "In Transit",
                "timestamp": "2024-01-15T10:30:00Z",
                "test": true
            }
        }
    ];

    for (const payload of payloads) {
        console.log(`Sending payload: ${payload.name}`);
        try {
            const response = await axios.post(url, payload.data);
            console.log(`Response: ${response.status} ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.error(`Error sending payload ${payload.name}: ${error.message}`);
        }
        console.log('---');
    }
}

testWebhook();
