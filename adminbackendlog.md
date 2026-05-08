🚀 Backend server is running on http://localhost:3001
Client connected: lQiksj70kdPzm-_qAAAC
Client connected: C4BaXxz7fQWq2DieAAAD
[2026-02-02T09:18:22.063Z] GET /api/users/check-active-status
✅ Supabase initialized with SERVICE_ROLE_KEY
[2026-02-02T09:18:52.044Z] GET /api/users/check-active-status
[2026-02-02T09:18:59.353Z] POST /webhooks/meta
================================================================================
--- Incoming Meta Webhook ---
Received at: 2026-02-02T09:18:59.372Z
{
  "object": "page",
  "entry": [
    {
      "time": 1770023939849,
      "id": "107953682325493",
      "messaging": [
        {
          "sender": {
            "id": "25308828325386242"
          },
          "recipient": {
            "id": "107953682325493"
          },
          "timestamp": 1770023939176,
          "message": {
            "mid": "m_7nlZNjzeIMgh9xoqogqYZKZkpOaGXHpCtDocMhovvbkJyO58pBn5hQR_NPsMXpQXc307vWTXnRE9IW-VzcE1GA",
            "text": "hi"
          }
        }
      ]
    }
  ]
}

📋 Processing entry for Page ID: 107953682325493
   - Has messaging events: true
   - Has changes (feed) events: false
   ✉️ Found 1 messaging event(s)
Processing messaging event: {
  "sender": {
    "id": "25308828325386242"
  },
  "recipient": {
    "id": "107953682325493"
  },
  "timestamp": 1770023939176,
  "message": {
    "mid": "m_7nlZNjzeIMgh9xoqogqYZKZkpOaGXHpCtDocMhovvbkJyO58pBn5hQR_NPsMXpQXc307vWTXnRE9IW-VzcE1GA",
    "text": "hi"
  }
}
[FACEBOOK] Message from 25308828325386242 to Page 107953682325493: hi
📥 Fetching profile for Facebook user 25308828325386242 (Page: 107953682325493)
📤 Broadcasting message to frontend via socket.io
Platform: facebook
Message: {
  text: 'hi',
  senderId: '25308828325386242',
  pageId: '107953682325493',
  timestamp: 1770023939176
}
Connected clients: 2
✅ Message broadcast complete
Socket message emitted to frontend
No messaging events or changes found in entry
================================================================================
✅ Webhook processing complete

✅ User profile fetched successfully
[2026-02-02T09:19:00.080Z] GET /api/users/check-active-status
[Supabase] Message saved. Updating conversation b48e316b-d7ae-4532-8a3e-0825ce18699a...
[Supabase] Conversation b48e316b-d7ae-4532-8a3e-0825ce18699a updated successfully.
✅ Message saved to Supabase
Client disconnected: C4BaXxz7fQWq2DieAAAD
[2026-02-02T09:19:07.531Z] GET /api/conversations
[2026-02-02T09:19:07.542Z] GET /api/comments
[2026-02-02T09:19:07.548Z] GET /api/facebook/page-info
[2026-02-02T09:19:07.574Z] GET /api/conversations
[2026-02-02T09:19:07.579Z] GET /api/users/check-active-status
Client connected: jonWLzh3Ng26ypY-AAAG
[2026-02-02T09:19:07.692Z] GET /api/comments
[2026-02-02T09:19:07.976Z] GET /api/facebook/page-info