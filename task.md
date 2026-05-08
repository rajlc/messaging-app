# Pick & Drop Integration Tasks

## Backend
- [/] DB migration: add pickdrop columns to orders table
- [/] Create `pick-drop.service.ts`
- [x] Investigate error logs and directory structure
- [x] Identify root cause of "dist/main" missing on Render
- [x] Fix nested build output issue (dist/src/main.js)
- [x] Verify successful deployment on Render
- [ ] Audit Trail (Order Status History) Fix
    - [ ] Make `recordStatusHistory` public in `OrdersService`
    - [ ] Update `LogisticsService.createOrder` (Pathao) with history logging
    - [ ] Update `LogisticsService.handleWebhook` (Pathao) with history logging
    - [ ] Update `PickDropService.createOrder` with history logging
    - [ ] Update `PickDropService.syncOrder` with history logging
    - [ ] Update `PickDropService.handleWebhook` with history logging
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
