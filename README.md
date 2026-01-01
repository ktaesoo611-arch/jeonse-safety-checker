# K-Rent Safety (전세안전연구소)

AI-powered rental safety analysis for foreigners in Korea. Protect your deposit and verify fair rent prices with comprehensive English-language reports.

**Live Site:** [krent-safety.vercel.app](https://krent-safety.vercel.app)

---

## Overview

K-Rent Safety helps foreigners navigate the Korean rental market by analyzing property registers (등기부등본), detecting risks, and comparing prices against real market data. All reports are delivered in English within minutes.

### Services

| Service | Description | Price |
|---------|-------------|-------|
| **Jeonse Check** | Deposit safety + market price analysis for jeonse (전세) rentals | FREE (Beta) |
| **Wolse Check** | Deposit safety + rent price analysis for wolse (월세) rentals | FREE (Beta) |

### Coverage

- **Seoul**: All 25 districts (구)
- **Gyeonggi Province**: 31 cities/districts
- **Total**: 10,800+ apartments in database

---

## Features

### Risk Analysis (20+ Factors)
- **Mortgage Detection**: 근저당권 with estimated principal (채권최고액 ÷ 1.2)
- **Legal Issues**: 가압류, 압류, 경매, 가처분, 가등기
- **Existing Jeonse Rights**: 전세권 analysis
- **LTV Calculation**: Loan-to-value ratio assessment
- **소액보증금 Eligibility**: Priority repayment qualification check

### Market Analysis
- **Expected Price**: Theil-Sen regression on 12 months of MOLIT data
- **Price Trend**: Rising/stable/declining with percentage
- **Transaction Scatter Plot**: Visual comparison with market
- **Potential Savings**: Calculated if overpaying

### Document Processing
- **OCR**: Google Document AI for Korean document extraction
- **LLM Parsing**: Claude-powered intelligent data extraction
- **English Translation**: Full translation of 등기부등본 contents

### Reports
- **Safety Score**: 0-100 rating based on comprehensive analysis
- **Risk Breakdown**: Detailed explanation of each risk factor
- **Recommendations**: Mandatory, recommended, and optional action items
- **Debt Ranking**: Priority order of all claims on property
- **PDF Download**: Professional report for your records

---

## Technology Stack

### Frontend
- Next.js 14 (App Router)
- React 19
- TypeScript
- Tailwind CSS

### Backend
- Next.js API Routes
- Supabase (PostgreSQL + Auth + Storage)

### AI/ML
- Google Document AI (OCR)
- Claude API (LLM parsing)
- Theil-Sen Regression (price analysis)

### External APIs
- **MOLIT API** (국토교통부): Real estate transaction data
- **Building Register API** (건축물대장): Building violation checks

### Payments
- Toss Payments (Korean payment gateway)

---

## Project Structure

```
jeonse-safety-checker/
├── app/
│   ├── api/
│   │   ├── analysis/         # Analysis endpoints
│   │   ├── apartments/       # Apartment search
│   │   ├── documents/        # Document parsing
│   │   └── wolse/           # Wolse analysis
│   ├── analyze/
│   │   └── [type]/          # Jeonse/Wolse flow
│   │       └── [id]/
│   │           ├── page.tsx       # Property input
│   │           ├── upload/        # Document upload
│   │           ├── processing/    # Analysis progress
│   │           └── report/        # Results display
│   ├── auth/                # Login/signup
│   ├── dashboard/           # User dashboard
│   ├── check/              # Service selection
│   ├── pricing/            # Pricing page
│   ├── terms/              # Terms of service
│   └── page.tsx            # Landing page
├── components/
│   ├── report/             # Report components
│   ├── wolse/              # Wolse-specific components
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── analyzers/
│   │   ├── deunggibu-parser.ts      # Document parser
│   │   ├── property-valuation.ts    # Price analysis
│   │   ├── risk-analyzer.ts         # Risk scoring
│   │   ├── jeonse-price-analyzer.ts # Jeonse market analysis
│   │   └── wolse-price-analyzer.ts  # Wolse market analysis
│   ├── apis/
│   │   └── molit.ts                 # MOLIT API client
│   ├── data/
│   │   ├── address-data.ts          # Districts & neighborhoods
│   │   └── apartment-database.json  # 10,800+ apartments
│   ├── services/
│   │   ├── ocr-service.ts           # Google Document AI
│   │   └── llm-parser.ts            # Claude integration
│   └── types/
│       └── index.ts                 # TypeScript definitions
└── scripts/                 # Utility scripts
```

---

## Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Google Cloud account (Document AI)
- Anthropic API key (Claude)
- MOLIT API key from [data.go.kr](https://data.go.kr)

### Installation

```bash
# Clone repository
git clone https://github.com/ktaesoo611-arch/k-rent-safety.git
cd k-rent-safety

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Configure environment variables (see below)

# Run development server
npm run dev
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Korean Government APIs
MOLIT_API_KEY=your_molit_api_key

# Google Document AI
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-vision.json

# Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_key

# Toss Payments
TOSS_PAYMENTS_CLIENT_KEY=your_client_key
TOSS_PAYMENTS_SECRET_KEY=your_secret_key
```

---

## Key Calculations

### Mortgage Principal Estimation
```
Estimated Principal = 채권최고액 (Max Secured Amount) ÷ 1.2
```

### LTV (Loan-to-Value)
```
LTV = (Total Debt + Proposed Deposit) / Property Value
```

### 소액보증금 Thresholds (2025)
| Region | Threshold | Protected Amount |
|--------|-----------|------------------|
| Seoul | ≤ ₩1.65억 | ₩5,500만 |
| 수도권 (Gyeonggi) | ≤ ₩1.45억 | ₩4,800만 |

### Price Trend Analysis
- Uses Theil-Sen regression (robust to outliers)
- 12 months of MOLIT transaction data
- Area tolerance: ±5㎡ from target

---

## Scripts

```bash
# Development
npm run dev           # Start development server
npm run build         # Production build
npm run lint          # Run ESLint

# Type checking
npx tsc --noEmit      # Check TypeScript errors
```

---

## API Endpoints

### Analysis
- `POST /api/analysis/create` - Create new analysis
- `GET /api/analysis/report/[id]` - Get analysis report
- `GET /api/analysis/status/[id]` - Check analysis progress

### Apartments
- `GET /api/apartments?q=search&district=강남구` - Search apartments

### Documents
- `POST /api/documents/upload` - Upload document
- `POST /api/documents/parse` - Parse uploaded document

### Wolse
- `POST /api/wolse/analyze` - Analyze wolse rental

---

## Data Sources

| Source | Data Provided |
|--------|---------------|
| MOLIT (국토교통부) | Real apartment transaction prices |
| Building Register API | Building violations, construction info |
| Google Document AI | OCR text extraction from PDFs |
| Claude API | Intelligent parsing of Korean legal documents |

---

## Contributing

Issues and suggestions welcome! Please open an issue on GitHub.

## License

ISC

---

## Contact

- **Company**: 전세안전연구소 (Jeonse Safety Institute)
- **Representative**: 김태수 (Kim Tae-soo)
- **Email**: ktaesoo611@gmail.com
- **Phone**: 010-2382-8432

---

Built with care for safer rentals in Korea
