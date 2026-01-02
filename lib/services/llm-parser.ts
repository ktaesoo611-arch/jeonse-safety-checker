/**
 * LLM-based parser using Claude Opus 4.5 for 등기부등본 document parsing
 * This parser uses AI to extract structured data from OCR text, handling:
 * - OCR corruption and text merging
 * - 전세권변경 (jeonse amendments)
 * - Complex entry formats
 */

import Anthropic from '@anthropic-ai/sdk';

interface MortgageEntry {
  priority: number;
  type: string;
  maxSecuredAmount: number;
  estimatedPrincipal: number;
  registrationDate: string;
  creditor?: string;
  status: 'active';
}

interface JeonseEntry {
  priority: number;
  amount: number;
  registrationDate: string;
  tenant?: string;
  type: string;
}

interface LienEntry {
  priority: number;
  type: string;
  registrationDate: string;
  claimant?: string;
}

interface OwnershipEntry {
  ownerName: string;
  ownershipPercentage: number;
}

interface ParsedDeunggibuData {
  mortgages: MortgageEntry[];
  jeonseRights: JeonseEntry[];
  liens: LienEntry[];
  ownership?: OwnershipEntry[]; // Optional: extracted from 갑구
  totalMortgageAmount: number;
  totalEstimatedPrincipal: number;
  parsingMethod: 'llm';
  confidence: number;
  buildingYear?: number; // Optional: extracted from 표제부

  // Property info from 표제부
  area?: number; // 전용면적 in ㎡
  buildingNumber?: string; // 동 (e.g., "제1104동")
  unit?: string; // 호 (e.g., "제2602호")

  // Liens & Restrictions flags (for legal score calculation)
  hasSeizure: boolean; // 압류
  hasAuction: boolean; // 경매개시결정
  hasProvisionalSeizure: boolean; // 가압류
  hasSuperficies: boolean; // 지상권
  hasProvisionalRegistration: boolean; // 가등기
  hasProvisionalDisposition: boolean; // 가처분
  hasEasement: boolean; // 지역권
  hasAdvanceNotice: boolean; // 예고등기
  hasUnregisteredLandRights: boolean; // 대지권미등기
}

