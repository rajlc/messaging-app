# Pick & Drop Integration Tasks

## Backend
- [/] DB migration: add pickdrop columns to orders table
- [x] Create `pick-drop.service.ts`
- [x] Investigate error logs and directory structure
- [x] Identify root cause of "dist/main" missing on Render
- [x] Fix nested build output issue (dist/src/main.js)
- [x] Verify successful deployment on Render
- [x] **Phase 5: Monitor New Chats Feature**
    - [x] Add `monitorNewChatsEnabled` state persistence in `chrome.storage.local`
    - [x] Update sidebar HTML in `content.js` to add "⚡ Monitor New Chats" toggle button
    - [x] Implement active 3-second background scanner logic to auto-click and auto-reply to new chats
    - [x] Verify functionality manually
- [ ] Audit Trail (Order Status History) Fix
    - [ ] Make `recordStatusHistory` public in `OrdersService`
    - [ ] Update `LogisticsService.createOrder` (Pathao) with history logging
    - [ ] Update `LogisticsService.handleWebhook` (Pathao) with history logging
    - [ ] Update `PickDropService.createOrder` with history logging
    - [x] Update backend `AutoReplyService` type definitions to allow updating trigger type
- [/] Add template variable replacement logic in backend `WebhooksController` with history logging
    - [ ] Consolidate `NcmService` logging to use `OrdersService` method
- [x] Update frontend to use Render backend URL
- [x] Debug Pathao Webhook rejection
- [ ] Update `logistics.controller.ts` with pickdrop endpoints
- [ ] Update `settings.controller.ts` with pickdrop credential endpoints
- [ ] Register PickDropService in `logistics.module.ts`

## Frontend
- [ ] Update `LogisticIntegration.tsx` (add Pick & Drop tab/section)
- [ ] Update `OrderModal.tsx` (add pickdrop option, branch/area fields, ship button)
- [ ] Update `EditOrderModal.tsx` (read-only view of pickdrop fields)
- [x] Deploy Frontend to Vercel
- [x] Configure Mobile App Backend URL
