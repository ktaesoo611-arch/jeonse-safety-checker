# Troubleshooting Guide

## MOLIT API 403 Forbidden Error

If you're getting a 403 Forbidden error when testing the MOLIT API, here's how to fix it:

### Cause

The data.go.kr API key might be:
1. Not yet fully activated (can take 1-24 hours after approval)
2. Wrong key type (using Encoding key instead of Decoding key)
3. IP address restrictions

### Solution

#### Option 1: Wait for Activation
- API subscriptions can take up to 24 hours to fully activate
- Check your email for approval confirmation
- Try again in a few hours

#### Option 2: Use the Correct Key Type

Data.go.kr provides TWO types of API keys:

1. **일반 인증키 (Encoding)** - Needs to be URL-decoded before use
2. **일반 인증키 (Decoding)** - Can be used directly ✅ **USE THIS ONE**

**To get the Decoding key:**

1. Go to https://www.data.go.kr
2. Login → **마이페이지** (My Page)
3. Look for **일반 인증키 (Decoding)** section on the left menu
4. Copy the key shown there
5. Replace your `MOLIT_API_KEY` in `.env.local` with this key

#### Option 3: Check API Subscription Status

1. Go to https://www.data.go.kr
2. Login → **마이페이지**
3. Click **오픈API** → **개발계정**
4. Check status of:
   - 국토교통부_아파트매매 실거래자료
   - 건축물대장정보 서비스
5. Both should show: **승인** (Approved)

If they show **대기** (Waiting) or **검토중** (Under Review), you need to wait.

### Test Your Key

After getting the correct key, test it with curl:

```bash
# Replace YOUR_KEY with your actual key
curl "http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=YOUR_KEY&pageNo=1&numOfRows=1&LAWD_CD=11440&DEAL_YMD=202401"
```

**Expected Result**: XML data with apartment transactions

**If Still Forbidden**: Your subscription isn't active yet - wait and try again later.

---

## Supabase Connection Issues

### Error: "supabaseUrl is required"

**Cause**: Environment variables not loaded

**Solution**:
- Make sure `.env.local` exists
- Restart your terminal/IDE
- Run `npm run check-env` to verify

### Error: "Table does not exist"

**Cause**: Database schema not run

**Solution**:
1. Go to Supabase → SQL Editor
2. Run the contents of `database-schema.sql`
3. Verify with `npm run test:supabase`

---

## Google Vision API Issues

### Error: "Billing must be enabled"

**Cause**: Google Cloud project doesn't have billing enabled

**Solution**:
1. Go to Google Cloud Console
2. Enable billing (free tier available)
3. You won't be charged for first 1,000 units/month

### Error: "Permission denied"

**Cause**: Service account doesn't have correct permissions

**Solution**:
1. Go to IAM & Admin → Service Accounts
2. Click on your service account
3. Add role: "Cloud Vision API User"

---

## General Issues

### Environment variables not loading

Run this to check your configuration:
```bash
npm run check-env
```

### Tests failing with "Module not found"

Reinstall dependencies:
```bash
npm install
```

### Port already in use

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3002
```

---

## Need More Help?

1. Check [API-SETUP-WALKTHROUGH.md](API-SETUP-WALKTHROUGH.md) for detailed setup guides
2. Check [README.md](README.md) for project overview
3. Run `npm run check-env` to see what's configured
4. Open an issue on GitHub with error details

---

## Common data.go.kr Issues

### "SERVICE_KEY_IS_NOT_REGISTERED_ERROR"
- Your API key isn't registered yet
- Wait for email confirmation
- Can take up to 24 hours

### "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR"
- You've hit the rate limit (1000 calls/day on free tier)
- Wait 24 hours for reset
- Or upgrade to paid plan

### "INVALID_REQUEST_PARAMETER_ERROR"
- Check your parameters (LAWD_CD, DEAL_YMD format)
- This error actually means your key WORKS!

### "NO_OPENAPI_SERVICE_ERROR"
- You haven't subscribed to this specific API
- Go back to data.go.kr and subscribe
