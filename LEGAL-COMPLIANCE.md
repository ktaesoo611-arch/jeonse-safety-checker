# Legal Compliance Documentation

## 소액보증금 우선변제 Implementation

### Legal Reference

**Law**: 주택임대차보호법 시행령
**Effective**: 2025. 3. 1.
**Decree**: 대통령령 제35161호, 2024. 12. 31., 일부개정
**Table**: [별표 1] 과밀억제권역 (제10조제1항 관련)

---

## Regional Classification

### 1. 서울특별시
- **Threshold**: ₩165,000,000 (₩1.65억)
- **Protected Amount**: ₩55,000,000 (₩5,500만원)
- **Coverage**: All of Seoul

### 2. 수도권 과밀억제권역 (16 cities)
- **Threshold**: ₩145,000,000 (₩1.45억)
- **Protected Amount**: ₩48,000,000 (₩4,800만원)

**Cities Included**:
1. 서울특별시 (covered above)
2. 인천광역시 (강화군, 옹진군 제외)
3. 의정부시
4. 구리시
5. 남양주시
6. 하남시
7. 고양시
8. 수원시
9. 성남시
10. 안양시
11. 부천시
12. 광명시
13. 과천시
14. 의왕시
15. 군포시
16. 시흥시 [반월특수지역(반월특수지역에서 해제된 지역을 포함한다)은 제외한다]

### 3. 세종·용인·화성·김포
- **Threshold**: ₩145,000,000 (₩1.45억)
- **Protected Amount**: ₩48,000,000 (₩4,800만원)

**Cities Included**:
- 세종특별자치시
- 용인시 (경기도)
- 화성시 (경기도)
- 김포시 (경기도)

### 4. 광역시·경기도 etc
- **Threshold**: ₩85,000,000 (₩8,500만원)
- **Protected Amount**: ₩28,000,000 (₩2,800만원)

**Cities Included**:
- 부산광역시
- 대구광역시
- 대전광역시
- 광주광역시
- 울산광역시
- 안산시 (경기도)
- 광주시 (경기도)
- 파주시 (경기도)
- 이천시 (경기도)
- 평택시 (경기도)
- Other 경기도 cities not listed above

### 5. 기타 지역
- **Threshold**: ₩75,000,000 (₩7,500만원)
- **Protected Amount**: ₩25,000,000 (₩2,500만원)

**Coverage**: All other regions in Korea

---

## Implementation

### Code Location
- **File**: `lib/analyzers/risk-analyzer.ts`
- **Functions**:
  - `determineRegion(address: string)` - Classifies address into region
  - `getSmallAmountThreshold(region: string)` - Returns threshold by region
  - `getProtectedAmount(region: string)` - Returns protected amount by region
  - `checkSmallAmountPriority()` - Main eligibility check

### Verification
- **Test File**: `scripts/verify-thresholds.ts`
- **Test Coverage**: 10 test cases covering all 5 regions
- **Command**: `npm run test:thresholds`
- **Status**: All tests passing ✅

### Test Results

```bash
npm run test:thresholds
```

**Output**:
```
✅ All thresholds verified! 2025 legal values are correctly implemented.

Test Results:
  서울특별시: ₩1.65억 / ₩5,500만원 ✅
  인천광역시 (과밀억제권역): ₩1.45억 / ₩4,800만원 ✅
  의정부시 (과밀억제권역): ₩1.45억 / ₩4,800만원 ✅
  세종특별자치시: ₩1.45억 / ₩4,800만원 ✅
  용인시: ₩1.45억 / ₩4,800만원 ✅
  화성시: ₩1.45억 / ₩4,800만원 ✅
  김포시: ₩1.45억 / ₩4,800만원 ✅
  부산광역시: ₩8,500만원 / ₩2,800만원 ✅
  안산시: ₩8,500만원 / ₩2,800만원 ✅
  순천시 (기타): ₩7,500만원 / ₩2,500만원 ✅
```

---

## Legal Compliance Checklist

- ✅ All regional thresholds match 별표 1 official table
- ✅ All protected amounts match 제10조 legal values
- ✅ Complete 과밀억제권역 classification (16 cities)
- ✅ Proper exclusions implemented (강화군, 옹진군, 반월특수지역)
- ✅ New category added: 세종·용인·화성·김포
- ✅ Effective date: 2025. 3. 1.
- ✅ Decree reference: 대통령령 제35161호, 2024. 12. 31.
- ✅ Comprehensive test coverage
- ✅ All tests passing

---

## Usage Example

```typescript
import { RiskAnalyzer } from './lib/analyzers/risk-analyzer';

const analyzer = new RiskAnalyzer();

// Check 소액보증금 eligibility for ₩1.5억 jeonse in Seoul
const result = analyzer.checkSmallAmountPriority(
  150000000,  // ₩1.5억
  '서울특별시 강남구 역삼동 123-45'
);

console.log(result);
// {
//   isEligible: true,
//   threshold: 165000000,        // ₩1.65억
//   protectedAmount: 55000000,   // ₩5,500만원
//   region: '서울'
// }
```

---

## Update History

**2025-11-11**:
- Initial implementation with approximate values
- Updated to exact 2025 legal values from 별표 1
- Added all 16 cities from 과밀억제권역 official list
- Added new category: 세종·용인·화성·김포
- **CORRECTED**: Both 수도권 과밀억제권역 and 세종·용인·화성·김포 use SAME values (₩1.45억 / ₩4,800만원)
- Corrected all threshold and protected amounts
- Created comprehensive verification test suite
- 100% legal compliance achieved ✅

---

**Maintained by**: Jeonse Safety Checker Team
**Legal Review**: Based on official 주택임대차보호법 시행령
**Last Verified**: 2025-11-11
