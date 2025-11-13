# API Setup Walkthrough - Step by Step

Follow this guide to get all necessary API keys for the Jeonse Safety Checker.

---

## 1️⃣ Data.go.kr (Korean Government Data Portal)

This provides access to MOLIT (국토교통부) real estate transaction data and building register.

### Step-by-Step Instructions

#### A. Create Account
1. Go to **https://www.data.go.kr**
2. Click **회원가입** (Sign Up) in top right
3. Choose **개인회원** (Individual Member)
4. Fill out registration form:
   - Name (이름)
   - Email
   - Password
   - Phone number (needs Korean phone for verification)
   - Agree to terms
5. Verify email
6. **Login** to your account

#### B. Subscribe to MOLIT Apartment Transaction API
1. Once logged in, search for: **"아파트매매 실거래"**
2. Click on: **국토교통부_아파트매매 실거래자료**
3. Click **활용신청** (Request to Use)
4. Fill out the form:
   - **활용목적**: 전세 안전도 분석 서비스 개발 (Jeonse safety analysis service)
   - **활용기간**: Select date range (1 year recommended)
   - **상세기능명세**: 부동산 거래 정보 조회 (Real estate transaction lookup)
5. Click **신청** (Submit)
6. Wait for approval (usually instant or within 1 day)

#### C. Subscribe to Building Register API
1. Search for: **"건축물대장"**
2. Click on: **건축물대장정보 서비스**
3. Click **활용신청** (Request to Use)
4. Fill out similar form as above
5. Click **신청** (Submit)

#### D. Get Your API Key
1. After approval, go to **마이페이지** (My Page)
2. Click **일반 인증키 (Encoding)** on left menu
3. You'll see your API key (looks like: `abc123xyz...`)
4. **Copy this key** - you'll use it for both APIs

#### E. Test Your API Key
```bash
# Test MOLIT API
curl "http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=YOUR_KEY_HERE&pageNo=1&numOfRows=10&LAWD_CD=11440&DEAL_YMD=202401"
```

**Expected Response**: XML data with apartment transactions

**If you get error**:
- `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` → Key not approved yet
- `INVALID_REQUEST_PARAMETER_ERROR` → Parameters wrong (this is OK, key works)

---

## 2️⃣ Supabase (Database & Storage)

Free tier is perfect for development.

### Step-by-Step Instructions

#### A. Create Account
1. Go to **https://supabase.com**
2. Click **Start your project**
3. Sign up with:
   - GitHub (recommended)
   - OR Email

#### B. Create New Project
1. Click **New Project**
2. Choose organization (or create one)
3. Fill in project details:
   - **Name**: `jeonse-safety-checker`
   - **Database Password**: Create strong password (SAVE THIS!)
   - **Region**: Choose closest to Korea (e.g., `ap-northeast-1` - Tokyo)
   - **Pricing Plan**: Free
4. Click **Create new project**
5. Wait 2-3 minutes for setup

#### C. Get Your API Keys
1. Once ready, go to **Settings** (gear icon on left)
2. Click **API** section
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (under "Project API keys")
   - **service_role** secret key (click "Reveal" and copy)

**⚠️ IMPORTANT**: Keep `service_role` key secret! Never commit to git.

#### D. Set Up Database Schema
1. Go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open your local file: `database-schema.sql`
4. Copy entire contents
5. Paste into Supabase SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Should see: "Success. No rows returned"

#### E. Create Storage Bucket
1. Go to **Storage** (left sidebar)
2. Click **Create a new bucket**
3. Fill in:
   - **Name**: `documents`
   - **Public bucket**: OFF (keep private)
4. Click **Create bucket**

#### F. Verify Setup
1. Go to **Table Editor**
2. You should see tables:
   - `properties`
   - `analysis_results`
   - `transaction_cache`
   - `building_register_cache`
   - `uploaded_documents`

---

## 3️⃣ Google Vision API (OCR for PDF parsing)

**Note**: This is optional for initial development. You can skip and add later.

### Step-by-Step Instructions

#### A. Create Google Cloud Account
1. Go to **https://console.cloud.google.com**
2. Sign in with Google account
3. Accept terms and create account
4. **Add billing** (required, but free tier is generous)
   - $300 free credit for new users
   - Vision API: First 1,000 units/month free

#### B. Create New Project
1. Click project dropdown (top left)
2. Click **New Project**
3. Name: `jeonse-safety-checker`
4. Click **Create**

#### C. Enable Vision API
1. Go to **APIs & Services** → **Library**
2. Search for **"Vision API"**
3. Click **Cloud Vision API**
4. Click **Enable**

#### D. Create Service Account
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `jeonse-ocr`
   - **Service account ID**: auto-generated
