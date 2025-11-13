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
    const mortgages: MortgageInfo[] = [];

    console.log('\n========== EXTRACTING MORTGAGES ==========');

    // BEST APPROACH: Extract from "주요 등기사항 요약 (참고용)" summary section
    // This section lists all active mortgages in a clean table format
    // Look for section "3. (근)저당권 및 전세권 등 ( 을구 )" within the summary
    const summaryMatch = text.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:11\s+임차권설정|\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s);

    if (summaryMatch) {
      console.log('Found summary section (3. (근)저당권 및 전세권 등)');
      const summarySection = summaryMatch[1];
      console.log(`📝 Summary section (first 800 chars): "${summarySection.substring(0, 800)}"`);

      // Pattern: Extract from table rows
      // The cleaned text format is: 순위번호 등기목적 접수정보 주요등기사항 대상소유자
      // Example: "2 근저당권설정 2013년8월29일 제29777호 채권최고액 금288,000,000원 근저당권자 중소기업은행 김선회"
      // Pattern handles:
      // - Spaces in dates: "11월 10일" vs "11월10일"
      // - Spaces in amounts: "금 120,000,000원" vs "금120,000,000원"
      // - Variable order: "채권최고액 근저당권자 금XXX원 은행" vs "채권최고액 금XXX원 근저당권자 은행"
      // - Owner name before creditor: "금XXX원 김선회 비엔케이캐피탈" (skip 김선회)

      // Pattern handles TWO formats from OCR:
      // Format A (most common): "2 근저당권설정 2013년8월29일 제29777호 채권최고액 근저당권자 금288,000,000원 중소기업은행"
      // Format B (rare): "4 근저당권설정 2017년6월9일 제40569호 채권최고액 금84,000,000원 근저당권자 중소기업은행"
      // Notice: Order varies between "채권최고액 근저당권자 금XXX원" vs "채권최고액 금XXX원 근저당권자"

      // Real PDF format from actual OCR (three distinct formats):
      // Entry #2: "2 근저당권설정 2013년8월29일 채권최고액 제29777호 근저당권자 금288,000,000원 중소기업은행 대상소유자 김선회"
      // Entry #4: "4 근저당권설정 2017년6월9일 제40569호 채권최고액 금84,000,000원 근저당권자 중소기업은행 김선회"
      // Entry #5: "5 근저당권설정 2020년9월25일 제214720호 채권최고액 근저당권자 금260,000,000원 김선희 흥국화재해상보험주식회사"

      // Format A: 채권최고액 + 제XXX호? + 근저당권자 + 금XXX원 + creditor
      const patternA = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+(?:제\d+호\s+)?채권최고액\s+(?:제\d+호\s+)?근저당권자\s+금\s*([\d,\s]+)원\s+((?:(?!대상소유자|김선희|\d+-?\d*\s+근저당권|\d+-?\d*\s+근질권|\d+\s+임차권|\[).)+?)(?=\s+대상소유자|\s+김선희|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+근질권|\s+\d+\s+임차권|\s+\[|$)/gs;

      // Format B: 제XXX호? + 채권최고액 + 금XXX원 + 근저당권자 + creditor
      const patternB = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+(?:제\d+호\s+)?채권최고액\s+금\s*([\d,\s]+)원\s+근저당권자\s+((?:(?!김선희|\d+-?\d*\s+근저당권|\d+-?\d*\s+근질권|\d+\s+임차권|\[).)+?)(?=\s+김선희|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+근질권|\s+\d+\s+임차권|\s+\[|$)/gs;

      // Format C: 제XXX호 + 채권최고액 + 근저당권자 + 금XXX원 + 김선희? + creditor
      const patternC = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+제\d+호\s+채권최고액\s+근저당권자\s+금\s*([\d,\s]+)원\s+(?:김선희\s+)?((?:(?!김선희|\d+-?\d*\s+근저당권|\d+-?\d*\s+근질권|\d+\s+임차권|\[).)+?)(?=\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+근질권|\s+\d+\s+임차권|\s+\[|$)/gs;

      // Track mortgage transfers (근저당권이전)
      // Format variations:
      // "2-2 근저당권이전 2024년2월2일 제18453호 근저당권자 주식회사아라에이엠씨대부 김선회"
      // "4-1 근저당권이전 2024년2월2일 근저당권자 주식회사아라에이엠씨대부 김선회 제18453호"
      // "10-1 근저당권이전 2023년 12월 14일 근저당권자 제186638호 주식회사아라에이엠씨대부"
      const transferPattern = /(\d+)-\d+\s+근저당권이전\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?근저당권자\s+(?:제\d+호\s+)?(.*?(?:주식회사[\S가-힣]*|[\S가-힣]*(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너)[\S가-힣]*))/gs;
      const mortgageTransfers = new Map<number, string>(); // priority -> new creditor

      let transferMatch;
      while ((transferMatch = transferPattern.exec(summarySection)) !== null) {
        const [, priority, year, month, day, newCreditor] = transferMatch;
        const priorityNum = parseInt(priority);
        // Clean creditor: remove 김선회, 제XXX호, and extra whitespace
        const cleanCreditor = newCreditor.trim()
          .replace(/김선회/g, '')
          .replace(/제\d+호/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        mortgageTransfers.set(priorityNum, cleanCreditor);
        console.log(`Found mortgage transfer for #${priorityNum}: transferred to ${cleanCreditor}`);
      }

      // Extract with both patterns
      const processMatch = (priority: string, year: string, month: string, day: string, amount: string, ownerNames: string, creditor: string) => {
        const priorityNum = parseInt(priority);
        const maxSecuredAmount = parseInt(amount.replace(/,/g, ''));

        // Clean up creditor name
        // Remove all "김선회" owner names, 제XXX호, and extra whitespace
        let cleanCreditor = creditor.trim()
          .replace(/^근저당권자\s+/, '')
          .replace(/김선회/g, '') // Remove all occurrences
          .replace(/제\d+호/g, '') // Remove receipt numbers
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();

        // Check if this mortgage was transferred
        if (mortgageTransfers.has(priorityNum)) {
          cleanCreditor = mortgageTransfers.get(priorityNum)!;
          console.log(`Summary Mortgage #${priorityNum}: ₩${maxSecuredAmount.toLocaleString()} from ${cleanCreditor} (transferred)`);
        } else {
          console.log(`Summary Mortgage #${priorityNum}: ₩${maxSecuredAmount.toLocaleString()} from ${cleanCreditor}`);
        }

        mortgages.push({
          priority: priorityNum,
          type: '근저당권',
          creditor: cleanCreditor,
          maxSecuredAmount,
          estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          status: 'active'
        });
      };

      // Try Pattern A (채권최고액 근저당권자 금XXX원)
      let matchA;
      while ((matchA = patternA.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, creditor] = matchA;
        processMatch(priority, year, month, day, amount, '', creditor);
      }

      // Try Pattern B (채권최고액 금XXX원 근저당권자)
      let matchB;
      while ((matchB = patternB.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, creditor] = matchB;
        processMatch(priority, year, month, day, amount, '', creditor);
      }

      // Try Pattern C (제XXX호 채권최고액 근저당권자 금XXX원)
      let matchC;
      while ((matchC = patternC.exec(summarySection)) !== null) {
        const [, priority, year, month, day, amount, creditor] = matchC;
        processMatch(priority, year, month, day, amount, '', creditor);
      }

      if (mortgages.length > 0) {
        // Deduplicate by priority number (some entries may match multiple patterns)
        const uniqueMortgages = Array.from(
          new Map(mortgages.map(m => [m.priority, m])).values()
        ).sort((a, b) => a.priority - b.priority);

        console.log(`✅ Extracted ${uniqueMortgages.length} unique mortgages from summary section (${mortgages.length} total matches)`);

        // Classify seniority based on priority and creditor
        this.classifyMortgageSeniority(uniqueMortgages);

        console.log(`\n========== TOTAL MORTGAGES FOUND: ${uniqueMortgages.length} ==========\n`);
        return uniqueMortgages;
      }
    }

    console.log('Summary section not found or empty, falling back to 을구 section...');

    // FALLBACK: Extract from 을구 section
    // First, find all cancellations (말소) to track which mortgages are cancelled
    const cancellationPattern = /(\d+)번근저당권설정등?\s*기?말소/g;
    const cancelledNumbers = new Set<number>();

    let cancelMatch;
    while ((cancelMatch = cancellationPattern.exec(text)) !== null) {
      cancelledNumbers.add(parseInt(cancelMatch[1]));
      console.log(`Found cancellation for mortgage #${cancelMatch[1]}`);
    }

    // Look for 을구 section which contains mortgages
    const eulguMatch = text.match(/을\s*구\s*\(.*?(?=갑\s*구|병\s*구|주요\s*등기사항|$)/s);
    const eulguSection = eulguMatch ? eulguMatch[0] : text;

    console.log('\n========== EULGU SECTION (FALLBACK) ==========');
    console.log(eulguSection.substring(0, 500));
    console.log('========== END EULGU ==========\n');

    // Pattern to find each mortgage entry
    // Looks for: priority number + 근저당권설정 + date + receipt number + amount + creditor
    // Updated to handle both formats: "권리자: 은행" and "근저당권자 은행"
    const mortgagePattern = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,]+)원[^금]*?(?:근저당권자|권리자|채권자)\s+([가-힣\s]+(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|주식회사|유한회사|보험|카드|파트너)[^\d\n]{0,50}?)\s*(?:\d{6}|주민|$)/gs;

    let match;
    while ((match = mortgagePattern.exec(eulguSection)) !== null) {
      const [fullMatch, priority, year, month, day, amount, creditor] = match;
      const priorityNum = parseInt(priority);
      const maxSecuredAmount = parseInt(amount.replace(/,/g, ''));

      // Check if this mortgage is cancelled
      const isCancelled = cancelledNumbers.has(priorityNum);

      console.log(`Found Mortgage #${priorityNum}: ₩${maxSecuredAmount.toLocaleString()} from ${creditor.trim()} - ${isCancelled ? 'CANCELLED' : 'ACTIVE'}`);

      if (!isCancelled) {
        mortgages.push({
          priority: priorityNum,
          type: '근저당권',
          creditor: creditor.trim(),
          maxSecuredAmount,
          estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
          registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          status: 'active'
        });
      }
    }

    // Fallback: More flexible pattern if the above didn't work
    if (mortgages.length === 0) {
      console.log('Using fallback mortgage extraction pattern...');

      // Look for any 근저당권설정 with 채권최고액
      const fallbackPattern = /근저당권설정[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]{0,200}?채권최고액\s+금\s*([\d,]+)원[^금]{0,200}?(?:근저당권자|채권자)\s+([가-힣\s]+(?:은행|저축은행|캐피탈|금융|농협|신협|새마을금고|주식회사|유한회사|보험|카드)[^\d\n]{0,30})/gs;

      let fallbackMatch;
      let fallbackPriority = 1;

      while ((fallbackMatch = fallbackPattern.exec(eulguSection)) !== null) {
        const [fullMatch, year, month, day, amount, creditor] = fallbackMatch;
        const maxSecuredAmount = parseInt(amount.replace(/,/g, ''));

        // Check for 말소 in the immediate context
        const contextStart = Math.max(0, fallbackMatch.index - 100);
        const contextEnd = Math.min(eulguSection.length, fallbackMatch.index + fullMatch.length + 100);
        const context = eulguSection.substring(contextStart, contextEnd);
        const isCancelled = /말소/.test(context);

        console.log(`Fallback Mortgage #${fallbackPriority}: ₩${maxSecuredAmount.toLocaleString()} from ${creditor.trim()} - ${isCancelled ? 'CANCELLED' : 'ACTIVE'}`);

        if (!isCancelled) {
          mortgages.push({
            priority: fallbackPriority++,
            type: '근저당권',
            creditor: creditor.trim(),
            maxSecuredAmount,
            estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
            registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
            status: 'active'
          });
        }
      }
    }

    // Classify seniority for fallback mortgages too
    this.classifyMortgageSeniority(mortgages);

    console.log(`\n========== TOTAL MORTGAGES FOUND: ${mortgages.length} ==========\n`);
    return mortgages;
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

    // Track which creditors we've seen and how many times
    const creditorCount = new Map<string, number>();

    mortgages.forEach(mortgage => {
      const creditor = mortgage.creditor.trim();
      const currentCount = creditorCount.get(creditor) || 0;
      creditorCount.set(creditor, currentCount + 1);

      // Classify based on overall position and creditor appearance
      if (mortgage.priority === mortgages[0].priority) {
        // Absolute first mortgage is always senior
        mortgage.seniority = 'senior';
      } else if (currentCount === 0) {
        // First time seeing this creditor
        if (mortgage.priority <= 3) {
          mortgage.seniority = 'senior';
        } else {
          mortgage.seniority = 'subordinate';
        }
      } else if (currentCount === 1) {
        // Second time seeing this creditor = junior
        mortgage.seniority = 'junior';
      } else {
        // Third+ time = subordinate
        mortgage.seniority = 'subordinate';
      }

      console.log(`  Mortgage #${mortgage.priority} (${creditor}): ${mortgage.seniority?.toUpperCase()}`);
    });
  }

  private extractOwnership(text: string): OwnershipInfo[] {
    const owners: OwnershipInfo[] = [];

    // Pattern for ownership info
    const ownerPattern = /소유권이전.*?소유자\s*:?\s*([가-힣]+).*?(?:주민등록번호|주소).*?접수\s*:?\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?원인\s*:?\s*([^\n]+)/gs;

    let match;
    while ((match = ownerPattern.exec(text)) !== null) {
      const [_, name, year, month, day, method] = match;

      owners.push({
        ownerName: name.trim(),
        ownershipPercentage: 100, // Simplified - parse 지분 if present
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        acquisitionMethod: method.trim()
      });
    }

    // Return only most recent owner
    return owners.slice(-1);
  }

  private extractJeonseRights(text: string): JeonseRightInfo[] {
    const rights: JeonseRightInfo[] = [];

    // Look for 을구 section
    const eulguMatch = text.match(/을\s*구\s*\(.*?(?=갑\s*구|병\s*구|$)/s);
    const eulguSection = eulguMatch ? eulguMatch[0] : text;

    console.log('\n========== EXTRACTING JEONSE/LEASE RIGHTS ==========');

    // Pattern 1: 전세권설정 (Registered Jeonse Right)
    const jeonsePattern = /(\d+)\s+전세권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,]+)원[^금]*?전세권자\s+([가-힣\s]+)/gs;

    let match1;
    while ((match1 = jeonsePattern.exec(eulguSection)) !== null) {
      const [, priority, year, month, day, amount, tenant] = match1;
      console.log(`Found 전세권 #${priority}: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()} - tenant: ${tenant.trim()}`);

      rights.push({
        tenant: tenant.trim(),
        amount: parseInt(amount.replace(/,/g, '')),
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        type: '전세권'
      });
    }

    // Pattern 2: 임차권등기명령 (Court-Ordered Lease Right Registration)
    // This is when a tenant registers their lease after the landlord defaults
    const leaseRightPattern = /(\d+)\s+임차권등기명령\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?(?:임차인|신청인)\s+([가-힣\s]+)/gs;

    let match2;
    while ((match2 = leaseRightPattern.exec(eulguSection)) !== null) {
      const [, priority, year, month, day, tenant] = match2;
      console.log(`Found 임차권등기명령 #${priority} - tenant: ${tenant.trim()}`);

      // Try to find deposit amount nearby
      const context = eulguSection.substring(
        Math.max(0, match2.index - 200),
        Math.min(eulguSection.length, match2.index + 200)
      );
      const amountMatch = context.match(/보증금\s+금\s*([\d,]+)원/);
      const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : 0;

      rights.push({
        tenant: tenant.trim(),
        amount,
        registrationDate: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        type: '임차권등기'
      });
    }

    // Pattern 3: 근저당권설정등기권리자 containing 임차인 (some registries note tenant in mortgage creditor section)
    const tenantNotePattern = /임차인.*?([가-힣]{2,10})\s.*?보증금\s+금\s*([\d,]+)원/gs;

    let match3;
    while ((match3 = tenantNotePattern.exec(eulguSection)) !== null) {
      const [, tenant, amount] = match3;
      // Only add if not already captured
      const alreadyExists = rights.some(r => r.tenant === tenant.trim());

      if (!alreadyExists) {
        console.log(`Found tenant note: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()} - tenant: ${tenant.trim()}`);

        rights.push({
          tenant: tenant.trim(),
          amount: parseInt(amount.replace(/,/g, '')),
          registrationDate: '',
          type: '임차인 (기타)'
        });
      }
    }

    console.log(`========== TOTAL JEONSE/LEASE RIGHTS FOUND: ${rights.length} ==========\n`);
    return rights;
  }

  private checkForSeizure(text: string): boolean {
    // Look for 압류 but NOT 가압류
    return /(?<!가)압류/.test(text);
  }

  private checkForProvisionalSeizure(text: string): boolean {
    return /가압류/.test(text);
  }

  private checkForAuction(text: string): boolean {
    return /경매개시결정/.test(text);
  }

  private checkForSuperficies(text: string): boolean {
    return /지상권/.test(text);
  }

  private checkForEasement(text: string): boolean {
    return /지역권/.test(text);
  }

  private checkForProvisionalRegistration(text: string): boolean {
    return /가등기/.test(text);
  }

  private checkForProvisionalDisposition(text: string): boolean {
    return /가처분/.test(text);
  }

  private checkForAdvanceNotice(text: string): boolean {
    return /예고등기/.test(text);
  }

  private checkForUnregisteredLandRights(text: string): boolean {
    return /대지권미등기/.test(text);
  }

  private extractLiens(text: string): LienInfo[] {
    const liens: LienInfo[] = [];

    // Look for 을구 section which contains liens
    const eulguMatch = text.match(/을\s*구\s*\(.*?(?=갑\s*구|병\s*구|$)/s);
    const eulguSection = eulguMatch ? eulguMatch[0] : text;

    console.log('\n========== EXTRACTING LIENS ==========');

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
    const pattern1 = /\[집합건물\]\s*([^\[]+?)(?:\s+\[|$)/;
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
    const pattern1 = /전유부분의 건물의 표시.*?건물번호.*?철근콘크리트구조\s*([\d.]+)\s*m²/s;
    const match1 = text.match(pattern1);
    if (match1) {
      return parseFloat(match1[1]);
    }

    // Try pattern 2: Traditional format
    const pattern2 = /전유면적\s*:?\s*([\d.]+)\s*[㎡m²]/;
    const match2 = text.match(pattern2);
    if (match2) {
      return parseFloat(match2[1]);
    }

    return 0;
  }

  private extractLandArea(text: string): number | undefined {
    const landPattern = /대지면적\s*:?\s*([\d.]+)\s*㎡/;
    const match = text.match(landPattern);
    return match ? parseFloat(match[1]) : undefined;
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
