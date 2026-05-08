# Inventory App - Order Type Implementation Guide

## Changes Required

### 1. marketplace-actions.ts Interface
**File:** `features/sales/actions/marketplace-actions.ts`
**Line:** ~23 (after `user_type: string`)

**Add this line:**
```typescript
order_type: 'Import' | 'Create'
```

---

### 2. marketplace-actions.ts - createMarketplaceOrder Function
**File:** `features/sales/actions/marketplace-actions.ts`
**Line:** ~153 (inside the insert statement, after `user_type: 'Created',`)

**Add this line:**
```typescript
order_type: 'Create',
```

---

### 3. API Route - Messenger Import
**File:** `app/api/sales/messenger/route.ts`
**Line:** ~79 (inside the insert statement, after `user_type: 'Messenger',`)

**Add this line:**
```typescript
order_type: 'Import',
```

---

### 4. Page UI - Table Header
**File:** `app/dashboard/sales/marketplace/page.tsx`
**Line:** ~323 (add new th after Status column)

**Add this column header:**
```typescript
<th className="px-2 py-1.5 text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Order Type</th>
```

---

### 5. Page UI - Table Body
**File:** `app/dashboard/sales/marketplace/page.tsx`
**Line:** ~410 (add new td after Status cell)

**Add this cell:**
```typescript
<td className="px-2 py-1.5">
    <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
        order.order_type === 'Import' 
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    }`}>
        {order.order_type}
    </span>
</td>
```

---

### 6. Page UI - Mobile Card View
**File:** `app/dashboard/sales/marketplace/page.tsx`
**Line:** ~275 (inside the status span, add sibling span)

**Add this badge (after status badge):**
```typescript
<span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
    order.order_type === 'Import' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
}`}>
    {order.order_type}
</span>
```

---

## Summary
- 6 code locations to update
- 3 files to modify
- All changes add `order_type` field with 'Import' or 'Create' values
