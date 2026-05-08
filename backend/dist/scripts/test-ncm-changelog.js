"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testNcmChangelog() {
    const url = 'http://localhost:3002/api/logistics/ncm/webhook';
    const payload = {
        order_id: '19057881',
        status: 'Order Dispatched',
        cod: 2500,
        charge: 200
    };
    console.log('Testing NCM Webhook with changed COD and Charge...');
    try {
        const response = await axios_1.default.post(url, payload);
        console.log('Response:', response.data);
    }
    catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}
testNcmChangelog();
//# sourceMappingURL=test-ncm-changelog.js.map