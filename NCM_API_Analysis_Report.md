# 🚚 Nepal Can Move (NCM) — Full API Analysis Report
**Prepared for:** Bagmati Traders / Can Logistics  
**Date:** 2026-08-20  
**Source:** README_API_DOCUMENTATION_V20260116.pdf (v2026-05-27, 32 pages)  
**API Base:** `https://demo.nepalcanmove.com`

---

## 📋 Executive Summary

NCM has **significantly updated** their API from v1 to a combined v1/v2 system. Multiple **new endpoints** have been added since your original integration. Your webapp already uses the core logistics API (order creation, status, comments). The new NCM **E-Commerce platform** now exposes a **Webhook system** that integrates directly with their logistics token — meaning **the same API token** you use for logistics also powers the e-commerce webhook integration.

---

## 🔑 About the NCM API Token (Critical Clarification)

> [!IMPORTANT]
> **YES — The "NCM API Token" shown in the Can Logistics E-Commerce Dashboard IS the same logistics vendor token.**
>
> NCM uses a **single unified token** per vendor account. This one token authenticates ALL operations:
> - Logistics order creation/tracking
> - Webhook URL registration
> - E-Commerce platform integration
>
> **Where to find it:** NCM Portal → Resources → API Integration → Production Token

This means when you paste your existing logistics token into the "NCM API Token" field in your e-commerce dashboard, it enables:
1. Automated order dispatch to NCM from your e-commerce orders
2. Real-time delivery status webhook callbacks to your webapp

---

## 📡 Webhook Integration — What Happens When You Add the Webhook URL?

When you register your webhook URL (`https://commerce.thecanbrand.com/api/vendor-ncm-config/webhook/...`) in the NCM e-commerce dashboard:

```
NCM E-Commerce Platform ──────► NCM Logistics System
                                        │
                          (when delivery status changes)
                                        │
                                        ▼
                          HTTP POST → Your Webhook URL
                                        │
                                        ▼
                              Your Webapp receives event
```

### ✅ Webhook Events That Are Triggered

| Event Key | Status Shown | When It Fires |
|---|---|---|
| `pickup_completed` | **Pickup Complete** | NCM rider picks up from your branch |
| `sent_for_delivery` | **Sent for Delivery** | Order dispatched to customer |
| `order_dispatched` | **Dispatched** | Dispatched from origin branch |
| `order_arrived` | **Arrived** | Arrived at destination branch |
| `delivery_completed` | **Delivered** | Successfully delivered to customer |
| `order.status.changed` | *(test event)* | Test payload from "Test Webhook" button |

> [!NOTE]
> **Webhook version is 1.0 (Beta)** — NCM has stated it is subject to changes. No retry mechanism is currently implemented for failed webhooks. Failures are handled silently.

---

## 📦 Webhook Payload Structure

### Single Order Event (Most Common)
```json
{
  "order_id": "123456",
  "status": "Delivered",
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "delivery_completed"
}
```

### Bulk Order Event (Multiple Orders at Once)
```json
{
  "order_ids": ["123456", "123457", "123458"],
  "status": "Dispatched",
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "order_dispatched"
}
```

### Test Payload (from "Test Webhook" button in dashboard)
```json
{
  "event": "order.status.changed",
  "order_id": "TEST-123456",
  "status": "In Transit",
  "timestamp": "2024-01-01T12:00:00+05:45",
  "test": true
}
```

**Webhook Request Headers sent by NCM:**
```
Content-Type: application/json
User-Agent: NCM-Webhook/1.0
Content-Length: [payload-length]
```

---

## ❓ Can New E-Commerce Orders Show Directly in Your Webapp?

> [!IMPORTANT]
> **NO — not automatically with just the webhook URL.**
>
> The NCM webhook is a **LOGISTICS webhook**, not an order creation webhook. It only fires when a **delivery status changes** inside the NCM logistics system. It does NOT fire when a new order is placed on your e-commerce store.

### Flow Clarification:

```
CUSTOMER places order on E-Commerce Store
        │
        ▼
E-Commerce Platform creates NCM logistics shipment (via your API token)
        │
        ▼
NCM rider picks up → NCM fires webhook → Your Webapp gets status update
```

### To Show New Orders in Your Webapp — You Need:
The **Can Logistics E-Commerce Platform API** (thecanbrand.com), NOT the NCM webhook. The webhook URL in the dashboard is only for NCM to **call back into** your system with delivery updates — not order creation events.

---

## 🆕 New API Endpoints Added Since Your Original Integration

Your webapp likely uses the old **v1 endpoints**. NCM has now added many **v2 endpoints**:

### NEW in v2 (Likely Not Yet Implemented)

| Endpoint | Method | What It Does |
|---|---|---|
| `/api/v2/vendor/webhook` | POST | Register/Update/Remove webhook URL programmatically |
| `/api/v2/vendor/webhook/test` | POST | Send test payload to your webhook URL |
| `/api/v2/vendor/ticket/create/new` | POST | Create support ticket (General, Pickup, Return, Order Processing) |
| `/api/v2/vendor/ticket/cod/create` | POST | Create COD transfer request ticket |
| `/api/v2/vendor/ticket/close/<id>` | POST | Close a support ticket |
| `/api/v2/vendor/staffs` | GET | List vendor staff members (paginated, searchable) |
| `/api/v2/vendor/assigned-branches` | GET | Get your assigned pickup branches |
| `/api/v2/vendor/order/return` | POST | Mark order for return |
| `/api/v2/vendor/order/exchange-create` | POST | Create exchange order (auto-creates 2 linked orders) |
| `/api/v2/vendor/order/redirect` | POST | Redirect order to new address/customer mid-transit |
| `/api/v2/vendor/order/label/<id>` | GET | Get label/AWB data for a single order |
| `/api/v2/vendor/order/label/` | POST | Get label/AWB data for multiple orders (batch up to 100) |
| `/api/v2/vendor/customers` | GET | List all your customers (paginated, name/phone filter) |
| `/api/v2/vendor/customers/<id>/detail` | GET | Full profile + order history of a specific customer |
| `/api/v2/vendor/ratings?phone=` | GET | Customer delivery reliability score (total, delivered, returned) |
| `/api/v1/tickets/<id>/detail` | GET | View a specific ticket's full details |
| `/api/v1/vendor/tickets/<id>/response` | POST | Reply to a support ticket (auto-reopens if closed) |
| `/api/v1/orders/statuses` | POST | Bulk status check for multiple order IDs at once |

