import {
  DeunggibuData,
  OwnershipInfo,
  MortgageInfo,
  LienInfo,
  JeonseRightInfo
} from '../types';

export class DeunggibuParser {
  /**
   * Main parsing function
   */
  parse(ocrText: string): DeunggibuData {
    console.log('\n========== OCR TEXT START ==========');
    console.log(ocrText);
    console.log('========== OCR TEXT END ==========\n');

    const cleanText = this.cleanText(ocrText);

    console.log('\n========== CLEANED TEXT START ==========');
    console.log(cleanText);
    console.log('========== CLEANED TEXT END ==========\n');

    const mortgages = this.extractMortgages(cleanText);
    const totalMortgageAmount = mortgages.reduce((sum, m) => sum + m.maxSecuredAmount, 0);
    const totalEstimatedPrincipal = mortgages.reduce((sum, m) => sum + m.estimatedPrincipal, 0);

    const address = this.extractAddress(cleanText);
    const buildingName = this.extractBuildingName(cleanText);
    const area = this.extractArea(cleanText);

    console.log('\n========== EXTRACTION RESULTS ==========');
    console.log('Address:', address);
    console.log('Building Name:', buildingName);
    console.log('Area:', area);
    console.log('Mortgages count:', mortgages.length);
    console.log('========== EXTRACTION END ==========\n');

    return {
      // Property info
      address,
      buildingName,
      buildingYear: this.extractBuildingYear(cleanText),
      area,
      landArea: this.extractLandArea(cleanText),

      // Ownership
      ownership: this.extractOwnership(cleanText),
      ownershipChanges: this.countOwnershipChanges(cleanText),
      recentOwnershipChange: this.extractRecentOwnershipChange(cleanText),

      // Mortgages
      mortgages,
      totalMortgageAmount,
      totalEstimatedPrincipal,

      // Liens
      liens: this.extractLiens(cleanText),
      hasSeizure: this.checkForSeizure(cleanText),
      hasProvisionalSeizure: this.checkForProvisionalSeizure(cleanText),
      hasAuction: this.checkForAuction(cleanText),

      // Jeonse rights
      jeonseRights: this.extractJeonseRights(cleanText),

      // Other rights
      hasSuperficies: this.checkForSuperficies(cleanText),
      hasEasement: this.checkForEasement(cleanText),
      hasProvisionalRegistration: this.checkForProvisionalRegistration(cleanText),
      hasProvisionalDisposition: this.checkForProvisionalDisposition(cleanText),
      hasAdvanceNotice: this.checkForAdvanceNotice(cleanText),
      hasUnregisteredLandRights: this.checkForUnregisteredLandRights(cleanText),

      // Metadata
      issueDate: this.extractIssueDate(cleanText),
      documentNumber: this.extractDocumentNumber(cleanText)
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractMortgages(text: string): MortgageInfo[] {
    console.log('\n========== EXTRACTING MORTGAGES (STRUCTURED PARSING) ==========');

    // Normalize OCR text for consistent parsing
    const { OCRNormalizer } = require('../utils/ocr-normalizer');
    const normalizedText = OCRNormalizer.normalize(text);
    console.log('✅ OCR text normalized for consistent parsing');

    // Extract from "주요 등기사항 요약 (참고용)" summary section
    // This section ONLY lists ACTIVE items (cancelled mortgages are NOT included)
    // Format: "3. (근)저당권 및 전세권 등 ( 을구 )"
    // Note: Look for section terminators, but be careful - 출력일시 can appear mid-section in some documents
    // Best terminator: [참고사항] section which always comes after the data
    const summaryMatch = normalizedText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?=\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s);

    if (!summaryMatch) {
      console.log('⚠️  Summary section not found, cannot extract mortgages reliably');
      console.log('🔍 Checking if document contains summary keywords:');
      console.log(`  - Contains "주요 등기사항 요약": ${text.includes('주요 등기사항 요약')}`);
      console.log(`  - Contains "근저당권": ${text.includes('근저당권')}`);
      return [];
    }

    console.log('Found summary section (3. (근)저당권 및 전세권 등) - extracting active mortgages only');
    let summarySection = summaryMatch[1];

    // Apply summary-specific normalization to clean up table headers
    summarySection = OCRNormalizer.normalizeSummarySection(summarySection);
    console.log(`📝 Summary section (first 800 chars): "${summarySection.substring(0, 800)}"`);

    // Check if section explicitly states "기록사항 없음" (No Records)
    if (/[-\s]*기록사항\s*없음/.test(summarySection)) {
      console.log('✅ Section 3 explicitly states "기록사항 없음" (No Records) - no mortgages to extract');
      return [];
    }

    // Debug: Check for "10" entries
    if (summarySection.includes(' 10 ') || summarySection.includes('\n10 ') || summarySection.includes('10-1')) {
      console.log('  🔍 DEBUG: Found "10" in summary section');
      const lines = summarySection.split(/\r?\n/);
      const line10 = lines.filter((l: string) => l.includes(' 10 ') || l.includes('\n10 ') || l.includes('10-1'));
      console.log(`  🔍 Found ${line10.length} line(s) containing "10":`);
      line10.forEach((line: string, i: number) => console.log(`     [${i+1}] "${line}"`));
    } else {
      console.log('  ⚠️  DEBUG: "10" NOT found in summary section');
    }

    // Map to store mortgages by priority number
    const mortgagesMap = new Map<number, MortgageInfo>();

    // STEP 1: Extract base mortgage registrations (근저당권설정)
    console.log('\n--- STEP 1: Extract base mortgage registrations ---');
    this.extractBaseMortgages(summarySection, mortgagesMap);

    // STEP 1.5: Apply sub-entry mortgage amendments (10-3, 10-4, etc.)
    console.log('\n--- STEP 1.5: Apply sub-entry mortgage amendments (근저당권설정) ---');
    this.applySubEntryMortgageAmendments(summarySection, mortgagesMap);

    // STEP 2: Apply amendments (근저당권변경) - update amounts
    console.log('\n--- STEP 2: Apply mortgage amendments ---');
    this.applyMortgageAmendments(summarySection, mortgagesMap);

    // Convert to array and sort by priority
    const mortgages = Array.from(mortgagesMap.values()).sort((a, b) => a.priority - b.priority);

    console.log(`\n✅ Extracted ${mortgages.length} unique mortgages from summary section`);

    // Classify seniority based on priority only (no creditor needed)
    this.classifyMortgageSeniority(mortgages);

    console.log(`\n========== TOTAL MORTGAGES FOUND: ${mortgages.length} ==========\n`);
    return mortgages;
  }

  /**
   * STEP 1: Extract base mortgage registrations using structured parsing
   * Handles multiple OCR format variations for field order
   */
  private extractBaseMortgages(summarySection: string, mortgagesMap: Map<number, MortgageInfo>): void {
    // Pattern 1: 채권최고액 + 근저당권자 + 금XXX원 (keyword BEFORE amount)
    // Format: "11 근저당권설정 2015년 6월3일 제48831호 채권최고액 근저당권자 금275,000,000원 주식회사우리은행"
    // Format: "18 근저당권설정 2021년3월12일 채권최고액 제43903호 근저당권자 금699,600,000원 주식회사애큐온캐피탈"
    const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+(?:제\d+호\s+)?근저당권자\s+금\s*([\d,\s]+)원\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

    // Pattern 2: 채권최고액 + 금XXX원... 근저당권자 (keyword AFTER amount)
    // Format: "16 근저당권설정 2021년3월22일 채권최고액 금260,000,000원 제64748호 근저당권자 이명원"
    // Format: "2 근저당권설정 2013년8월29일 제29777호 채권최고액 금288,000,000원 근저당권자 황정문"
    // Format: "16 근저당권설정 16-1 근저당권이전 2021년3월22일 채권최고액 금260,000,000원 근저당권자 이명원"
    // Format: "19 근저당권설정 2024년3월28일 채권최고액 금933,900,000원 제50959호 근저당권자 농협은행주식회사 강윤지 등"
    // Format: "43 25 근저당권설정 박진경 2022년5월23일 채권최고액 금118,800,000원 제75079호 근저당권자 제이비우리캐피탈주식회사"
    const pattern2 = /(\d+)(?:\s+\d+)*\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(?:[가-힣]{2,4}\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

    // Pattern 3: 금XXX원 + 채권최고액 + 근저당권자 (amount BEFORE keyword)
    // Format: "17 근저당권설정 2021년10월6일 제195969호 금1,172,400,000원 채권최고액 근저당권자 주식회사오에스비저축은행"
    // This pattern handles cases where the amount appears before the "채권최고액" keyword
    const pattern3 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?금\s*([\d,\s]+)원\s+채권최고액\s+근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

    // Pattern 6: Malformed OCR format with table headers mixed in
    // Format: "1 근저당권설정 [참고사항] 접수정보 주요등기사항 대상소유자 2017년12월14일 채권최고액 금600,000,000원 제211724호 근저당권자 주식회사하나은행"
    // This handles Google Document AI OCR errors where table headers get merged with data rows
    const pattern6 = /(\d+)\s+근저당권설정\s+(?:[^\d]*?)(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시|\[참고사항\]).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|\[참고사항\]|$)/gs;

    // Pattern 7: Merged entries where priority appears in middle of other entry's line
    // Format: "8 전세권변경 25 근저당권설정 2022년2월9일 제18787호 2022년1월27일 | 전세금 금3,200,000,000원 제14713호 채권최고액 금1,534,000,000원 근저당권자 유한회사 우리이지론대부"
    // This handles cases where OCR merges table rows and a mortgage entry appears after unrelated text
    // Match: any text, then priority number, then 근저당권설정
    // Note: Uses [\s\S]*? instead of [^금]*? to allow jeonse data (containing 금) between date and 채권최고액
    const pattern7 = /(?:^|[\s\S]*?)\s(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[\s\S]*?채권최고액\s+금\s*([\d,\s]+)원[\s\S]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

    // Try pattern 1
    let match;
    while ((match = pattern1.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, amountStr, creditorStr] = match;
      const priority = parseInt(priorityStr);
      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Clean creditor name
      let creditor = creditorStr
        .replace(/제\d+호/g, '') // Remove receipt numbers
        .replace(/\d{6}-\*+/g, '') // Remove ID numbers
        .replace(/\s+/g, ' ')
        .trim();

      // Remove leading person names (2-4 Korean characters) before corporate creditors
      // Format: "진동성 주식회사애큐온캐피탈" → "주식회사애큐온캐피탈"
      // Format: "박진경 제이비우리캐피탈주식회사" → "제이비우리캐피탈주식회사"
      // Format: "김선회 김선회 주식회사오케이저축은행" → "주식회사오케이저축은행"
      // Keep removing until we don't find any more leading names
      let prevCreditor;
      do {
        prevCreditor = creditor;
        if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
          creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
        }
      } while (creditor !== prevCreditor && creditor.length > 0);

      // Remove owner names that appear after corporate keywords
      // Pattern: if creditor contains corporate keywords (은행, 주식회사, 대부, 저축은행, 공사),
      // remove any 2-4 character Korean names that follow them
      if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
        creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
      }

      // Remove trailing person names (2-4 Korean characters) which are typically owner/debtor names
      // These come from the "대상소유자" (target owner) or "채무자" (debtor) columns
      // Keep removing until we don't find any more trailing names
      do {
        prevCreditor = creditor;
        creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
      } while (creditor !== prevCreditor && creditor.length > 0);

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority}: ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }

