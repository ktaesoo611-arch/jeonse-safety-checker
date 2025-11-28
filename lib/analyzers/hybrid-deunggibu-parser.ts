/**
 * Hybrid 등기부등본 Parser
 * Combines OCR text analysis with Form Parser table extraction
 *
 * Strategy:
 * 1. Use OCR to find "3. (근)저당권 및 전세권 등" summary section
 * 2. Use Form Parser to extract tables from that section
 * 3. Parse mortgages from structured table data (no regex!)
 */

import { TableData } from '../services/ocr-service-enhanced';

export interface MortgageInfo {
  priority: number;
  type: string;
  registrationDate: string;
  receiptNumber: string;
  maxSecuredAmount: number;
  estimatedPrincipal: number;
  creditor: string;
  debtor?: string;
  status: 'active';
}

export class HybridDeunggibuParser {
  /**
   * Parse mortgages using hybrid approach:
   * - Use OCR text to find summary section
   * - Use Form Parser tables for structured data
   */
  parseMortgages(ocrText: string, allTables: TableData[]): MortgageInfo[] {
    console.log('\n========== HYBRID MORTGAGE PARSING ==========');
    console.log('Step 1: Find summary section in OCR text');

    // Find the summary section in OCR text
    const summaryMatch = ocrText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등.*?(?=\n\s*\[?\s*참\s*고\s*사\s*항\s*\]?\s*\n|가\.\s*등기기록에서|출력일시|$)/s);

    if (!summaryMatch) {
      console.log('❌ Summary section "3. (근)저당권 및 전세권 등" not found in OCR text');
      return [];
    }

    const summaryText = summaryMatch[0];
    console.log(`✅ Found summary section (${summaryText.length} chars)`);
    console.log(`Preview: "${summaryText.substring(0, 200)}..."`);

    // Step 2: Find tables that match the summary section structure
    console.log('\nStep 2: Find matching table in Form Parser output');

    const mortgageTable = this.findSummaryTable(allTables, summaryText);

    if (!mortgageTable) {
      console.log('❌ No matching table found in Form Parser output');
      console.log('Available tables:');
      allTables.forEach((table, i) => {
        console.log(`  Table ${i + 1}: ${table.headers.length} cols, ${table.rows.length} rows`);
        console.log(`    Headers: [${table.headers.join(', ')}]`);
      });
      return [];
    }

    console.log('✅ Found matching summary table');
    console.log(`Headers: [${mortgageTable.headers.join(', ')}]`);
    console.log(`Rows: ${mortgageTable.rows.length}`);

    // Step 3: Parse mortgages from structured table
    console.log('\nStep 3: Parse mortgages from table structure');
    const mortgages: MortgageInfo[] = [];

