# Quick Start Guide - API Setup

## 📋 Checklist

Use this as your step-by-step checklist to get the Jeonse Safety Checker running.

---

## Step 1: Get Data.go.kr API Key (REQUIRED)

**Estimated time: 15-30 minutes (+ approval wait time)**

- [ ] Go to https://www.data.go.kr
- [ ] Create account (requires Korean phone number)
- [ ] Subscribe to **"국토교통부_아파트매매 실거래자료"**
- [ ] Subscribe to **"건축물대장정보 서비스"**
- [ ] Copy your API key from 마이페이지 → 일반 인증키

**Detailed guide**: See [API-SETUP-WALKTHROUGH.md](API-SETUP-WALKTHROUGH.md#1️⃣-datagokr-korean-government-data-portal)

**Test your key**:
```bash
curl "http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=YOUR_KEY&pageNo=1&numOfRows=10&LAWD_CD=11440&DEAL_YMD=202401"
```

---

## Step 2: Set Up Supabase (REQUIRED)

**Estimated time: 10-15 minutes**

- [ ] Go to https://supabase.com
- [ ] Create account (GitHub login recommended)
- [ ] Create new project: `jeonse-safety-checker`
- [ ] Wait for project to initialize (~2 mins)
- [ ] Copy Project URL and API keys from Settings → API
- [ ] Go to SQL Editor
- [ ] Paste and run [database-schema.sql](database-schema.sql)
- [ ] Go to Storage → Create bucket `documents` (private)

**Detailed guide**: See [API-SETUP-WALKTHROUGH.md](API-SETUP-WALKTHROUGH.md#2️⃣-supabase-database--storage)

---

## Step 3: Configure Environment Variables

**Estimated time: 2 minutes**

```bash
cd jeonse-safety-checker
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# REQUIRED - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# REQUIRED - Korean Gov
MOLIT_API_KEY=your_data_go_kr_key

# OPTIONAL - Can add later
GOOGLE_VISION_API_KEY=
GOOGLE_VISION_CREDENTIALS_PATH=
TOSS_PAYMENTS_CLIENT_KEY=
TOSS_PAYMENTS_SECRET_KEY=
```

---

## Step 4: Test Your Setup

**Run these tests in order:**

### Test 1: Parser (No API key needed)
```bash
npm run test:parser
```
✅ Should show parsed 등기부등본 data

### Test 2: Supabase Connection
```bash
npm run test:supabase
```
✅ Should connect and verify all tables exist

### Test 3: MOLIT API
```bash
npm run test:molit
```
✅ Should fetch real transaction data from 마포구

### Test 4: Property Valuation (Full stack)
```bash
npm run test:valuation
```
✅ Should calculate property value using real data

**Note**: Test 4 might fail if the test apartment name doesn't match real data. That's OK - it proves the system is working.

---

## Step 5: Run the Development Server

```bash
npm run dev
```

Visit: http://localhost:3001

---

## 🎯 What You Can Do Now

Once all tests pass:

✅ **Parser works** - Can extract 13+ risk types from 등기부등본
✅ **Database works** - Can store property and analysis data
✅ **MOLIT API works** - Can fetch real transaction prices
✅ **Valuation works** - Can estimate property values

---

## 🚧 Optional: Add Later

### Google Vision API (for OCR)
**When**: When you want to upload PDF documents
**Guide**: [API-SETUP-WALKTHROUGH.md](API-SETUP-WALKTHROUGH.md#3️⃣-google-vision-api-ocr-for-pdf-parsing)

### Toss Payments
**When**: When you want to add payment processing
**Guide**: [API-SETUP-WALKTHROUGH.md](API-SETUP-WALKTHROUGH.md#4️⃣-toss-payments-payment-processing)

---

## 📊 Current Status

After completing these steps, you'll have:

- ✅ Backend API integrations working
- ✅ Property valuation calculator functional
- ✅ Document parser ready
- ✅ Database configured
- ⏳ Frontend UI (Week 1 remaining work)
- ⏳ Risk analysis engine (Week 1 remaining work)
- ⏳ Full report generation (Week 2)

---

## 🆘 Troubleshooting

### "MOLIT_API_KEY not found"
- Make sure you created `.env.local` (not `.env.local.example`)
- Restart your terminal/IDE after creating `.env.local`

### "Table properties does not exist"
- You haven't run `database-schema.sql` in Supabase
- Go to Supabase SQL Editor and run it

### "No recent transaction data found"
- Normal! Test apartment might not exist
- Try with a real apartment name in your area

### "Korean phone number required"
- Data.go.kr requires Korean phone for verification
- Consider asking a Korean friend to help create account

---

## 📞 Need Help?

1. Check [API-SETUP-WALKTHROUGH.md](API-SETUP-WALKTHROUGH.md) for detailed guides
2. Check [README.md](README.md) for project overview
3. Check [SETUP-GUIDE.md](SETUP-GUIDE.md) for development setup

---

## ✅ Verification

Before proceeding to build more features, verify:

```bash
# All tests should pass
npm run test:supabase   # ✅
npm run test:molit      # ✅
npm run test:parser     # ✅
```

If all three pass, you're ready to continue development! 🚀

---

**Next Steps**: Continue with Week 1 Day 4-7:
- Risk Analysis Engine
- Frontend Components
- Integration Testing
