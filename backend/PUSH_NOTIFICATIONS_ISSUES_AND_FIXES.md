# Push Notifications - Issues Found and Fixes Applied

## 🔴 Critical Issues Found

### 1. **RLS Policy Issue (CRITICAL)**
**Problem:** The SQL migration uses `auth.uid()::text = user_id::text` which assumes Supabase Auth is being used. However:
- Your backend uses **BIGINT** for `user_id` (not UUID)
- Your backend uses **custom JWT authentication** (not Supabase Auth)
- When backend accesses Supabase with service role key, `auth.uid()` returns `NULL`
- This causes **ALL operations to be blocked** by RLS

**Fix:** 
- Use the fixed migration: `backend/database/push-tokens-migration-fixed.sql`
- It disables RLS (recommended for backend-only access with service role key)
- If you need RLS, create a policy that allows service role access

### 2. **Async/Await Issue in messagingController.js**
**Problem:** Using `forEach` with async functions doesn't wait for completion and can cause race conditions.

**Location:** `backend/controllers/messagingController.js:696`

**Before:**
```javascript
participantIds.forEach(async (participantId) => {
  await pushNotificationService.sendPushNotification(...);
});
```

**After:**
```javascript
Promise.allSettled(
  participantIds.map(async (participantId) => {
    await pushNotificationService.sendPushNotification(...);
  })
);
```

**Fix Applied:** ✅ Changed to `Promise.allSettled` to properly handle async operations

### 3. **Missing Invalid Token Cleanup**
**Problem:** When push tokens become invalid/expired, they remain in the database, causing unnecessary API calls and errors.

**Fix Applied:** ✅ Added automatic cleanup of invalid tokens in `pushNotificationService.js`

## ⚠️ Potential Issues to Monitor

### 4. **Type Consistency**
- Ensure `user_id` is consistently handled as `BIGINT` (number) throughout
- The `pushTokenController.js` compares `userId !== currentUserId.toString()` - ensure types match

### 5. **Error Handling**
- Push notification failures don't block message sending (good)
- But errors are only logged - consider adding error tracking/monitoring

### 6. **Unread Message Check Logic**
**Location:** `pushNotificationService.js:35-64`

The logic checks for unread messages but has a potential issue:
- If `onlyIfUnread = true` but `data.conversationId` is missing, it will send anyway
- Consider adding validation

## ✅ What's Working Well

1. **Token Validation:** Expo push token format is validated before storage
2. **Chunking:** Notifications are properly chunked (Expo limit: 100 per batch)
3. **Error Isolation:** Push notification failures don't break message sending
4. **Multiple Tokens:** Supports multiple devices per user
5. **Token Updates:** Existing tokens are updated instead of creating duplicates

## 📋 Action Items

1. **Run the fixed migration:**
   ```sql
   -- Run: backend/database/push-tokens-migration-fixed.sql
   -- This disables RLS (recommended for backend-only access)
   ```

2. **Test push notifications:**
   - Register a push token via `/api/users/push-token`
   - Send a message and verify notification is received
   - Check logs for any errors

3. **Monitor token cleanup:**
   - Check logs for "Removed X invalid push token(s)" messages
   - Verify invalid tokens are removed from database

4. **Environment Variables:**
   - Ensure `SUPABASE_KEY` (service role) is set in `.env`
   - If using anon key, you'll need to adjust RLS policies

## 🔧 Configuration Check

Verify your `.env` has:
```env
SUPABASE_KEY=your_service_role_key_here
# OR
SUPABASE_ANON_KEY=your_anon_key_here
```

**Recommendation:** Use `SUPABASE_KEY` (service role) for backend operations as it bypasses RLS, which is what you need for this implementation.

## 📝 Notes

- The backend uses service role key which bypasses RLS
- If you switch to anon key, you'll need to enable and configure RLS policies
- The current implementation is optimized for backend-only access
- Frontend should register tokens via the API endpoint, not directly to Supabase