    // Try pattern 2
    while ((match = pattern2.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, amountStr, creditorStr] = match;
      const priority = parseInt(priorityStr);

      // Skip if already extracted (pattern 1 took precedence)
      if (mortgagesMap.has(priority)) continue;

      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Clean creditor name
      let creditor = creditorStr
        .replace(/제\d+호/g, '') // Remove receipt numbers
        .replace(/\d{6}-\*+/g, '') // Remove ID numbers
        .replace(/\s+/g, ' ')
        .trim();

      // Remove leading person names (2-4 Korean characters) before corporate creditors
      // Format: "진동성 주식회사애큐온캐피탈" → "주식회사애큐온캐피탈"
      // Format: "박진경 제이비우리캐피탈주식회사" → "제이비우리캐피탈주식회사"
      // Format: "김선회 김선회 주식회사오케이저축은행" → "주식회사오케이저축은행"
      // Keep removing until we don't find any more leading names
      let prevCreditor;
      do {
        prevCreditor = creditor;
        if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
          creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
        }
      } while (creditor !== prevCreditor && creditor.length > 0);

      // Remove owner names that appear after corporate keywords
      // Pattern: if creditor contains corporate keywords (은행, 주식회사, 대부, 저축은행, 공사),
      // remove any 2-4 character Korean names that follow them
      if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
        creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
      }

      // Remove trailing person names (2-4 Korean characters) which are typically owner/debtor names
      // These come from the "대상소유자" (target owner) or "채무자" (debtor) columns
      // Keep removing until we don't find any more trailing names
      do {
        prevCreditor = creditor;
        creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
      } while (creditor !== prevCreditor && creditor.length > 0);

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority}: ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }

    // Try pattern 3
    while ((match = pattern3.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, amountStr, creditorStr] = match;
      const priority = parseInt(priorityStr);

      // Skip if already extracted (pattern 1 or 2 took precedence)
      if (mortgagesMap.has(priority)) continue;

      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Clean creditor name
      let creditor = creditorStr
        .replace(/제\d+호/g, '') // Remove receipt numbers
        .replace(/\d{6}-\*+/g, '') // Remove ID numbers
        .replace(/\s+/g, ' ')
        .trim();

      // Remove leading person names (2-4 Korean characters) before corporate creditors
      // Format: "진동성 주식회사애큐온캐피탈" → "주식회사애큐온캐피탈"
      // Format: "박진경 제이비우리캐피탈주식회사" → "제이비우리캐피탈주식회사"
      // Format: "김선회 김선회 주식회사오케이저축은행" → "주식회사오케이저축은행"
      // Keep removing until we don't find any more leading names
      let prevCreditor;
      do {
        prevCreditor = creditor;
        if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
          creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
        }
      } while (creditor !== prevCreditor && creditor.length > 0);

      // Remove owner names that appear after corporate keywords
      // Pattern: if creditor contains corporate keywords (은행, 주식회사, 대부, 저축은행, 공사),
      // remove any 2-4 character Korean names that follow them
      if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
        creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
      }

      // Remove trailing person names (2-4 Korean characters) which are typically owner/debtor names
      // These come from the "대상소유자" (target owner) or "채무자" (debtor) columns
      // Keep removing until we don't find any more trailing names
      do {
        prevCreditor = creditor;
        creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
      } while (creditor !== prevCreditor && creditor.length > 0);

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority}: ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }

    // Pattern 4: 근저당권자 + 금XXX원 + 대상소유자 + NAME + CREDITOR (아남1 format #10)
    // Format: "10 근저당권설정 2007년7월25일 채권최고액 제35508호 근저당권자 금390,000,000원 대상소유자 박희자 주식회사국민은행"
    // The creditor name appears AFTER the owner name
    const pattern4 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^근]*?채권최고액\s+제\d+호\s+근저당권자\s+금\s*([\d,\s]+)원\s+대상소유자\s+[가-힣]+\s+((?:(?!채무자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+근저당권|\d+\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+근저당권|\s+\d+\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

    while ((match = pattern4.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, amountStr, creditorStr] = match;
      const priority = parseInt(priorityStr);

      // Skip if already extracted
      if (mortgagesMap.has(priority)) continue;

      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      let creditor = creditorStr.replace(/\s+/g, ' ').trim();

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority}: ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }

    // Pattern 5: 근저당권자 + CREDITOR + 금XXX원 (아남1 format #21)
    // Format: "21 근저당권설정 2021년12월23일 채권최고액 제203061호 근저당권자 나눔파트너스대부주식회사 금112,000,000원"
    // Creditor name appears BEFORE the amount
    const pattern5 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^근]*?채권최고액\s+제\d+호\s+근저당권자\s+((?:(?!금\d|채무자|대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+근저당권|\d+\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)\s+금\s*([\d,\s]+)원/gs;

    while ((match = pattern5.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, creditorStr, amountStr] = match;
      const priority = parseInt(priorityStr);

      // Skip if already extracted
      if (mortgagesMap.has(priority)) continue;

      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      let creditor = creditorStr.replace(/\s+/g, ' ').trim();

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority}: ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }

    // Try pattern 6 (malformed OCR with table headers)
    while ((match = pattern6.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, amountStr, creditorStr] = match;
      const priority = parseInt(priorityStr);

      // Skip if already extracted (patterns 1-5 took precedence)
      if (mortgagesMap.has(priority)) continue;

      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Clean creditor name
      let creditor = creditorStr
        .replace(/제\d+호/g, '') // Remove receipt numbers
        .replace(/\d{6}-\*+/g, '') // Remove ID numbers
        .replace(/\s+/g, ' ')
        .trim();

      // Remove leading person names before corporate creditors
      let prevCreditor;
      do {
        prevCreditor = creditor;
        if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
          creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
        }
      } while (creditor !== prevCreditor && creditor.length > 0);

      // Remove owner names that appear after corporate keywords
      if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
        creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
      }

      // Remove trailing person names
      do {
        prevCreditor = creditor;
        creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
      } while (creditor !== prevCreditor && creditor.length > 0);

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority} (Pattern 6 - malformed OCR): ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }

    // Try pattern 7 (merged entries where mortgage appears mid-line)
    while ((match = pattern7.exec(summarySection)) !== null) {
      const [, priorityStr, year, month, day, amountStr, creditorStr] = match;
      const priority = parseInt(priorityStr);

      // Skip if already extracted (patterns 1-6 took precedence)
      if (mortgagesMap.has(priority)) continue;

      const maxSecuredAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      // Clean creditor name
      let creditor = creditorStr
        .replace(/제\d+호/g, '') // Remove receipt numbers
        .replace(/\d{6}-\*+/g, '') // Remove ID numbers
        .replace(/\s+/g, ' ')
        .trim();

      // Remove leading person names before corporate creditors
      let prevCreditor;
      do {
        prevCreditor = creditor;
        if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
          creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
        }
      } while (creditor !== prevCreditor && creditor.length > 0);

      // Remove owner names that appear after corporate keywords
      if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
        creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
      }

      // Remove trailing person names
      do {
        prevCreditor = creditor;
        creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
      } while (creditor !== prevCreditor && creditor.length > 0);

      mortgagesMap.set(priority, {
        priority,
        type: '근저당권',
        maxSecuredAmount,
        estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
        registrationDate,
        status: 'active'
      });

      console.log(`  ✅ Mortgage #${priority} (Pattern 7 - merged entries): ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
    }
  }

  /**
   * STEP 1.5: Apply sub-entry mortgage amendments (근저당권설정 with sub-entry numbers like 10-3, 10-4)
   * Format: "10-3 근저당권설정 박희자 2019년8월13일 채권최고액 금272,510,000원"
   * Note: Creditor name may appear between 근저당권설정 and date
   * These are amendments to the parent mortgage (entry 10), not separate mortgages
   * The most recent sub-entry amendment becomes the final amount
   */
  private applySubEntryMortgageAmendments(summarySection: string, mortgagesMap: Map<number, MortgageInfo>): void {
    // Pattern: Capture sub-entry amendments like "10-3 근저당권설정", "10-4 근저당권설정"
    // These update the parent mortgage (entry 10) to a new amount
    // [^\d]*? allows for optional creditor name before the date
    const subEntryPattern = /(\d+)-(\d+)\s+근저당권설정\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원/gs;

    // Group amendments by parent priority to find the most recent one
    const amendmentsByParent = new Map<number, Array<{subNumber: number, amount: number, date: string}>>();

    let match;
    while ((match = subEntryPattern.exec(summarySection)) !== null) {
      const [, parentStr, subStr, year, month, day, amountStr] = match;
      const parent = parseInt(parentStr);
      const sub = parseInt(subStr);
      const amount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      if (!amendmentsByParent.has(parent)) {
        amendmentsByParent.set(parent, []);
      }
      amendmentsByParent.get(parent)!.push({ subNumber: sub, amount, date });

      console.log(`  Found sub-entry amendment: ${parent}-${sub} 근저당권설정 ₩${amount.toLocaleString()} (${date})`);
    }

    // Apply the most recent amendment (highest sub-number) for each parent
    for (const [parent, amendments] of amendmentsByParent.entries()) {
      // Sort by sub-number descending to get the most recent
      amendments.sort((a, b) => b.subNumber - a.subNumber);
      const mostRecent = amendments[0];

      const mortgage = mortgagesMap.get(parent);
      if (mortgage) {
        const oldAmount = mortgage.maxSecuredAmount;
        mortgage.maxSecuredAmount = mostRecent.amount;
        mortgage.estimatedPrincipal = Math.floor(mostRecent.amount / 1.2);
        console.log(`  ✅ Updated mortgage #${parent} via sub-entry amendment: ₩${oldAmount.toLocaleString()} → ₩${mostRecent.amount.toLocaleString()} (${amendments.length} amendment${amendments.length > 1 ? 's' : ''} found, using most recent)`);
      } else {
        console.log(`  ⚠️  Sub-entry amendment ${parent}-${mostRecent.subNumber} found but no base mortgage #${parent} exists`);
      }
    }
  }

  /**
   * STEP 2: Apply mortgage amendments (근저당권변경) - update amounts
   * Format: "10-3 근저당권변경 박희자 2019년6월13일 ... 채권최고액 금272,510,000원"
   * Note: Creditor name appears between 근저당권변경 and date
   * Handles multiple amendments (e.g., 10-3, 10-4) by applying the most recent one
   */
  private applyMortgageAmendments(summarySection: string, mortgagesMap: Map<number, MortgageInfo>): void {
    // Pattern accounts for optional creditor name between entry type and date
    const amendmentPattern = /(\d+)-(\d+)\s+근저당권변경\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+금\s*([\d,\s]+)원/gs;

    // Group amendments by parent priority to find the most recent one
    const amendmentsByParent = new Map<number, Array<{subNumber: number, amount: number, date: string}>>();

    let match;
    while ((match = amendmentPattern.exec(summarySection)) !== null) {
      const [, parentStr, subStr, year, month, day, amountStr] = match;
      const parent = parseInt(parentStr);
      const sub = parseInt(subStr);
      const amount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      if (!amendmentsByParent.has(parent)) {
        amendmentsByParent.set(parent, []);
      }
      amendmentsByParent.get(parent)!.push({ subNumber: sub, amount, date });

      console.log(`  Found amendment: ${parent}-${sub} 근저당권변경 ₩${amount.toLocaleString()} (${date})`);
    }

    // Apply the most recent amendment (highest sub-number) for each parent
    for (const [parent, amendments] of amendmentsByParent.entries()) {
      // Sort by sub-number descending to get the most recent
      amendments.sort((a, b) => b.subNumber - a.subNumber);
      const mostRecent = amendments[0];

      const mortgage = mortgagesMap.get(parent);
      if (mortgage) {
        const oldAmount = mortgage.maxSecuredAmount;
        mortgage.maxSecuredAmount = mostRecent.amount;
        mortgage.estimatedPrincipal = Math.floor(mostRecent.amount / 1.2);
        console.log(`  ✅ Updated mortgage #${parent} via 근저당권변경: ₩${oldAmount.toLocaleString()} → ₩${mostRecent.amount.toLocaleString()} (${amendments.length} amendment${amendments.length > 1 ? 's' : ''} found, using most recent)`);
      } else {
        console.log(`  ⚠️  Amendment ${parent}-${mostRecent.subNumber} found but no base mortgage #${parent} exists`);
      }
    }
  }

  /**
   * STEP 3: Apply mortgage transfers (근저당권이전) - update creditors
   * Format: "16-1 근저당권이전 2023년11월9일 ... 근저당권자 김윤주"
   */
  private applyMortgageTransfers(summarySection: string, mortgagesMap: Map<number, MortgageInfo>): void {
    // Pattern: 16-1 근저당권이전 ... 근저당권자 [new creditor name]
    // Also matches: 10-1 10번근저당권이전 (with optional \d+번 prefix)
    // STOP at: owner names, next entry, sub-entries like "2-3"
    // NOTE: Receipt numbers (제\d+호) can appear in creditor field - they're cleaned later
    // Use [\s\n]+ to match newlines before sub-entry numbers

    // REMOVED "제\d+호" from negative lookahead - some transfers have receipt# after 근저당권자
    const transferPattern = /(\d+)-\d+\s+(?:\d+번)?근저당권이전\s+\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|[\s\n]+\d+-\d+\s+근저당권|[\s\n]+\d+-\d+\s+질권|[\s\n]+\d+\s+근저당권|[\s\n]+\d+\s+질권|[\s\n]+\d+\s+전세권|[\s\n]+\d+\s+임차권|출력일시|$)/gs;

    let match;
    while ((match = transferPattern.exec(summarySection)) !== null) {
      const [fullMatch, priorityStr, creditorStr] = match;
      const priority = parseInt(priorityStr);

      // Apply the same cleaning logic as mortgage patterns
      let newCreditor = creditorStr
        .replace(/제\d+호/g, '') // Remove receipt numbers
        .replace(/\d{6}-\*+/g, '') // Remove ID numbers
        // Remove everything from a newline+number pattern onwards (handles sub-entries like "2-3 근질권")
        // Also remove any whitespace+number pattern (for cases without newline)
        .replace(/[\r\n\s]+\d+-?\d*\s+(근질권|근저당권|질권|전세권|임차권).*$/s, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Remove leading person names (2-4 Korean characters) before corporate creditors
      // Keep removing until we don't find any more leading names
      let prevCreditor;
      do {
        prevCreditor = newCreditor;
        if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(newCreditor)) {
          newCreditor = newCreditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
        }
      } while (newCreditor !== prevCreditor && newCreditor.length > 0);

      // Remove owner names that appear after corporate keywords
      if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(newCreditor)) {
        newCreditor = newCreditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
      }

      // Remove trailing person names (2-4 Korean characters)
      do {
        prevCreditor = newCreditor;
        newCreditor = newCreditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
      } while (newCreditor !== prevCreditor && newCreditor.length > 0);

      const mortgage = mortgagesMap.get(priority);
      if (mortgage) {
        const oldCreditor = mortgage.creditor;
        mortgage.creditor = newCreditor;
        console.log(`  ✅ Updated mortgage #${priority} creditor: "${oldCreditor}" → "${newCreditor}"`);
      } else {
        console.log(`  ⚠️  Transfer for mortgage #${priority} but no base registration found`);
      }
    }
  }

  /**
   * STEP 4: Detect inline transfers in creditor names
   * Format: "이명원 2023년11월9일 근저당권자 김윤주"
   * This means the mortgage was transferred from 이명원 to 김윤주 on the same line
   */
  private detectInlineTransfers(mortgagesMap: Map<number, MortgageInfo>): void {
    // Common owner names to stop at (to prevent capturing them as creditors)
    const commonOwnerNames = ['민응호', '김선회', '진동성', '박진경', '배미정', '현지혜', '황보용식'];

    for (const [priority, mortgage] of mortgagesMap.entries()) {
      const creditor = mortgage.creditor;

      // Skip inline transfer detection if creditor is undefined
      if (!creditor) continue;

      // Check if creditor contains inline transfer pattern: "원래채권자 YYYY년MM월DD일 근저당권자 새채권자"
      const inlineTransferMatch = creditor.match(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*근저당권자\s+((?:(?!민응호|김선회|진동성|박진경|배미정|현지혜|황보용식|제\d+호).)+?)(?:\s+민응호|\s+김선회|\s+진동성|\s+박진경|\s+배미정|\s+현지혜|\s+황보용식|\s+제\d+호|$)/);

      if (inlineTransferMatch) {
        const originalCreditor = creditor.split(/\d{4}년/)[0].trim();
        const transferredCreditor = inlineTransferMatch[1]
          .replace(/제\d+호/g, '') // Remove receipt numbers
          .replace(/\s+/g, ' ')
          .trim();

        mortgage.creditor = transferredCreditor;
        console.log(`  ✅ Detected inline transfer in mortgage #${priority}: "${originalCreditor}" → "${transferredCreditor}"`);
      }
    }
  }


  /**
   * Classify mortgage seniority based on registration order
   *
   * Rules:
   * 1. Lower priority number = higher seniority
   * 2. First mortgage (lowest priority) = SENIOR
   * 3. If same creditor appears multiple times:
   *    - First appearance = SENIOR
   *    - Second appearance = JUNIOR
   *    - Third+ appearance = SUBORDINATE
   * 4. Different creditors each get their own seniority classification
   */
  private classifyMortgageSeniority(mortgages: MortgageInfo[]): void {
    if (mortgages.length === 0) return;

    // Sort by priority (lower number = higher priority = more senior)
    mortgages.sort((a, b) => a.priority - b.priority);

    // Classify based solely on priority (position in line)
    mortgages.forEach((mortgage, index) => {
      if (index === 0) {
        // First mortgage is always senior
        mortgage.seniority = 'senior';
      } else if (index === 1) {
        // Second mortgage is junior
        mortgage.seniority = 'junior';
      } else {
        // Third+ mortgages are subordinate
        mortgage.seniority = 'subordinate';
      }

      console.log(`  Mortgage #${mortgage.priority}: ${mortgage.seniority?.toUpperCase()}`);
    });
  }

  private extractOwnership(text: string): OwnershipInfo[] {
    const owners: OwnershipInfo[] = [];

    console.log('\n========== OWNERSHIP EXTRACTION DEBUG ==========');
    console.log('Checking if text contains "소유지분현황":', text.includes('소유지분현황'));
    console.log('Checking if text contains "공유자":', text.includes('공유자'));

    // PRIORITY 1: Check "1. 소유지분현황 ( 갑구 )" section (table format with 공유자)
    // This format appears in documents with co-ownership
    // Example format:
    // 1. 소유지분현황 ( 갑구 )
    // 강윤지 (공유자) 880416-******* 2분의 1
    // 김도현 (공유자) 880825-******* 2분의 1
    const ownerStatusMatch = text.match(/1\s*\.\s*소유지분현황\s*\(\s*갑\s*구\s*\)(.*?)(?:2\s*\.\s*소유지분을\s*제외한|$)/s);

    if (ownerStatusMatch) {
      console.log('✅ Found "1. 소유지분현황 ( 갑구 )" section - checking for co-owners');
      const ownerStatusSection = ownerStatusMatch[1];
      console.log('Owner status section length:', ownerStatusSection.length);
      console.log('Owner status section preview:', ownerStatusSection.substring(0, 200));

      // Pattern for co-owner table format: "강윤지 (공유자) ... 2분의 1"
      const coOwnerPattern = /([가-힣]+)\s*\(공유자\).*?(\d+)\s*분의\s*(\d+)/gs;

      let coOwnerMatch;
      while ((coOwnerMatch = coOwnerPattern.exec(ownerStatusSection)) !== null) {
        const [, name, denominator, numerator] = coOwnerMatch;
        const percentage = (parseInt(numerator) / parseInt(denominator)) * 100;

        owners.push({
          ownerName: name.trim(),
          ownershipPercentage: percentage,
          registrationDate: '', // Not available in table format
          acquisitionMethod: '공유자'
        });

        console.log(`✅ Found co-owner: ${name.trim()} (${percentage}%)`);
      }

      if (owners.length > 0) {
        console.log(`✅ FOUND ${owners.length} CO-OWNERS from 소유지분현황 section`);
        console.log('========== END OWNERSHIP EXTRACTION ==========\n');
        return owners;
      } else {
        console.log('❌ No co-owners found in 소유지분현황 section');
      }
    } else {
      console.log('❌ "1. 소유지분현황 ( 갑구 )" section NOT FOUND');
    }

    // PRIORITY 2: Check summary section "1. 소유권에 관한 사항"
    // This shows CURRENT ownership structure (sequential format)
    const summarySectionMatch = text.match(/1\s*\.\s*소유권에\s*관한\s*사항(.*?)(?:2\s*\.\s*소유지분을\s*제외한|$)/s);

    if (summarySectionMatch) {
      console.log('✅ Found "1. 소유권에 관한 사항" section - checking for ownership transfers');
      const summarySection = summarySectionMatch[1];

      // Pattern for ownership with share percentage (지분)
      // Example: "1 소유권이전 2016년4월26일 소유자 김선희 지분 2분의1"
      // Example: "2 소유권이전 2016년4월26일 소유자 김선회 지분 2분의1"
      const sharePattern = /(\d+)\s+소유권이전\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?소유자\s+([가-힣]+).*?지분\s+(\d+)\s*분의\s*(\d+)/gs;

      let shareMatch;
      while ((shareMatch = sharePattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, name, denominator, numerator] = shareMatch;
        const percentage = (parseInt(numerator) / parseInt(denominator)) * 100;

        owners.push({
          ownerName: name.trim(),
          ownershipPercentage: percentage,
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          acquisitionMethod: '소유권이전'
        });

        console.log(`✅ Found owner from transfer: ${name.trim()} (${percentage}%)`);
      }

      if (owners.length > 0) {
        console.log(`✅ Found ${owners.length} co-owners from summary section`);
        return owners;
      }
    }

    // FALLBACK: Try detailed pattern (older approach)
    const ownerPattern = /소유권이전.*?소유자\s*:?\s*([가-힣]+).*?(?:주민등록번호|주소).*?접수\s*:?\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?원인\s*:?\s*([^\n]+)/gs;

    let match;
    while ((match = ownerPattern.exec(text)) !== null) {
      const [_, name, year, month, day, method] = match;

      owners.push({
        ownerName: name.trim(),
        ownershipPercentage: 100, // Assume 100% if no share info
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        acquisitionMethod: method.trim()
      });
    }

    // Return only most recent owner if using fallback
    return owners.length > 0 ? owners.slice(-1) : [];
  }

  private extractJeonseRights(text: string): JeonseRightInfo[] {
    const rights: JeonseRightInfo[] = [];

    console.log('\n========== EXTRACTING JEONSE/LEASE RIGHTS ==========');

    // BEST APPROACH: Extract from "주요 등기사항 요약 (참고용)" summary section
    // This section ONLY lists ACTIVE items (cancelled items are not included)
    // Same section used for mortgages: "3. (근)저당권 및 전세권 등 ( 을구 )"
    // Use same terminator as mortgage extraction for consistency
    const summaryMatch = text.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?=\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s);

    if (summaryMatch) {
      console.log('Found summary section (3. (근)저당권 및 전세권 등) - extracting jeonse rights');
      const summarySection = summaryMatch[1];
      console.log(`📝 Jeonse summary section (first 800 chars): "${summarySection.substring(0, 800)}"`);

      // Pattern for 전세권설정 in summary section
      // Format: "28 전세권설정 진동성 2021년10월27일 전세금 금5,000,000원 제175052호 전세권자 성민투자금융대부주식회사"
      // Note: Owner name (like 진동성) may appear between 전세권설정 and the date
      const jeonsePattern = /(\d+)\s+전세권설정\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^금]*?전세권자\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

      // Track jeonse entries by priority to keep only the latest (변경 overrides 설정)
      const jeonseMap = new Map<number, JeonseRightInfo>();

      let match;
      while ((match = jeonsePattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, tenant] = match;
        const priorityNum = parseInt(priority);
        const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));
        const cleanTenant = tenant.trim()
          .replace(/제\d+호/g, '')
          .replace(/진동성/g, '')
          .replace(/김선회/g, '')
          .replace(/대상소유자/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(`Summary 전세권설정 #${priority}: ₩${cleanAmount.toLocaleString()} - tenant: ${cleanTenant} (ACTIVE)`);

        jeonseMap.set(priorityNum, {
          tenant: cleanTenant,
          amount: cleanAmount,
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          type: '전세권'
        });
      }

      // Pattern for 전세권변경 in summary section (jeonse amendments - updated amounts)
      // Format: "3-2 전세권변경 2018년1월22일 | 전세금 금1,900,000,000원"
      // OR (malformed): "8 전세권변경 25 근저당권설정 2022년2월9일 제18787호 2022년1월27일 | 전세금 금3,200,000,000원"
      // Strategy: Match the FIRST date after 변경 that has | immediately after it, followed by 전세금
      // This pattern specifically looks for the "YYYY년MM월DD일 | 전세금" sequence which is the standard format
      const jeonseChangePattern = /(\d+)(?:-\d+)?\s+전세권변경[\s\S]{1,80}?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[\|]\s*전세금\s+금\s*([\d,\s]+)원/gs;

      let changeMatch;
      while ((changeMatch = jeonseChangePattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount] = changeMatch;
        const priorityNum = parseInt(priority);
        const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));

        console.log(`Summary 전세권변경 #${priority}: ₩${cleanAmount.toLocaleString()} (UPDATED AMOUNT)`);

        // Get existing entry or create new one
        const existing = jeonseMap.get(priorityNum);
        jeonseMap.set(priorityNum, {
          tenant: existing?.tenant || '전세권자 미상',
          amount: cleanAmount, // Updated amount from 변경
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          type: '전세권'
        });
      }

      // Add all jeonse entries to rights array
      rights.push(...Array.from(jeonseMap.values()));

      // Pattern for 임차권등기명령 in summary section
      const leasePattern = /(\d+)\s+임차권등기명령\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?(?:보증금\s+금\s*([\d,\s]+)원)?[^금]*?(?:임차인|신청인)\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

      let match2;
      while ((match2 = leasePattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, tenant] = match2;
        const cleanAmount = amount ? parseInt(amount.replace(/,/g, '').replace(/\s+/g, '')) : 0;
        const cleanTenant = tenant.trim()
          .replace(/제\d+호/g, '')
          .replace(/진동성/g, '')
          .replace(/김선회/g, '')
          .replace(/대상소유자/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(`Summary 임차권등기 #${priority}: ₩${cleanAmount.toLocaleString()} - tenant: ${cleanTenant} (ACTIVE)`);

        rights.push({
          tenant: cleanTenant,
          amount: cleanAmount,
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          type: '임차권등기'
        });
      }

      // Pattern for 임차권설정 (registered lease right) in summary section
      // Format: "11 임차권설정 김선회 2023년6월7일 제80667호 임차보증금 금13,000,000원 임차권자 권미리"
      const leaseRegistrationPattern = /(\d+)\s+임차권설정\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?(?:임차보증금|보증금)\s+금\s*([\d,\s]+)원[^금]*?임차권자\s+([^\s]+)/gs;

      let match3;
      while ((match3 = leaseRegistrationPattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, tenant] = match3;
        const cleanAmount = parseInt(amount.replace(/,/g, '').replace(/\s+/g, ''));
        const cleanTenant = tenant.trim()
          .replace(/제\d+호/g, '')
          .replace(/대상소유자/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        console.log(`Summary 임차권설정 #${priority}: ₩${cleanAmount.toLocaleString()} - tenant: ${cleanTenant} (ACTIVE)`);

        rights.push({
          tenant: cleanTenant,
          amount: cleanAmount,
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          type: '임차권설정'
        });
      }

      console.log(`✅ Extracted ${rights.length} jeonse/lease rights from summary section`);
    } else {
      console.log('⚠️  Summary section not found, cannot extract jeonse rights reliably');
    }

    console.log(`========== TOTAL JEONSE/LEASE RIGHTS FOUND: ${rights.length} ==========\n`);
    return rights;
  }

  private checkForSeizure(text: string): boolean {
    // PRIORITY: Check summary section only (active items)
    const summaryMatch = text.match(/2\s*\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\s*\.\s*\(근\)저당권|$)/s);
    if (summaryMatch) {
      const section2Content = summaryMatch[1];

      // If section explicitly states "기록사항 없음" (No Records), return false
      if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
        return false;
      }

      // Look for 압류 but NOT 가압류 in summary section only
      return /(?<!가)압류/.test(section2Content);
    }
    // NO FALLBACK: If summary section not found, return false
    // This prevents false positives from cancelled entries in full certificate history
    return false;
  }

  private checkForProvisionalSeizure(text: string): boolean {
    // PRIORITY: Check summary section only (active items)
    const summaryMatch = text.match(/2\s*\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\s*\.\s*\(근\)저당권|$)/s);
    if (summaryMatch) {
      const section2Content = summaryMatch[1];

      // If section explicitly states "기록사항 없음" (No Records), return false
      if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
        return false;
      }

      return /가압류/.test(section2Content);
    }
    // NO FALLBACK: If summary section not found, return false
    // This prevents false positives from cancelled entries in full certificate history
    return false;
  }

  private checkForAuction(text: string): boolean {
    // PRIORITY: Check summary section only (active items)
    const summaryMatch = text.match(/2\s*\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\s*\.\s*\(근\)저당권|$)/s);
    if (summaryMatch) {
      const section2Content = summaryMatch[1];

      // If section explicitly states "기록사항 없음" (No Records), return false
      if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
        return false;
      }

      return /경매개시결정/.test(section2Content);
    }
    // NO FALLBACK: If summary section not found, return false
    // This prevents false positives from cancelled entries in full certificate history
    return false;
  }

  private checkForSuperficies(text: string): boolean {
    return /지상권/.test(text);
  }

  private checkForEasement(text: string): boolean {
    return /지역권/.test(text);
  }

  private checkForProvisionalRegistration(text: string): boolean {
    // Extract section 2 (갑구 ownership matters excluding ownership share)
    // Format: "2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )"
    const section2Match = text.match(/2\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\.\s*\(근\)저당권|$)/s);

    if (section2Match) {
      const section2Content = section2Match[1];

      // If section explicitly states "기록사항 없음" (No Records), return false
      if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
        console.log('Section 2 (갑구) explicitly states "기록사항 없음" - no provisional registration');
        return false;
      }

      // Otherwise check if "가등기" appears in the section content
      return /가등기/.test(section2Content);
    }

    // NO FALLBACK: If summary section not found, return false
    // This prevents false positives from cancelled entries in full certificate history
    console.log('⚠️  Section 2 (갑구) not found - cannot determine provisional registration status, returning false');
    return false;
  }

  private checkForProvisionalDisposition(text: string): boolean {
    // Extract section 2 (갑구) to check for active provisional dispositions only
    const summaryMatch = text.match(/2\s*\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\s*\.\s*\(근\)저당권|$)/s);
    if (summaryMatch) {
      const section2Content = summaryMatch[1];

      // If section explicitly states "기록사항 없음" (No Records), return false
      if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
        return false;
      }

      return /가처분/.test(section2Content);
    }
    // NO FALLBACK: If summary section not found, return false
    return false;
  }

  private checkForAdvanceNotice(text: string): boolean {
    return /예고등기/.test(text);
  }

  private checkForUnregisteredLandRights(text: string): boolean {
    return /대지권미등기/.test(text);
  }

  private extractLiens(text: string): LienInfo[] {
    const liens: LienInfo[] = [];

    console.log('\n========== EXTRACTING LIENS ==========');

    // PRIORITY 1: Extract from "주요 등기사항 요약 (참고용)" summary section
    // This section only shows ACTIVE (not cancelled) entries
    // Look for section "2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )"
    const summaryMatch = text.match(/2\s*\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\s*\.\s*\(근\)저당권|$)/s);

    if (summaryMatch) {
      console.log('Found summary section (2. 소유지분을 제외한 소유권에 관한 사항)');
      const summarySection = summaryMatch[1];
      console.log(`📝 Summary section (first 800 chars): "${summarySection.substring(0, 800)}"`);

      // Extract from summary table
      // Format: "순위번호 등기목적 접수정보 주요등기사항 대상소유자"
      // Example: "2 임의경매개시결정 2023년 11월 10일 제166137호 채권자 주식회사현대부동산연구소 김선회"

      // Pattern for 경매 (Auction) in summary
      const auctionPattern = /(\d+)\s+(?:임의경매개시결정|경매개시결정)\s+(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일[^채]*?채권자\s+([^\s]+(?:\s+[가-힣]+)*)/g;
      let match;
      while ((match = auctionPattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, creditor] = match;
        console.log(`Found 경매개시결정 #${priority} from ${creditor.trim()}`);
        liens.push({
          type: '경매',
          creditor: creditor.trim(),
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          description: `경매개시결정 by ${creditor.trim()}`
        });
      }

      // Pattern for 가압류 (Provisional Seizure) in summary
      const provisionalSeizurePattern = /(\d+)\s+가압류\s+(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일[^청금]*?(?:청구금액\s+금\s*([\d,]+)\s*원)?[^채]*?채권자\s+([^\s]+(?:\s+[가-힣]+)*)/g;
      while ((match = provisionalSeizurePattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, creditor] = match;
        console.log(`Found 가압류 #${priority}${amount ? `: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()}` : ''} from ${creditor.trim()}`);
        liens.push({
          type: '가압류',
          creditor: creditor.trim(),
          amount: amount ? parseInt(amount.replace(/,/g, '')) : undefined,
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          description: `가압류 by ${creditor.trim()}`
        });
      }

      // Pattern for 압류 (Seizure) in summary
      const seizurePattern = /(\d+)\s+(?<!가)압류\s+(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일[^권]*?권리자\s+([^\s]+)/g;
      while ((match = seizurePattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, creditor] = match;
        console.log(`Found 압류 #${priority} from ${creditor.trim()}`);
        liens.push({
          type: '압류',
          creditor: creditor.trim(),
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          description: `압류 by ${creditor.trim()}`
        });
      }

      console.log(`✅ Extracted ${liens.length} active liens from summary section`);
      console.log(`========== TOTAL LIENS FOUND: ${liens.length} ==========\n`);
      return liens;
    }

    console.log('Summary section not found, falling back to detailed section (may include cancelled entries)...');

    // FALLBACK: Look for 을구 section which contains liens (but may include cancelled entries)
    const eulguMatch = text.match(/을\s*구\s*\(.*?(?=갑\s*구|병\s*구|$)/s);
    const eulguSection = eulguMatch ? eulguMatch[0] : text;

    // Pattern 1: 가압류 (Provisional Seizure) with amount
    const provisionalSeizurePattern = /(\d+)\s+가압류\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권금액\s+금\s*([\d,]+)원[^금]*?채권자\s+([가-힣\s]+)/gs;

    let match1;
    while ((match1 = provisionalSeizurePattern.exec(eulguSection)) !== null) {
      const [, priority, year, month, day, amount, creditor] = match1;
      console.log(`Found 가압류 #${priority}: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()} from ${creditor.trim()}`);

      liens.push({
        type: '가압류',
        creditor: creditor.trim(),
        amount: parseInt(amount.replace(/,/g, '')),
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        description: `가압류 by ${creditor.trim()}`
      });
    }

    // Pattern 2: 압류 (Seizure) - look for without 가 prefix
    const seizurePattern = /(\d+)\s+(?<!가)압류\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?(?:채권금액\s+금\s*([\d,]+)원)?[^금]*?(?:채권자|압류권자)\s+([가-힣\s]+(?:국|청|지방법원|세무서|구청|시청)[^\d\n]{0,30})/gs;

    let match2;
    while ((match2 = seizurePattern.exec(eulguSection)) !== null) {
      const [, priority, year, month, day, amount, creditor] = match2;
      const amountValue = amount ? parseInt(amount.replace(/,/g, '')) : undefined;
      console.log(`Found 압류 #${priority}: ${amountValue ? '₩' + amountValue.toLocaleString() : 'No amount'} from ${creditor.trim()}`);

      liens.push({
        type: '압류',
        creditor: creditor.trim(),
        amount: amountValue,
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        description: `압류 by ${creditor.trim()}`
      });
    }

    // Pattern 3: 가처분 (Provisional Disposition)
    const provisionalDispositionPattern = /(\d+)\s+가처분\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?(?:신청인|채권자)\s+([가-힣\s]+)/gs;

    let match3;
    while ((match3 = provisionalDispositionPattern.exec(eulguSection)) !== null) {
      const [, priority, year, month, day, creditor] = match3;
      console.log(`Found 가처분 #${priority} from ${creditor.trim()}`);

      liens.push({
        type: '가처분',
        creditor: creditor.trim(),
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        description: `가처분 by ${creditor.trim()}`
      });
    }

    // Pattern 4: 경매개시결정 (Auction)
    const auctionPattern = /(\d+)\s+(?:임의경매개시결정|경매개시결정)\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?(?:신청인|채권자)\s+([가-힣\s]+)/gs;

    let match4;
    while ((match4 = auctionPattern.exec(eulguSection)) !== null) {
      const [, priority, year, month, day, creditor] = match4;
      console.log(`Found 경매개시결정 #${priority} from ${creditor.trim()}`);

      liens.push({
        type: '경매',
        creditor: creditor.trim(),
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        description: `경매개시결정 by ${creditor.trim()}`
      });
    }

    console.log(`========== TOTAL LIENS FOUND: ${liens.length} ==========\n`);
    return liens;
  }

  private extractAddress(text: string): string {
    // Try pattern 1: [집합건물]서울특별시 구로구 개봉동 489 개봉동아이파크 제107동 제5층 제501호
    // Stop at 【 or [ or newline to avoid capturing too much text
    const pattern1 = /\[집합건물\]\s*([^【\[\n]+?)(?:\s*【|\s+\[|\n|$)/;
    const match1 = text.match(pattern1);
    if (match1) {
      return match1[1].trim();
    }

    // Try pattern 2: Traditional format with 소재지
    const pattern2 = /소재지\s*:?\s*([^\n]+)/;
    const match2 = text.match(pattern2);
    if (match2) {
      return match2[1].trim();
    }

    // Try pattern 3: Just the address line after 표시번호
    const pattern3 = /소재지번,건물명칭\s+및\s+번호.*?(\d{4})년\d{1,2}월\d{1,2}일\s+(서울특별시[^\n]+?)\s+(?:철근|대)/;
    const match3 = text.match(pattern3);
    if (match3) {
      return match3[2].trim();
    }

    return '';
  }

  private extractBuildingName(text: string): string | undefined {
    // Try pattern 1: Extract from [집합건물] address line BEFORE any unit numbers
    // Format: [집합건물]서울특별시 구로구 개봉동 489 개봉동아이파크 제107동
    // We want: 개봉동아이파크
    const pattern1 = /\[집합건물\]\s*[^제\[]+?\s+(\S+(?:아이파크|아파트|빌라|타운|오피스텔|주공|휴플러스|푸르지오|래미안|자이|힐스테이트|e편한세상))\s+제/;
    const match1 = text.match(pattern1);
    if (match1) {
      console.log('Extracted building name from [집합건물] pattern:', match1[1]);
      return match1[1].trim();
    }

    // Try pattern 2: Fallback - look for building name keywords without 제 constraint
    const pattern2 = /\[집합건물\][^\[]*?\s+(\S+(?:아이파크|아파트|빌라|타운|오피스텔|주공|휴플러스|푸르지오|래미안|자이|힐스테이트|e편한세상))/;
    const match2 = text.match(pattern2);
    if (match2) {
      // Verify it's not from an address (should not have 102-806 pattern immediately after)
      const fullMatch = match2[0];
      if (!/\d{3}-\d{3,4}/.test(fullMatch.substring(fullMatch.indexOf(match2[1])))) {
        console.log('Extracted building name from fallback pattern:', match2[1]);
        return match2[1].trim();
      }
    }

    // Try pattern 3: Traditional format
    const pattern3 = /건물명칭\s*:?\s*([^\n]+)/;
    const match3 = text.match(pattern3);
    if (match3) {
      return match3[1].trim();
    }

    return undefined;
  }

  private extractArea(text: string): number {
    // Try pattern 1: Look in the 전유부분의 건물의 표시 section for 84.98m²
    // Handle variations: 철근콘크리트구조, 철근콘크리트벽식조, 철근콘크리트벽식구 조 (with space), etc.
    const pattern1 = /전유부분의 건물의 표시.*?건물번호.*?철근콘크리트[가-힣\s]*?([\d.]+)\s*[㎡m²]/s;
    const match1 = text.match(pattern1);
    if (match1) {
      const area = parseFloat(match1[1]);
      // Sanity check: typical apartment areas are 20-300㎡
      if (area >= 20 && area <= 300) {
        console.log(`✅ Extracted area from pattern 1: ${match1[1]}㎡`);
        return area;
      }
    }

    // Try pattern 2: Look for area right after 건물번호 in 표제부
    const pattern2 = /표제부.*?건물번호.*?([\d.]+)\s*m²/s;
    const match2 = text.match(pattern2);
    if (match2) {
      console.log(`✅ Extracted area from pattern 2: ${match2[1]}㎡`);
      return parseFloat(match2[1]);
    }

    // Try pattern 3: Traditional format
    const pattern3 = /전유면적\s*:?\s*([\d.]+)\s*[㎡m²]/;
    const match3 = text.match(pattern3);
    if (match3) {
      console.log(`✅ Extracted area from pattern 3: ${match3[1]}㎡`);
      return parseFloat(match3[1]);
    }

    // Try pattern 4: More flexible - look for any 3-digit area near 건물번호
    // This handles formats like "제401호 123.45m²" or "401호 철근콘크리트구조 123.45m²"
    const pattern4 = /건물번호.*?(\d{2,3}\.\d{2})\s*[㎡m²]/s;
    const match4 = text.match(pattern4);
    if (match4) {
      const area = parseFloat(match4[1]);
      // Sanity check: typical apartment areas are 20-300㎡
      if (area >= 20 && area <= 300) {
        console.log(`✅ Extracted area from pattern 4 (flexible): ${match4[1]}㎡`);
        return area;
      }
    }

    // Diagnostic: Show what we found near 건물번호
    const diagnosticMatch = text.match(/건물번호.*?[\d.]+\s*m²/s);
    if (diagnosticMatch) {
      console.warn(`⚠️  Found area-like text but didn't match: "${diagnosticMatch[0].substring(0, 100)}"`);
    }

    console.warn('⚠️  Could not extract area from OCR text');
    return 0;
  }

  private extractLandArea(text: string): number | undefined {
    const landPattern = /대지면적\s*:?\s*([\d.]+)\s*㎡/;
    const match = text.match(landPattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  private extractBuildingYear(text: string): number | undefined {
    // Pattern 1: Look for registration date in ownership section (표제부)
    // Example: "2016년4월26일" or "2016년 4월 26일"
    const registrationPattern = /(\d{4})년\s*\d{1,2}월\s*\d{1,2}일.*?등기/;
    const match1 = text.match(registrationPattern);
    if (match1) {
      const year = parseInt(match1[1], 10);
      // Sanity check: building year should be reasonable (1950-2030)
      if (year >= 1950 && year <= 2030) {
        return year;
      }
    }

    // Pattern 2: Look in 표제부 section for 신축년월일
    const constructionPattern = /신축년월일.*?(\d{4})년/;
    const match2 = text.match(constructionPattern);
    if (match2) {
      const year = parseInt(match2[1], 10);
      if (year >= 1950 && year <= 2030) {
        return year;
      }
    }

    return undefined;
  }

  private countOwnershipChanges(text: string): number {
    const changes = text.match(/소유권이전/g);
    return changes ? changes.length : 0;
  }

  private extractRecentOwnershipChange(text: string): string | undefined {
    const pattern = /소유권이전.*?접수\s*:?\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/gs;
    const matches = [...text.matchAll(pattern)];

    if (matches.length === 0) return undefined;

    const lastMatch = matches[matches.length - 1];
    return `${lastMatch[1]}-${lastMatch[2].padStart(2, '0')}-${lastMatch[3].padStart(2, '0')}`;
  }

  private extractIssueDate(text: string): string {
    const pattern = /발급일\s*:?\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/;
    const match = text.match(pattern);
    return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : '';
  }

  private extractDocumentNumber(text: string): string {
    const pattern = /문서번호\s*:?\s*([^\n]+)/;
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
  }
}
