/**
 * Structured 등기부등본 Parser
 * Parses mortgages from structured table data (Form Parser output)
 * Much simpler than regex-based approach!
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

export class StructuredDeunggibuParser {
  /**
   * Parse mortgages from structured table data
   * Returns only active mortgages (Form Parser only shows active items in summary)
   */
  parseMortgages(tables: TableData[]): MortgageInfo[] {
    console.log('\n========== STRUCTURED MORTGAGE PARSING ==========');
    console.log(`Analyzing ${tables.length} tables from Form Parser`);

    // Find the mortgage table by looking for mortgage-related headers
    const mortgageTable = tables.find(table =>
      table.headers.some(h =>
        h.includes('근저당권') ||
        h.includes('저당권') ||
        h.includes('등기목적') ||
        h.includes('주요등기사항')
      )
    );

    if (!mortgageTable) {
      console.log('❌ No mortgage table found');
      console.log('Available tables:');
      tables.forEach((table, i) => {
        console.log(`  Table ${i + 1}: Headers = [${table.headers.join(', ')}]`);
      });
      return [];
    }

    console.log('✅ Found mortgage table');
    console.log(`Headers: [${mortgageTable.headers.join(', ')}]`);
    console.log(`Rows: ${mortgageTable.rows.length}`);

    const mortgages: MortgageInfo[] = [];

    // Parse each row
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
   * Parse a single table row into mortgage info
   */
  private parseRow(row: string[], headers: string[]): MortgageInfo | null {
    // Typical headers: ["순위번호", "등기목적", "접수정보", "주요등기사항", "대상소유자"]
    // But let's be flexible and find columns by content

    // Find column indices
    const priorityCol = this.findColumnIndex(row, headers, ['순위번호', '순위']);
    const typeCol = this.findColumnIndex(row, headers, ['등기목적', '목적']);
    const receiptCol = this.findColumnIndex(row, headers, ['접수정보', '접수']);
    const mainInfoCol = this.findColumnIndex(row, headers, ['주요등기사항', '등기사항']);
    const ownerCol = this.findColumnIndex(row, headers, ['대상소유자', '소유자']);

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
   * Find column index by header name or fallback to row content
   */
  private findColumnIndex(row: string[], headers: string[], candidates: string[]): number {
    // Try to find by header name
    for (const candidate of candidates) {
      const index = headers.findIndex(h => h.includes(candidate));
      if (index !== -1) return index;
    }

    // Fallback: guess by position (standard format)
    // [순위번호, 등기목적, 접수정보, 주요등기사항, 대상소유자]
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
   * Or: "채권최고액 금600,000,000원\n근저당권자 주식회사하나은행"
   */
  private parseMainInfo(mainInfo: string): { amount: number; creditor: string } {
    // Extract amount
    const amountMatch = mainInfo.match(/금\s*([\d,\s]+)\s*원/);
    const amount = amountMatch
      ? parseInt(amountMatch[1].replace(/[,\s]/g, ''))
      : 0;

    // Extract creditor
    const creditorMatch = mainInfo.match(/근저당권자\s+([^\s\n]+)/);
    let creditor = creditorMatch ? creditorMatch[1].trim() : '';

    // Clean up creditor name (remove trailing person names, etc.)
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

    console.log('\n' + '='.repeat(80) + '\n');
  }
}
