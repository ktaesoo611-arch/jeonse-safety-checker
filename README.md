# Jeonse Safety Checker (전세 안전도 검사)

AI-powered comprehensive jeonse deposit safety analysis for Korean rental properties.

---

## 🚨 **CURRENT STATUS: MOLIT API Activation Pending**

**Last Updated**: 2025-11-11

The backend is **95% complete**, but the MOLIT API is still returning 403 Forbidden errors after many hours since 활용신청 approval.

### 📖 **START HERE:**
- 👉 **[WHAT-TO-DO-NOW.md](WHAT-TO-DO-NOW.md)** - Quick 5-step troubleshooting guide
- 📊 **[API-ACTIVATION-STATUS.md](API-ACTIVATION-STATUS.md)** - Detailed activation report
- 🎯 **[NEXT-STEPS.md](NEXT-STEPS.md)** - Complete roadmap and next tasks

### Quick Status Check
```bash
npm run check-env       # ✅ All environment variables configured
npm run test:supabase   # ✅ Database working perfectly
npm run test:parser     # ✅ Document parser working
npm run test:molit      # ❌ Still 403 Forbidden (waiting for activation)
```

---

## Project Status: Week 1 Days 1-3 Complete (95%)

### ✅ Completed
- ✅ **Next.js 14** project with TypeScript, Tailwind CSS, App Router
- ✅ **Supabase database** - 5 tables, indexes, RLS policies, storage
- ✅ **MOLIT API client** - Transaction fetching and parsing (ready, waiting for activation)
- ✅ **Building Register API client** - Violation checking
- ✅ **Property valuation calculator** - Time-weighted analysis, Korean floor adjustments
- ✅ **등기부등본 parser** - 13+ risk types, mortgage calculation (÷ 1.2)
- ✅ **Google Vision API** - Service account and credentials configured
- ✅ **Complete test suite** - 5 test scripts covering all components
- ✅ **Comprehensive documentation** - 7+ detailed guides

### ⏳ Blocked (Waiting for MOLIT API)
- ⏳ **MOLIT API activation** - 활용신청 approved (자동승인) but still 403 Forbidden

### 🔜 Next (Week 1 Days 4-7)
- 📋 **Risk analysis engine** - LTV, 소액보증금, safety scoring
- 🎨 **Frontend UI components** - Search, upload, analysis, reports
- 🔗 **Integration testing** - End-to-end flow verification

## Features

### Data Analysis
- **Property Valuation**: Real-time market value estimation using government transaction data
- **등기부등본 Analysis**: Comprehensive parsing of property registration documents
- **Building Violations Check**: Automated검 of 건축물대장 for violations
- **13+ Risk Types Detection**:
  - 근저당권 (Mortgages)
  - 가압류/압류 (Liens and Seizures)
  - 경매개시결정 (Auction proceedings)
  - 전세권 (Jeonse rights)
  - 가등기 (Provisional registration)
  - 가처분 (Provisional disposition)
  - And more...

### Technology Stack
- **Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **APIs**:
  - 국토교통부 (MOLIT) Real Estate Transaction API
  - 건축물대장 (Building Register) API
  - Google Vision API (OCR)
- **Payment**: Toss Payments
- **Analysis**: Custom AI-powered risk scoring

## Setup

### Prerequisites
1. Node.js 18+ installed
2. Supabase account
3. Korean government API key from [data.go.kr](https://data.go.kr)
4. Google Cloud account with Vision API enabled
5. Toss Payments account

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your API keys
# Then run development server
npm run dev
```

### Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Korean Gov APIs
MOLIT_API_KEY=your_molit_key

# Google Vision
GOOGLE_VISION_API_KEY=your_google_key
GOOGLE_VISION_CREDENTIALS_PATH=./credentials/google-vision.json

# Toss Payments
TOSS_PAYMENTS_CLIENT_KEY=your_toss_client_key
TOSS_PAYMENTS_SECRET_KEY=your_toss_secret_key
```

### Database Setup

Run the SQL schema from your plan's Day 1.4 in your Supabase SQL editor.

## Project Structure

```
jeonse-safety-checker/
├── app/
│   ├── api/              # API routes
│   ├── analyze/          # Analysis page
│   ├── layout.tsx
│   ├── page.tsx          # Landing page
│   └── globals.css
├── lib/
│   ├── apis/
│   │   ├── molit.ts              # MOLIT API integration
│   │   └── building-register.ts  # Building register API
│   ├── analyzers/
│   │   ├── property-valuation.ts # Property valuation engine
│   │   └── deunggibu-parser.ts   # Document parser
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── supabase.ts               # Supabase client
├── components/           # React components (TBD)
└── public/              # Static assets
```

## API Documentation

### MOLIT API (국토교통부)
- Endpoint: `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev`
- Provides: Real apartment transaction prices
- Rate limit: 1000 calls/day (free tier)

### Building Register API (건축물대장)
- Endpoint: `http://apis.data.go.kr/1613000/BldRgstService_v2`
- Provides: Building violations, unauthorized construction
- Rate limit: Shared with MOLIT API

## Development Roadmap

### Week 1 (Current)
- Core data fetching and analysis engine
- Property valuation
- Document parsing

### Week 2
- Risk analysis engine
- Frontend components
- Payment integration
- Report generation

### Week 3
- Testing and refinement
- Deploy to production
- User testing

## Contributing

This is a personal project currently in active development. Issues and suggestions welcome!

## License

ISC

## Notes

### Corrected Calculations
- **Mortgage Amount**: 채권최고액 (max secured amount) ÷ 1.2 = estimated principal
- **Small Amount Priority**: ₩5.5M cap for Seoul (2025)
- **Floor Adjustments**: Korean-specific floor premium/discount logic

### Data Sources
- Primary: 국토교통부 실거래가 (Government transaction data)
- Secondary (Future): KB부동산, 호갱노노 (Market valuations)
- Building Data: 건축물대장 (Official building register)

---

Built with ❤️ for safer jeonse rentals in Korea
