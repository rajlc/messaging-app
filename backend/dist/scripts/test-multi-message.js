"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '../../.env') });
const port = 3002;
const backendUrl = `http://localhost:${port}/api/webhooks/marketplace`;
const apiKey = process.env.INVENTORY_APP_API_KEY;
if (!apiKey) {
    console.error('INVENTORY_APP_API_KEY is not defined in .env');
    process.exit(1);
}
async function runTest() {
    console.log('Sending webhook request with multiple message bubbles: ["avaliable", "Delivery Charge"]');
    try {
        const res = await axios_1.default.post(backendUrl, {
            profileId: 'facebook_marketplace',
            profileName: 'Test Marketplace Account',
            customerId: 'test-customer-123',
            customerName: 'John Doe',
            messageText: 'avaliable Delivery Charge',
            messageTexts: ['avaliable', 'Delivery Charge']
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });
        console.log('Response status:', res.status);
        console.log('Response data:', JSON.stringify(res.data, null, 2));
        console.log('\nTesting duplicate/in-memory lock: sending the exact same payload again immediately...');
        const resDup = await axios_1.default.post(backendUrl, {
            profileId: 'facebook_marketplace',
            profileName: 'Test Marketplace Account',
            customerId: 'test-customer-123',
            customerName: 'John Doe',
            messageText: 'avaliable Delivery Charge',
            messageTexts: ['avaliable', 'Delivery Charge']
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });
        console.log('Duplicate Response status:', resDup.status);
        console.log('Duplicate Response data:', JSON.stringify(resDup.data, null, 2));
    }
    catch (err) {
        console.error('Request failed:', err.response?.data || err.message);
    }
}
runTest();
//# sourceMappingURL=test-multi-message.js.map