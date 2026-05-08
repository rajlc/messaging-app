/**
 * Test script to verify webhook subscription and simulate a comment webhook
 * Run this to check if your webhook endpoint is working
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

// Simulate a Facebook comment webhook
const commentWebhook = {
    object: 'page',
    entry: [
        {
            id: '123456789', // Your page ID
            time: Date.now(),
            changes: [
                {
                    field: 'feed',
                    value: {
                        item: 'comment',
                        verb: 'add',
                        comment_id: 'test_comment_123',
                        post_id: 'test_post_456',
                        from: {
                            id: 'test_user_789',
                            name: 'Test User'
                        },
                        message: 'This is a test comment from the script!'
                    }
                }
            ]
        }
    ]
};

async function testCommentWebhook() {
    console.log('🧪 Testing comment webhook...\n');
    console.log('Sending webhook payload:');
    console.log(JSON.stringify(commentWebhook, null, 2));
    console.log('\n');

    try {
        const response = await axios.post(`${BACKEND_URL}/webhooks/meta`, commentWebhook);

        console.log('✅ Webhook test successful!');
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        console.log('\n📝 Check your backend console for logs about the comment being processed.');
        console.log('📊 Check your database for the new comment.');
        console.log('🔌 Check your frontend if WebSocket event was emitted.');
    } catch (error) {
        console.error('❌ Webhook test failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testCommentWebhook();
