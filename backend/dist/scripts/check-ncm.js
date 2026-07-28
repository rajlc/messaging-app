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
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const supabaseUrl = process.env.SUPABASE_URL || 'https://jrcluodakvudjkwlrrxi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
async function testTypes() {
    const { data: settings } = await supabase
        .from('courier_api_settings')
        .select('*')
        .eq('provider', 'ncm')
        .single();
    const token = settings.password || settings.client_secret || settings.api_key;
    const baseUrl = (settings.base_url || 'https://portal.nepalcanmove.com').trim().replace(/\/+$/, '');
    const typesToTest = ['Pickup/Collect', 'Send', 'D2B', 'B2B', 'Door2Door', 'BranchPickup'];
    for (const t of typesToTest) {
        try {
            const res = await axios_1.default.get(`${baseUrl}/api/v1/shipping-rate`, {
                headers: { 'Authorization': `Token ${token}` },
                params: {
                    creation: 'NAYA BUSPARK',
                    destination: 'TRISHULI',
                    type: t
                },
                timeout: 5000
            });
            console.log(`Rate for type="${t}":`, res.data);
        }
        catch (err) {
            console.log(`Failed for type="${t}":`, err.response?.status || err.message);
        }
    }
}
testTypes();
//# sourceMappingURL=check-ncm.js.map