### Already Implemented (v1 — Original)

| Endpoint | Method | Status |
|---|---|---|
| `/api/v2/branches` | GET | ✅ Implemented |
| `/api/v1/shipping-rate` | GET | ✅ Implemented |
| `/api/v1/order` | GET | ✅ Implemented |
| `/api/v1/order/comment` | GET | ✅ Implemented |
| `/api/v1/order/getbulkcomments` | GET | ✅ Implemented |
| `/api/v1/order/status` | GET | ✅ Implemented |
| `/api/v1/order/create` | POST | ✅ Implemented |
| `/api/v1/comment` | POST | ✅ Implemented |

---

## ⭐ Key Features You Can NOW Add to Your Webapp

### 1. 🏷️ Print Delivery Labels (AWB)
Use `/api/v2/vendor/order/label/<id>` — fetch all label data (sender, receiver, branches, COD, barcode info) and auto-print AWB labels directly from your webapp. Supports batch printing up to 100 orders at once.

### 2. 🔄 Return & Exchange Management
- Mark orders for return via API with optional reason comment
- Create exchange orders — system automatically creates 2 linked orders (customer order + vendor return)

### 3. 📍 Order Redirect (Mid-Transit Address Change)
Change delivery address, customer name/phone, or even the destination branch for an order already in the NCM system via `/api/v2/vendor/order/redirect`.

### 4. 🎫 Support Ticket System
Create and manage NCM support tickets (Pickup scheduling, General issues, Returns, COD transfer requests) directly from your webapp without needing to visit the NCM portal.

### 5. 📊 Customer Risk / Reliability Score
Before dispatching a COD order, check customer delivery history via `/api/v2/vendor/ratings?phone=9841234567`. Returns `total_orders`, `total_delivered`, `total_returned` — helps flag risky customers across the entire NCM network.

### 6. 📬 Real-Time Delivery Status Updates
Register webhook URL → your backend receives live events → update order status in your webapp database in real-time without polling the API. Huge performance improvement over polling every N minutes.

---

## 🔧 API Rate Limits

| Operation | Daily Limit |
|---|---|
| Order Creation | **1,000 orders / day** |
| Order View (Detail, Comments, Status) | **20,000 requests / day** |

> [!WARNING]
> Avoid creating duplicate orders from both bulk file upload AND the API system at the same time. Do not run automated scripts that spam the server.

---

## 🔒 Webhook Security Recommendations

> [!WARNING]
> The webhook URL is visible in your e-commerce dashboard. Anyone who sees the URL could potentially send fake payloads to it.

**Recommended security measures for your backend:**
1. Add a secret token as a query param in your webhook URL: `?token=your-secret-here`
2. Validate `Content-Type: application/json` on every incoming request
3. Handle the `test: true` flag — detect test webhooks and skip real processing
4. Implement **idempotency** — same `order_id` + `event` combination should not be processed twice
5. Respond within **10 seconds** — NCM will mark delivery as failed if no response within 10s
6. Use HTTPS only (never HTTP) for your webhook endpoint

---

## 📋 Recommended Action Plan for Your Webapp

| Priority | Action | Impact |
|---|---|---|
| 🔴 **High** | Implement webhook receiver endpoint in backend | Real-time delivery status (no more polling) |
| 🔴 **High** | Register your webhook URL via NCM portal or API | Activates live event push |
| 🟡 **Medium** | Add bulk status check using `/api/v1/orders/statuses` | Check many orders in 1 API call |
| 🟡 **Medium** | Add Label Print feature using v2 label API | Print AWBs directly from webapp |
| 🟡 **Medium** | Add Customer Rating check before order dispatch | Reduce failed COD deliveries |
| 🟢 **Low** | Add Return/Exchange order management | Full order lifecycle control |
| 🟢 **Low** | Integrate Support Ticket system | Manage NCM issues from your webapp |
| 🟢 **Low** | Add Order Redirect feature | Fix wrong address without calling NCM |

---

## 📞 NCM Contact

- **IT / Integration Support:** IT@nepalcanmove.com
- **General Support:** support@nepalcanmove.com  
- **Phone:** 01-5199684
- **Address:** Tinkune, Kathmandu, Nepal
- **Portal:** https://portal.nepalcanmove.com
- **Helpline:** 01-5970736

---

> [!NOTE]
> **Bottom Line:** The NCM webhook URL you see in the Can Logistics e-commerce dashboard is for NCM to **push delivery status events** to your system — pickup, dispatch, arrival, and delivery. It will **NOT** automatically show new e-commerce orders in your webapp (that requires the e-commerce platform's own order feed API). However, once an order is dispatched via NCM logistics, all delivery lifecycle events will flow into your webapp in real-time via webhook — no polling needed.
