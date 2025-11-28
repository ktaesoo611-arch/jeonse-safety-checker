// NEW STRUCTURED PARSING APPROACH for extractMortgages()
// This file contains the new implementation to replace the regex-based approach in deunggibu-parser.ts

/**
 * STEP 1: Extract base mortgage registrations using structured parsing
 * Handles multiple OCR format variations for field order
 */
function extractBaseMortgages(summarySection: string, mortgagesMap: Map<number, any>): void {
  // Pattern 1: 채권최고액 + 근저당권자 + 금XXX원 (keyword BEFORE amount)
  // Format: "11 근저당권설정 2015년 6월3일 제48831호 채권최고액 근저당권자 금275,000,000원 주식회사우리은행"
  const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+근저당권자\s+금\s*([\d,\s]+)원\s+((?:(?!채무자|대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

  // Pattern 2: 채권최고액 + 금XXX원... 근저당권자 (keyword AFTER amount)
  // Format: "16 근저당권설정 2021년3월22일 채권최고액 금260,000,000원 제64748호 근저당권자 이명원"
  // Format: "2 근저당권설정 2013년8월29일 제29777호 채권최고액 금288,000,000원 근저당권자 황정문"
  const pattern2 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

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

    mortgagesMap.set(priority, {
      priority,
      type: '근저당권',
      creditor,
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

    mortgagesMap.set(priority, {
      priority,
      type: '근저당권',
      creditor,
      maxSecuredAmount,
      estimatedPrincipal: Math.floor(maxSecuredAmount / 1.2),
      registrationDate,
      status: 'active'
    });

    console.log(`  ✅ Mortgage #${priority}: ₩${maxSecuredAmount.toLocaleString()} from "${creditor}" (${registrationDate})`);
  }
}

/**
 * STEP 2: Apply mortgage amendments (근저당권변경) - update amounts
 * Format: "16-1 근저당권변경 2023년11월9일 ... 채권최고액 금260,000,000원"
 */
function applyMortgageAmendments(summarySection: string, mortgagesMap: Map<number, any>): void {
  const amendmentPattern = /(\d+)-\d+\s+근저당권변경\s+\d{4}년\s*\d{1,2}월\s*\d{1,2}일.*?채권최고액\s+금\s*([\d,\s]+)원/gs;

  let match;
  while ((match = amendmentPattern.exec(summarySection)) !== null) {
    const [, priorityStr, amountStr] = match;
    const priority = parseInt(priorityStr);
    const newAmount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));

    const mortgage = mortgagesMap.get(priority);
    if (mortgage) {
      const oldAmount = mortgage.maxSecuredAmount;
      mortgage.maxSecuredAmount = newAmount;
      mortgage.estimatedPrincipal = Math.floor(newAmount / 1.2);
      console.log(`  ✅ Updated mortgage #${priority} amount: ₩${oldAmount.toLocaleString()} → ₩${newAmount.toLocaleString()}`);
    } else {
      console.log(`  ⚠️  Amendment for mortgage #${priority} but no base registration found`);
    }
  }
}

/**
 * STEP 3: Apply mortgage transfers (근저당권이전) - update creditors
 * Format: "16-1 근저당권이전 2023년11월9일 ... 근저당권자 김윤주"
 */
function applyMortgageTransfers(summarySection: string, mortgagesMap: Map<number, any>): void {
  // Pattern: 16-1 근저당권이전 ... 근저당권자 [new creditor name]
  // STOP at: owner names, receipt numbers, next entry
  const transferPattern = /(\d+)-\d+\s+근저당권이전\s+\d{4}년\s*\d{1,2}월\s*\d{1,2}일[^근]*?근저당권자\s+((?:(?!채무자|제\d+호|대상소유자|\d+\s+근저당권|\d+\s+질권|\d+\s+전세권).)+?)(?=\s+채무자|\s+제\d+호|\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+질권|\s+\d+\s+전세권|$)/gs;

  let match;
  while ((match = transferPattern.exec(summarySection)) !== null) {
    const [, priorityStr, creditorStr] = match;
    const priority = parseInt(priorityStr);
    const newCreditor = creditorStr
      .replace(/제\d+호/g, '') // Remove receipt numbers
      .replace(/\s+/g, ' ')
      .trim();

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
function detectInlineTransfers(mortgagesMap: Map<number, any>): void {
  // Common owner names to stop at (to prevent capturing them as creditors)
  const commonOwnerNames = ['민응호', '김선회', '진동성', '박진경', '배미정', '현지혜', '황보용식'];

  for (const [priority, mortgage] of mortgagesMap.entries()) {
    const creditor = mortgage.creditor;

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
 * NEW IMPLEMENTATION: Extract mortgages using structured parsing
 * This replaces the complex regex-based approach
 */
export function extractMortgagesStructured(text: string): any[] {
  console.log('\n========== EXTRACTING MORTGAGES (STRUCTURED PARSING) ==========');

  // PRIORITY: Extract from "주요 등기사항 요약 (참고용)" summary section
  // This section ONLY lists ACTIVE items (cancelled mortgages are NOT included)
  // Format: "3. (근)저당권 및 전세권 등 ( 을구 )"
  const summaryMatch = text.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:11\s+임차권설정|\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s);

  if (!summaryMatch) {
    console.log('⚠️  Summary section not found, cannot extract mortgages reliably');
    return [];
  }

  console.log('Found summary section (3. (근)저당권 및 전세권 등) - extracting active mortgages only');
  const summarySection = summaryMatch[1];
  console.log(`📝 Summary section (first 800 chars): "${summarySection.substring(0, 800)}"`);

  // Map to store mortgages by priority number
  const mortgagesMap = new Map<number, any>();

  // STEP 1: Extract base mortgage registrations (근저당권설정)
  console.log('\n--- STEP 1: Extract base mortgage registrations ---');
  extractBaseMortgages(summarySection, mortgagesMap);

  // STEP 2: Apply amendments (근저당권변경) - update amounts
  console.log('\n--- STEP 2: Apply mortgage amendments ---');
  applyMortgageAmendments(summarySection, mortgagesMap);

  // STEP 3: Apply transfers (근저당권이전) - update creditors
  console.log('\n--- STEP 3: Apply mortgage transfers ---');
  applyMortgageTransfers(summarySection, mortgagesMap);

  // STEP 4: Extract inline transfers (e.g., "이명원 2023년11월9일 근저당권자 김윤주")
  console.log('\n--- STEP 4: Detect inline transfers in creditor names ---');
  detectInlineTransfers(mortgagesMap);

  // Convert to array and sort by priority
  const mortgages = Array.from(mortgagesMap.values()).sort((a, b) => a.priority - b.priority);

  console.log(`\n✅ Extracted ${mortgages.length} unique mortgages from summary section`);
  console.log(`\n========== TOTAL MORTGAGES FOUND: ${mortgages.length} ==========\n`);

  return mortgages;
}