4. Click **Create and Continue**
5. **Role**: Select `Cloud Vision → Cloud Vision API User`
6. Click **Done**

#### E. Generate JSON Key
1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON**
5. Click **Create**
6. JSON file will download automatically

#### F. Save Credentials
1. Create folder in your project:
   ```bash
   cd jeonse-safety-checker
   mkdir credentials
   ```
2. Move downloaded JSON to:
   ```
   credentials/google-vision.json
   ```
3. Make sure this is in `.gitignore` (it already is)

---

## 4️⃣ Toss Payments (Payment Processing)

**Note**: Optional for initial development. Add when you need payments.

### Step-by-Step Instructions

#### A. Create Account
1. Go to **https://developers.tosspayments.com**
2. Click **시작하기** (Get Started)
3. Sign up with email or social login

#### B. Get Test API Keys
1. After login, go to **개발자센터** (Developer Center)
2. Click **내 개발정보** (My Development Info)
3. You'll see:
   - **테스트 클라이언트 키** (Test Client Key)
   - **테스트 시크릿 키** (Test Secret Key)
4. Copy both keys

#### C. Test Environment
- Test cards: https://docs.tosspayments.com/reference/test-card
- No real money charged in test mode

---

## 5️⃣ Configure Environment Variables

Now let's put all your keys into the project.

### Step-by-Step Instructions

#### A. Create .env.local File
```bash
cd jeonse-safety-checker
cp .env.local.example .env.local
```

#### B. Edit .env.local
Open `.env.local` and fill in your keys:

```env
# ============================================
# SUPABASE (REQUIRED)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# KOREAN GOVERNMENT API (REQUIRED)
# ============================================
MOLIT_API_KEY=your_data_go_kr_api_key_here

# ============================================
# GOOGLE VISION (OPTIONAL - for OCR)
# ============================================
GOOGLE_VISION_API_KEY=
GOOGLE_VISION_CREDENTIALS_PATH=./credentials/google-vision.json

# ============================================
# TOSS PAYMENTS (OPTIONAL - for payments)
# ============================================
TOSS_PAYMENTS_CLIENT_KEY=test_ck_...
TOSS_PAYMENTS_SECRET_KEY=test_sk_...

# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV=development
```

#### C. Verify .env.local is in .gitignore
Check that `.gitignore` includes:
```
.env.local
.env*.local
credentials/
```

---

## ✅ Verification Checklist

Before proceeding, verify you have:

### Required (Must Have)
- [ ] Data.go.kr account created
- [ ] MOLIT API access approved
- [ ] Building Register API access approved
- [ ] Data.go.kr API key copied
- [ ] Supabase project created
- [ ] Supabase URL and keys copied
- [ ] Database schema executed successfully
- [ ] Storage bucket "documents" created
- [ ] `.env.local` file created with above keys

### Optional (Can Add Later)
- [ ] Google Cloud account created
- [ ] Vision API enabled
- [ ] Service account JSON downloaded
- [ ] Toss Payments account created
- [ ] Toss test keys copied

---

## 🚨 Troubleshooting

### Data.go.kr Issues

**Problem**: Can't register without Korean phone number
- **Solution**: You'll need a Korean phone number for verification. Consider:
  - Using a Korean virtual number service
  - Having a Korean friend help with registration
  - Contacting data.go.kr support for international users

**Problem**: API key not working
- **Solution**:
  - Wait 24 hours after approval
  - Check if key is for "일반 인증키 (Encoding)" not "Decoding"
  - Verify you subscribed to the specific API

### Supabase Issues

**Problem**: Can't run database schema
- **Solution**:
  - Make sure project is fully initialized (check dashboard)
  - Run schema sections one at a time
  - Check for error messages in SQL editor

**Problem**: RLS (Row Level Security) blocking access
- **Solution**:
  - Verify policies were created
  - Use `service_role` key for admin operations
  - Check user is authenticated for user-level operations

### Google Vision Issues

**Problem**: "Billing must be enabled"
- **Solution**:
  - Add payment method (won't be charged on free tier)
  - Free tier: 1,000 units/month
  - Each page of OCR ≈ 1 unit

---

## 🎯 Next Steps

Once you have your API keys configured:

1. **Test the setup**:
   ```bash
   npm run dev
   ```

2. **Verify APIs work** (we'll create test scripts next)

3. **Start building the analysis flow**

---

## 📞 Need Help?

- **Data.go.kr**: support@data.go.kr
- **Supabase**: https://supabase.com/support
- **Google Cloud**: https://cloud.google.com/support
- **Toss Payments**: https://developers.tosspayments.com/support

Let me know when you have your keys and we'll test them! 🚀
