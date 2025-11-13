# Jeonse Safety Checker - Setup Guide

## Current Status

✅ **Core Backend Complete (Week 1 - Day 1-3)**

The following components are now built and ready:

### Completed Components

1. **Next.js Project Structure**
   - TypeScript configuration
   - Tailwind CSS setup
   - App directory structure
   - Landing page at `http://localhost:3001`

2. **API Integrations**
   - `lib/apis/molit.ts` - 국토교통부 real transaction data
   - `lib/apis/building-register.ts` - 건축물대장 violations check

3. **Analysis Engine**
   - `lib/analyzers/property-valuation.ts` - Property value calculator
   - `lib/analyzers/deunggibu-parser.ts` - Document parser with 13+ risk types

4. **Type System**
   - Complete TypeScript interfaces in `lib/types/index.ts`
   - Supabase client configuration

5. **Database Schema**
   - SQL schema ready in `database-schema.sql`
   - Tables: properties, analysis_results, transaction_cache, building_register_cache, uploaded_documents
   - RLS policies configured

## Next Steps to Get Running

### 1. Get API Keys

#### Korean Government API (Required)
1. Go to [https://data.go.kr](https://data.go.kr)
2. Create account (free)
3. Subscribe to these APIs:
   - 국토교통부_아파트매매 실거래자료 (MOLIT Apartment Transactions)
   - 건축물대장정보 서비스 (Building Register Service)
4. Copy your API key

#### Supabase (Required)
1. Go to [https://supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
5. Go to SQL Editor
6. Paste and run contents of `database-schema.sql`
7. Go to Storage → Create bucket named "documents"

#### Google Vision API (Optional for now)
1. Go to Google Cloud Console
2. Create project
3. Enable Vision API
4. Create service account
5. Download JSON credentials
6. Save to `credentials/google-vision.json`

#### Toss Payments (Optional for now)
1. Go to [https://developers.tosspayments.com](https://developers.tosspayments.com)
2. Create account
3. Get test API keys

### 2. Configure Environment

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Korean Gov API (REQUIRED)
MOLIT_API_KEY=your_key_from_data_go_kr

# Google Vision (Optional - for OCR)
GOOGLE_VISION_API_KEY=
GOOGLE_VISION_CREDENTIALS_PATH=

# Toss Payments (Optional - for payments)
TOSS_PAYMENTS_CLIENT_KEY=
TOSS_PAYMENTS_SECRET_KEY=
```

### 3. Run the Development Server

```bash
npm run dev
```

Visit: `http://localhost:3001`

## Testing the APIs

### Test Property Valuation

Create a test file `test-valuation.ts`:

```typescript
import { PropertyValuationEngine } from './lib/analyzers/property-valuation';

const engine = new PropertyValuationEngine(process.env.MOLIT_API_KEY!);

const testProperty = {
  address: '서울특별시 마포구 서교동 123-45',
  city: '서울',
  district: '마포구',
  dong: '서교동',
  buildingName: '마포자이아파트', // Use real apartment name
  buildingNumber: '123-45',
  floor: 5,
  unit: '501',
  exclusiveArea: 84.5
};

engine.calculatePropertyValue(testProperty)
  .then(result => {
    console.log('Valuation Result:', result);
    console.log(`Value: ₩${result.valueMid.toLocaleString()}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Recent Sales: ${result.recentSales.length}`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

Run with:
```bash
npx tsx test-valuation.ts
```

### Test 등기부등본 Parser

Create `test-parser.ts`:

```typescript
import { DeunggibuParser } from './lib/analyzers/deunggibu-parser';

const parser = new DeunggibuParser();

const sampleText = `
소재지: 서울특별시 마포구 서교동 123-45
건물명칭: 마포자이아파트
전유면적: 84.5㎡

[갑구] 소유권에 관한 사항
순위번호: 제1호
소유자: 홍길동
접수: 2023년 1월 15일
원인: 매매

[을구] 소유권 이외의 권리에 관한 사항
순위번호: 제1호
근저당권설정
권리자: 국민은행
채권최고액: 금 200,000,000원
접수: 2023년 1월 20일
`;

const result = parser.parse(sampleText);
console.log('Parsed Result:', JSON.stringify(result, null, 2));
```

Run with:
```bash
npx tsx test-parser.ts
```

## Development Roadmap

### Week 1 Remaining Tasks
- [ ] Build risk analysis engine
- [ ] Create frontend analysis form
- [ ] Test with real Seoul apartments

### Week 2 Tasks
- [ ] Build document upload UI
- [ ] Integrate OCR for PDF parsing
- [ ] Create comprehensive report display
- [ ] Payment integration
- [ ] PDF report generation

### Week 3 Tasks
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Deploy to production

## Architecture Overview

```
User Request
    ↓
Property Search Form (Frontend)
    ↓
Property Valuation API
    ↓
MOLIT API → Calculate Value → Cache in DB
    ↓
Document Upload
    ↓
OCR (Google Vision) → Extract Text
    ↓
Deunggibu Parser → Extract 13+ Risk Types
    ↓
Building Register API → Check Violations
    ↓
Risk Analysis Engine → Calculate Safety Score
    ↓
Generate Report → Display to User
    ↓
Payment (Toss) → Download PDF
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page |
| `lib/apis/molit.ts` | MOLIT API integration |
| `lib/apis/building-register.ts` | Building register API |
| `lib/analyzers/property-valuation.ts` | Property valuation logic |
| `lib/analyzers/deunggibu-parser.ts` | Document parsing logic |
| `lib/types/index.ts` | TypeScript types |
| `lib/supabase.ts` | Supabase client |
| `database-schema.sql` | Database schema |

## Troubleshooting

### "No district code found"
- Check that `city` and `district` match exactly with codes in `getDistrictCode()`
- Add more district codes to the mapping if needed

### "No recent transaction data found"
- Verify MOLIT API key is valid
- Check that building name matches exactly (case-sensitive)
- Try different time range (increase `monthsBack`)

### Supabase connection errors
- Verify URL and keys in `.env.local`
- Check that database schema has been run
- Verify RLS policies are set up correctly

## Support

For issues or questions:
1. Check the main README.md
2. Review the Week 1 implementation plan
3. Open an issue on GitHub

---

**Current Server**: Running on http://localhost:3001
**Next Task**: Set up your API keys and test the property valuation engine!