export class LLMParser {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Parse 등기부등본 OCR text using Claude Opus 4.5
   */
  async parseDeunggibu(ocrText: string): Promise<ParsedDeunggibuData> {
    console.log('🤖 Starting LLM-based parsing with Claude Opus 4.5...');
    console.log(`   OCR text length: ${ocrText.length} characters`);

    const startTime = Date.now();

    try {
      const message = await this.client.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 4000,
        temperature: 0, // Deterministic output for data extraction
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(ocrText),
          },
        ],
      });

      const elapsed = Date.now() - startTime;
      console.log(`✅ LLM parsing completed in ${(elapsed / 1000).toFixed(1)}s`);

      // Extract JSON from response
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Log extraction for debugging
      if (parsed.buildingYear) {
        console.log(`   ✅ Building year extracted: ${parsed.buildingYear}`);
      } else {
        console.log(`   ⚠️  Building year not found in LLM response`);
      }

      if (parsed.area) {
        console.log(`   ✅ Exclusive area extracted: ${parsed.area}㎡`);
      } else {
        console.log(`   ⚠️  Exclusive area not found in LLM response`);
      }

      // Transform to expected format
      const result = this.transformToDeunggibuData(parsed);

      console.log('📊 LLM parsing results:');
      console.log(`   - Mortgages: ${result.mortgages.length}`);
      console.log(`   - Jeonse rights: ${result.jeonseRights.length}`);
      console.log(`   - Liens: ${result.liens.length}`);
      console.log(`   - Area: ${result.area ? `${result.area}㎡` : 'not found'}`);
      console.log(`   - Confidence: ${(result.confidence * 100).toFixed(1)}%`);

      // Log legal restriction flags
      const legalFlags = [];
      if (result.hasSeizure) legalFlags.push('압류');
      if (result.hasAuction) legalFlags.push('경매');
      if (result.hasProvisionalSeizure) legalFlags.push('가압류');
      if (result.hasSuperficies) legalFlags.push('지상권');
      if (result.hasProvisionalRegistration) legalFlags.push('가등기');
      if (result.hasProvisionalDisposition) legalFlags.push('가처분');
      if (result.hasEasement) legalFlags.push('지역권');
      if (result.hasAdvanceNotice) legalFlags.push('예고등기');
      if (result.hasUnregisteredLandRights) legalFlags.push('대지권미등기');

      if (legalFlags.length > 0) {
        console.log(`   ⚠️  Legal restrictions detected: ${legalFlags.join(', ')}`);
      } else {
        console.log(`   ✅ No legal restrictions detected`);
      }

      return result;
    } catch (error) {
      console.error('❌ LLM parsing failed:', error);
      throw error;
    }
  }

  /**
   * Build prompt for Claude to extract structured data
   */
  private buildPrompt(ocrText: string): string {
    // Truncate if too long (keep first 100K chars for context window)
    const text = ocrText.length > 100000 ? ocrText.substring(0, 100000) : ocrText;

    return `You are an expert at parsing Korean real estate documents (등기부등본).

**EXTRACTION METHODOLOGY - FOLLOW THIS PRIORITY:**

PRIORITY 1: Extract from "주요 등기사항 요약 (참고용)" summary section FIRST
  - This section is usually at the END of the document
  - This section lists ONLY ACTIVE entries (cancelled/말소 items are automatically excluded)
  - Look for these subsections within the summary:
    * "1. 소유지분현황 ( 갑구 )" or "1. 소유권에 관한 사항 ( 갑구 )" - Current ownership
    * "2. 소유지분을 제외한 소유권에 관한 사항 (갑구)" - Active liens, seizures, auctions (CRITICAL for legal flags!)
    * "3. (근)저당권 및 전세권 등 ( 을구 )" - Active mortgages, jeonse rights
  - This is the MOST RELIABLE source - prioritize data from here!
  - If section shows "기록사항 없음" (No Records), that means NO active entries exist

PRIORITY 2: If summary section is missing or incomplete, fall back to detailed sections:
  - Section "갑구" or "【갑구】" - detailed ownership section
  - Section "을구" or "【을구】" - detailed mortgage/jeonse section

PRIORITY 3: Extract from "표제부" or "【표제부】" (title section):
  - Building year (건축년도)
  - Exclusive area (전용면적) - CRITICAL for MOLIT API matching

PRIORITY 4: Detect legal restrictions from ALL sections (갑구, 을구, summary):
  - These are boolean flags indicating presence of specific legal issues
  - Check BOTH the summary section AND detailed sections

**CRITICAL**: Do NOT skip ANY entries. Extract ALL ownership, liens, mortgages, and jeonse rights!

**IMPORTANT INSTRUCTIONS:**

1. **소유권 (Ownership)** - CRITICAL for 공동소유 detection:
   - Look in "1. 소유권에 관한 사항 ( 갑구 )" section
   - Find the CURRENT owner(s) - usually the LAST ownership entry unless marked as "말소" (cancelled)
   - Extract: 소유자 (owner name), 지분 (ownership share like "2분의1", "3분의1")
   - If multiple owners exist with different shares → This is 공동소유 (shared ownership)!
   - **EXAMPLE 1 (sole)**: "소유자 홍길동" → single owner
   - **EXAMPLE 2 (shared)**: "소유자 홍길동 지분 2분의1" + "소유자 김철수 지분 2분의1" → 공동소유!

2. **근저당권 (Mortgages)** - HIGHEST PRIORITY:
   - Look for EVERY "근저당권설정" entry in the document
   - Extract: 순위번호 (priority), 접수일자/등록일 (date), 채권최고액 (max secured amount), 근저당권자 (creditor)
   - Date format: YYYY년MM월DD일 or YYYY-MM-DD or YYYY년M월D일
   - Amount format: Look for "금", "채권최고액", or numbers followed by "원"
   - **EXAMPLE**: "순위번호 19 | 근저당권설정 | 2021년3월28일 | 채권최고액 금393,900,000원 | 근저당권자 농협은행주식회사"

3. **전세권 및 주택임차권 (Jeonse Rights and Housing Lease Rights)**:
   - Look for THREE types: "전세권설정", "전세권변경", AND "주택임차권" (court-ordered lease registration)
   - For 전세권변경 (amendments): Use the LATEST amount for that priority number
   - For 주택임차권: Extract from 을구, registered via 임차권등기명령 (court order)
   - Extract: 순위번호 (priority), 접수일자 (date), 전세금/임차보증금 (amount), 전세권자/임차권자 (tenant)
   - If priority has both 설정 and 변경, use the 변경 amount (most recent)
   - **IMPORTANT**: 주택임차권 is as important as 전세권 - both are existing jeonse debts

4. **가압류/가처분/경매 (Liens)** - CRITICAL legal issues:
   - Look for "가압류" (provisional seizure), "가처분" (provisional disposition), "경매개시결정" (auction notice)
   - **CRITICAL**: Do NOT skip 가처분 - it is as dangerous as 가압류!
   - These can appear in 갑구 OR 을구 sections
   - Extract: 순위번호 (priority), type (EXACT Korean term: "가압류", "가처분", "경매개시결정"), 접수일자 (date), 채권자/신청인 (claimant)
   - **EXAMPLE**: "순위번호 5 | 가처분 | 2023년5월10일 | 신청인 박민수"

5. **건축년도 (Building Year)** - CRITICAL for scoring:
   - Look in "표제부" or "【표제부】" section
   - Find "신축년월일" or "사용승인일" (construction/approval date)
   - Extract 4-digit year (e.g., "2021년", "2021-", "2021.")
   - **EXAMPLE**: "신축년월일 2021년03월15일" → buildingYear: 2021

6. **전용면적 (Exclusive Area) & 동/호 (Building/Unit)** - CRITICAL for MOLIT API:
   - **IMPORTANT**: There are TWO different 표제부 sections - use the CORRECT one!
     * "( 1동의 건물의 표시 )" = WRONG - this shows total floor areas per floor (300-500㎡), NOT individual unit area
     * "( 전유부분의 건물의 표시 )" = CORRECT - this shows YOUR UNIT's exclusive area (typically 30-150㎡)
   - Look ONLY in "전유부분의 건물의 표시" section for the exclusive area
   - The exclusive area will be on a line with "제XX층 제XXX호" (floor and unit number)
   - Find area in ㎡ or m² format - it should be between 30-200㎡ for individual apartments
   - Find building number (동): "제XXX동" format in the header (e.g., "제1104동")
   - Find unit number (호): "제XXX호" format (e.g., "제2602호", "제804호")
   - **EXAMPLE**: "제26층 제2602호 철근콘크리트구조 59.9969㎡" → unit: "제2602호", area: 59.9969
   - **DO NOT** use the floor areas from "1동의 건물의 표시" section (like 446.8957㎡) - those are building totals!

7. **Legal Restrictions (Boolean Flags)** - CRITICAL for risk scoring:
   **IMPORTANT**: Use ONLY the "주요 등기사항 요약 (참고용)" summary section to detect these!
   - The summary section lists ONLY ACTIVE entries (cancelled/말소 items are automatically excluded)
   - Do NOT look at the detailed 갑구/을구 sections for these flags - they contain historical cancelled entries
   - If an item appears in the summary section, set the flag to true
   - If an item does NOT appear in the summary section, set the flag to false

   Flags to detect from summary section:
   - **hasSeizure (압류)**: Court seizure - look for "압류" but NOT "가압류" in section 2
   - **hasAuction (경매개시결정)**: Foreclosure auction - look for "경매개시결정" or "임의경매개시결정" in section 2
   - **hasProvisionalSeizure (가압류)**: Provisional seizure - look for "가압류" in section 2
   - **hasSuperficies (지상권)**: Surface rights - look for "지상권" in section 3
   - **hasProvisionalRegistration (가등기)**: Provisional registration - look for "가등기" in section 2
   - **hasProvisionalDisposition (가처분)**: Provisional disposition - look for "가처분" in section 2
   - **hasEasement (지역권)**: Easement rights - look for "지역권" in section 3
   - **hasAdvanceNotice (예고등기)**: Advance notice - look for "예고등기" in section 2
   - **hasUnregisteredLandRights (대지권미등기)**: Unregistered land rights - look for "대지권미등기" in 표제부 or summary

8. **Handle OCR corruption**:
   - Entries may be merged on same line (e.g., "8 전세권변경 25 근저당권설정 2022년2월9일")
   - Use delimiters like "|" or "제XXX호" to separate fields
   - If date appears multiple times, match it to the closest entry type

**PARSE CAREFULLY**: Even if section 3 shows only a table with ONE mortgage entry, extract that mortgage! Do not return empty arrays if entries exist.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:

{
  "buildingYear": 2021,
  "area": 84.98,
  "buildingNumber": "제1104동",
  "unit": "제2602호",
  "ownership": [
    {
      "ownerName": "홍길동",
      "ownershipPercentage": 50,
      "confidence": 0.95
    },
    {
      "ownerName": "김철수",
      "ownershipPercentage": 50,
      "confidence": 0.95
    }
  ],
  "mortgages": [
    {
      "priority": 19,
      "registrationDate": "2021-03-28",
      "maxSecuredAmount": 393900000,
      "creditor": "농협은행주식회사",
      "confidence": 0.95
    }
  ],
  "jeonseRights": [
    {
      "priority": 8,
      "registrationDate": "2022-01-27",
      "amount": 3200000000,
      "tenant": "홍길동",
      "isAmendment": true,
      "confidence": 0.90
    },
    {
      "priority": 1,
      "registrationDate": "2023-11-21",
      "amount": 225000000,
      "tenant": "김동운",
      "type": "주택임차권",
      "confidence": 0.95
    }
  ],
  "liens": [
    {
      "priority": 1,
      "type": "가압류",
      "registrationDate": "2021-05-15",
      "claimant": "김철수",
      "confidence": 0.85
    },
    {
      "priority": 2,
      "type": "가처분",
      "registrationDate": "2022-03-20",
      "claimant": "박민수",
      "confidence": 0.90
    }
  ],
  "hasSeizure": false,
  "hasAuction": false,
  "hasProvisionalSeizure": true,
  "hasSuperficies": false,
  "hasProvisionalRegistration": false,
  "hasProvisionalDisposition": true,
  "hasEasement": false,
  "hasAdvanceNotice": false,
  "hasUnregisteredLandRights": false
}

**OCR Text to parse:**

${text}`;
  }

  /**
   * Transform LLM response to DeunggibuData format
   */
  private transformToDeunggibuData(parsed: any): ParsedDeunggibuData {
    // Extract building year (optional, may not be found in OCR)
    const buildingYear = parsed.buildingYear ? parseInt(parsed.buildingYear.toString(), 10) : undefined;

    // Extract area (전용면적) - CRITICAL for MOLIT API
    const area = parsed.area ? parseFloat(parsed.area.toString()) : undefined;

    // Extract building number and unit (동/호)
    const buildingNumber = parsed.buildingNumber || undefined;
    const unit = parsed.unit || undefined;

    // Transform mortgages
    const mortgages: MortgageEntry[] = (parsed.mortgages || []).map((m: any) => ({
      priority: m.priority,
      type: '근저당권',
      maxSecuredAmount: m.maxSecuredAmount,
      estimatedPrincipal: Math.floor(m.maxSecuredAmount / 1.2), // Estimate at ~83% of max
      registrationDate: m.registrationDate,
      creditor: m.creditor || '채권자 미상',
      status: 'active' as const,
    }));

    // Transform jeonse rights
    const jeonseRights: JeonseEntry[] = (parsed.jeonseRights || []).map((j: any) => ({
      priority: j.priority,
      amount: j.amount,
      registrationDate: j.registrationDate,
      tenant: j.tenant || '전세권자 미상',
      type: j.isAmendment ? '전세권변경' : '전세권',
    }));

    // Transform liens
    const liens: LienEntry[] = (parsed.liens || []).map((l: any) => ({
      priority: l.priority,
      type: l.type || '가압류',
      registrationDate: l.registrationDate,
      claimant: l.claimant || '채권자 미상',
    }));

    // Transform ownership (optional, for 공동소유 detection)
    const ownership = parsed.ownership && Array.isArray(parsed.ownership)
      ? parsed.ownership.map((o: any) => ({
          ownerName: o.ownerName,
          ownershipPercentage: o.ownershipPercentage || 100,
        }))
      : undefined;

    // Calculate totals
    const totalMortgageAmount = mortgages.reduce((sum, m) => sum + m.maxSecuredAmount, 0);
    const totalEstimatedPrincipal = mortgages.reduce((sum, m) => sum + m.estimatedPrincipal, 0);

    // Calculate overall confidence (average of all entry confidences)
    const allConfidences = [
      ...(parsed.mortgages || []).map((m: any) => m.confidence || 0.9),
      ...(parsed.jeonseRights || []).map((j: any) => j.confidence || 0.9),
      ...(parsed.liens || []).map((l: any) => l.confidence || 0.9),
    ];
    const confidence = allConfidences.length > 0
      ? allConfidences.reduce((sum, c) => sum + c, 0) / allConfidences.length
      : 0.95;

    // Extract legal restriction flags (default to false if not present)
    const hasSeizure = parsed.hasSeizure === true;
    const hasAuction = parsed.hasAuction === true;
    const hasProvisionalSeizure = parsed.hasProvisionalSeizure === true;
    const hasSuperficies = parsed.hasSuperficies === true;
    const hasProvisionalRegistration = parsed.hasProvisionalRegistration === true;
    const hasProvisionalDisposition = parsed.hasProvisionalDisposition === true;
    const hasEasement = parsed.hasEasement === true;
    const hasAdvanceNotice = parsed.hasAdvanceNotice === true;
    const hasUnregisteredLandRights = parsed.hasUnregisteredLandRights === true;

    return {
      mortgages,
      jeonseRights,
      liens,
      ownership, // Optional: extracted from 갑구 section for 공동소유 detection
      totalMortgageAmount,
      totalEstimatedPrincipal,
      parsingMethod: 'llm',
      confidence,
      buildingYear, // Optional: extracted from 표제부 section
      area, // 전용면적 from 표제부 section
      buildingNumber, // 동 from 표제부 section
      unit, // 호 from 표제부 section

      // Legal restriction flags
      hasSeizure,
      hasAuction,
      hasProvisionalSeizure,
      hasSuperficies,
      hasProvisionalRegistration,
      hasProvisionalDisposition,
      hasEasement,
      hasAdvanceNotice,
      hasUnregisteredLandRights,
    };
  }
}
