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

interface ParsedDeunggibuData {
  mortgages: MortgageEntry[];
  jeonseRights: JeonseEntry[];
  liens: LienEntry[];
  totalMortgageAmount: number;
  totalEstimatedPrincipal: number;
  parsingMethod: 'llm';
  confidence: number;
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

      // Transform to expected format
      const result = this.transformToDeunggibuData(parsed);

      console.log('📊 LLM parsing results:');
      console.log(`   - Mortgages: ${result.mortgages.length}`);
      console.log(`   - Jeonse rights: ${result.jeonseRights.length}`);
      console.log(`   - Liens: ${result.liens.length}`);
      console.log(`   - Confidence: ${(result.confidence * 100).toFixed(1)}%`);

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

Extract ALL debt-related entries from the OCR text. This includes entries from:
- Section "3. (근)저당권 및 전세권 등 ( 을구 )" - mortgage and jeonse summary
- Any sections mentioning "근저당권설정", "전세권설정", "주택임차권"

**CRITICAL**: Do NOT skip ANY entries. Even if there's only ONE mortgage, extract it!

**IMPORTANT INSTRUCTIONS:**

1. **근저당권 (Mortgages)** - HIGHEST PRIORITY:
   - Look for EVERY "근저당권설정" entry in the document
   - Extract: 순위번호 (priority), 접수일자/등록일 (date), 채권최고액 (max secured amount), 근저당권자 (creditor)
   - Date format: YYYY년MM월DD일 or YYYY-MM-DD or YYYY년M월D일
   - Amount format: Look for "금", "채권최고액", or numbers followed by "원"
   - **EXAMPLE**: "순위번호 19 | 근저당권설정 | 2021년3월28일 | 채권최고액 금393,900,000원 | 근저당권자 농협은행주식회사"

2. **전세권 및 주택임차권 (Jeonse Rights and Housing Lease Rights)**:
   - Look for THREE types: "전세권설정", "전세권변경", AND "주택임차권" (court-ordered lease registration)
   - For 전세권변경 (amendments): Use the LATEST amount for that priority number
   - For 주택임차권: Extract from 을구, registered via 임차권등기명령 (court order)
   - Extract: 순위번호 (priority), 접수일자 (date), 전세금/임차보증금 (amount), 전세권자/임차권자 (tenant)
   - If priority has both 설정 and 변경, use the 변경 amount (most recent)
   - **IMPORTANT**: 주택임차권 is as important as 전세권 - both are existing jeonse debts

3. **가압류/가처분 (Liens)**:
   - Look for "가압류", "가처분" entries
   - Extract: 순위번호 (priority), type, 접수일자 (date), 채권자/신청인 (claimant)

4. **Handle OCR corruption**:
   - Entries may be merged on same line (e.g., "8 전세권변경 25 근저당권설정 2022년2월9일")
   - Use delimiters like "|" or "제XXX호" to separate fields
   - If date appears multiple times, match it to the closest entry type

**PARSE CAREFULLY**: Even if section 3 shows only a table with ONE mortgage entry, extract that mortgage! Do not return empty arrays if mortgages exist.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:

{
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
    }
  ]
}

**OCR Text to parse:**

${text}`;
  }

  /**
   * Transform LLM response to DeunggibuData format
   */
  private transformToDeunggibuData(parsed: any): ParsedDeunggibuData {
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

    return {
      mortgages,
      jeonseRights,
      liens,
      totalMortgageAmount,
      totalEstimatedPrincipal,
      parsingMethod: 'llm',
      confidence,
    };
  }
}