    mortgageTable.rows.forEach((row, rowIndex) => {
      try {
        const mortgage = this.parseRow(row, mortgageTable.headers);

        if (mortgage) {
          mortgages.push(mortgage);
          console.log(`✅ Row ${rowIndex + 1}: Mortgage #${mortgage.priority} - ₩${mortgage.maxSecuredAmount.toLocaleString()} from ${mortgage.creditor}`);
        } else {
          console.log(`⏭️  Row ${rowIndex + 1}: Skipped (not a mortgage registration)`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Row ${rowIndex + 1}: Parse error - ${error.message}`);
      }
    });

    console.log(`\n========== TOTAL: ${mortgages.length} MORTGAGES ==========\n`);
    return mortgages;
  }

  /**
   * Find the summary table by matching against summary text content
   */
  private findSummaryTable(tables: TableData[], summaryText: string): TableData | null {
    // Look for a table with headers typical of summary section
    const candidateTables = tables.filter(table => {
      const headers = table.headers.join(' ').toLowerCase();

      // Summary table typically has these headers:
      // 등기목적, 접수정보/접수, 주요등기사항, 대상소유자
      // Note: 순위번호 may be missing in some tables
      const hasEssentialHeaders =
        (headers.includes('등기목적') || headers.includes('목적')) &&
        (headers.includes('접수') || headers.includes('접수정보')) &&
        (headers.includes('주요등기사항') || headers.includes('등기사항') || headers.includes('주요'));

      return hasEssentialHeaders;
    });

    if (candidateTables.length === 0) {
      return null;
    }

    // If multiple candidates, try to match content
    if (candidateTables.length === 1) {
      return candidateTables[0];
    }

    // Find the table whose content best matches the summary text
    let bestMatch: TableData | null = null;
    let maxMatches = 0;

    for (const table of candidateTables) {
      let matches = 0;

      // Count how many row cells appear in the summary text
      for (const row of table.rows) {
        for (const cell of row) {
          if (cell.length > 5 && summaryText.includes(cell.substring(0, 20))) {
            matches++;
          }
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = table;
      }
    }

    return bestMatch;
  }

  /**
   * Parse a single table row into mortgage info
   */
  private parseRow(row: string[], headers: string[]): MortgageInfo | null {
    // Find column indices
    const priorityCol = this.findColumnIndex(headers, ['순위번호', '순위']);
    const typeCol = this.findColumnIndex(headers, ['등기목적', '목적']);
    const receiptCol = this.findColumnIndex(headers, ['접수정보', '접수']);
    const mainInfoCol = this.findColumnIndex(headers, ['주요등기사항', '등기사항', '주요']);
    const ownerCol = this.findColumnIndex(headers, ['대상소유자', '소유자']);

    // Extract basic fields
    const priorityStr = row[priorityCol] || '';
    const type = row[typeCol] || '';

    // Only process mortgage registrations
    if (!type.includes('근저당권설정')) {
      return null;
    }

    const priority = parseInt(priorityStr) || 0;

    // Extract registration date and receipt number from receipt info
    const receiptInfo = row[receiptCol] || '';
    const { date, receiptNumber } = this.parseReceiptInfo(receiptInfo);

    // Extract amount and creditor from main info
    const mainInfo = row[mainInfoCol] || '';
    const { amount, creditor } = this.parseMainInfo(mainInfo);

    // Extract owner/debtor
    const debtor = row[ownerCol] || undefined;

    return {
      priority,
      type: '근저당권',
      registrationDate: date,
      receiptNumber,
      maxSecuredAmount: amount,
      estimatedPrincipal: Math.floor(amount / 1.2),
      creditor,
      debtor,
      status: 'active'
    };
  }

  /**
   * Find column index by header candidates
   */
  private findColumnIndex(headers: string[], candidates: string[]): number {
    for (const candidate of candidates) {
      const index = headers.findIndex(h => h.includes(candidate));
      if (index !== -1) return index;
    }

    // Fallback: guess by standard order
    const standardOrder = ['순위', '등기목적', '접수', '주요', '소유자'];
    const candidatePos = standardOrder.findIndex(s =>
      candidates.some(c => c.includes(s))
    );

    return candidatePos !== -1 ? candidatePos : 0;
  }

  /**
   * Parse receipt info to extract date and receipt number
   * Format: "2017년12월14일 제211724호" or "2017년12월14일\n제211724호"
   */
  private parseReceiptInfo(receiptInfo: string): { date: string; receiptNumber: string } {
    // Extract date
    const dateMatch = receiptInfo.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    const date = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : '';

    // Extract receipt number
    const receiptMatch = receiptInfo.match(/제\s*(\d+)\s*호/);
    const receiptNumber = receiptMatch ? receiptMatch[1] : '';

    return { date, receiptNumber };
  }

  /**
   * Parse main info to extract amount and creditor
   * Format: "채권최고액 금600,000,000원 근저당권자 주식회사하나은행"
   */
  private parseMainInfo(mainInfo: string): { amount: number; creditor: string } {
    // Extract amount
    const amountMatch = mainInfo.match(/금\s*([\d,\s]+)\s*원/);
    const amount = amountMatch
      ? parseInt(amountMatch[1].replace(/[,\s]/g, ''))
      : 0;

    // Extract creditor
    // Match everything after "근저당권자" until we hit special markers or end of string
    const creditorMatch = mainInfo.match(/근저당권자\s+(.+?)(?:\s+채무자|\s+소유자|\s*$)/);
    let creditor = creditorMatch ? creditorMatch[1].trim() : '';

    // Clean up creditor name
    creditor = this.cleanCreditorName(creditor);

    return { amount, creditor };
  }

  /**
   * Clean up creditor name
   */
  private cleanCreditorName(creditor: string): string {
    // Remove common suffixes
    creditor = creditor.replace(/\s*제\d+호\s*/g, '').trim();

    // If creditor contains bank/company keywords, it's likely correct
    if (/은행|주식회사|농업협동조합|저축은행|캐피탈|금융|대부|보험|공사/.test(creditor)) {
      return creditor;
    }

    return creditor;
  }

  /**
   * Debug: Print parsed mortgages
   */
  debugPrintMortgages(mortgages: MortgageInfo[]): void {
    console.log('\n========== PARSED MORTGAGES ==========');

    mortgages.forEach((m, i) => {
      console.log(`\n${i + 1}. Mortgage #${m.priority}`);
      console.log(`   Type: ${m.type}`);
      console.log(`   Date: ${m.registrationDate}`);
      console.log(`   Receipt: ${m.receiptNumber}`);
      console.log(`   Amount: ₩${m.maxSecuredAmount.toLocaleString()}`);
      console.log(`   Principal: ₩${m.estimatedPrincipal.toLocaleString()}`);
      console.log(`   Creditor: ${m.creditor}`);
      if (m.debtor) {
        console.log(`   Debtor: ${m.debtor}`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\\n');
  }
}
