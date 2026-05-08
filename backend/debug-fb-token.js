const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/META_PAGE_ACCESS_TOKEN=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : null;

if (!token) {
    console.error("❌ No META_PAGE_ACCESS_TOKEN found in .env");
    process.exit(1);
}

console.log("🔑 Testing Token:", token.substring(0, 10) + "...");

const customerId = '25690113740644164';

async function testApi() {
    try {
        console.log(`\n📡 Testing v20.0 API for ID: ${customerId}...`);
        const response = await axios.get(
            `https://graph.facebook.com/v20.0/${customerId}`,
            {
                params: {
                    fields: 'name,first_name,last_name,profile_pic',
                    access_token: token
                }
            }
        );
        console.log("✅ SUCCESS! Profile data:", response.data);
    } catch (error) {
        console.error("❌ FAILED!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testApi();
