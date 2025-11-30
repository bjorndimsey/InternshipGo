# Fix Google OAuth Redirect URI Mismatch Error

## Problem
Error: `redirect_uri_mismatch` when trying to login with Google on web.

## Solution

### Step 1: Update Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Find your **OAuth 2.0 Client ID** (the one with `googleWebClientId`)

3. **Add Authorized Redirect URIs:**
   Click on your OAuth client ID and add these URIs:

   **For Production (Web):**
   ```
   https://internshipgo.site
   https://internshipgo.site/
   https://www.internshipgo.site
   https://www.internshipgo.site/
   ```

   **For Development (if needed):**
   ```
   http://localhost:19006
   http://localhost:19006/
   ```

4. **Save Changes:**
   - Click **Save**
   - Wait a few minutes for changes to propagate

### Step 2: Verify Your OAuth Client Configuration

Make sure your OAuth client is configured as:
- **Application type:** Web application
- **Authorized JavaScript origins:**
  ```
  https://internshipgo.site
  https://www.internshipgo.site
  ```
- **Authorized redirect URIs:** (as listed above)

### Step 3: Test the Fix

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Try Google login again**
3. **Check browser console** for any errors

---

## What Changed in Code

The code now explicitly sets the redirect URI for web platform:
- Uses `window.location.origin` for web
- Falls back to `https://internshipgo.site` if window is not available
- Mobile platforms still use Expo's automatic redirect URI handling

---

## Common Issues

### Issue: Still getting redirect_uri_mismatch

**Solutions:**
1. **Wait 5-10 minutes** after updating Google Cloud Console (changes need to propagate)
2. **Clear browser cache completely**
3. **Check the exact redirect URI** in the error message and add it to Google Cloud Console
4. **Verify you're using the correct OAuth Client ID** (Web Client ID, not Android/iOS)

### Issue: Works locally but not on production

**Solution:**
- Make sure you added the production domain (`https://internshipgo.site`) to Google Cloud Console
- The redirect URI must match exactly (including trailing slash or not)

### Issue: Multiple redirect URIs needed

**Solution:**
- Add all variations:
  - `https://internshipgo.site`
  - `https://internshipgo.site/`
  - `https://www.internshipgo.site`
  - `https://www.internshipgo.site/`

---

## Testing Checklist

- [ ] Updated Google Cloud Console with production redirect URIs
- [ ] Waited 5-10 minutes for changes to propagate
- [ ] Cleared browser cache
- [ ] Tested Google login on production site
- [ ] Verified redirect URI in error message matches what's in Google Cloud Console

---

## Additional Notes

- **Mobile apps** (Android/iOS) use different OAuth Client IDs and don't need redirect URI configuration
- **Web apps** require explicit redirect URI configuration in Google Cloud Console
- The redirect URI must match **exactly** (case-sensitive, including protocol and trailing slash)

