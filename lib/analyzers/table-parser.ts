/**
 * Table-based parser for 등기부등본 documents
 * Uses structured table data from Document AI instead of regex parsing
 */

interface TableCell {
  layout?: {
    textAnchor?: {
      textSegments?: Array<{ startIndex?: string; endIndex?: string }>;
    };
  };
}

interface TableRow {
  cells?: TableCell[];
}

interface DocumentTable {
  headerRows?: TableRow[];
  bodyRows?: TableRow[];
}

interface DocumentPage {
  tables?: DocumentTable[];
}

interface DocumentAIDocument {
  text?: string;
  pages?: DocumentPage[];
}

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

/**
 * Extract text from a table cell
 */
function extractCellText(cell: TableCell, documentText: string): string {
  if (!cell.layout?.textAnchor?.textSegments || !documentText) {
    return '';
  }

  const segment = cell.layout.textAnchor.textSegments[0];
  const startIdx = parseInt(segment.startIndex || '0');
  const endIdx = parseInt(segment.endIndex || '0');

  return documentText.substring(startIdx, endIdx).trim();
}

/**
 * Parse a table row into mortgage or jeonse entry
 */
function parseTableRow(
  cells: string[],
  documentText: string
): { type: 'mortgage' | 'jeonse' | 'unknown'; data: any } | null {
  // Expected format for summary table (3. (근)저당권 및 전세권 등):
  // [순위번호, 등기목적, 접수정보, 주요등기사항, 대상소유자]
  // OR
  // [순위번호, 등기목적, 날짜, 금액/주요사항]

  if (cells.length < 3) {
    return null;
  }

  const priorityText = cells[0];
  const typeText = cells[1];
  const contentText = cells.slice(2).join(' '); // Combine remaining cells

  // Extract priority number
  const priorityMatch = priorityText.match(/^(\d+)(?:-\d+)?/);
  if (!priorityMatch) {
    return null;
  }

  const priority = parseInt(priorityMatch[1]);

  // Check if it's a mortgage (근저당권)
  if (typeText.includes('근저당권설정')) {
    const dateMatch = contentText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    const amountMatch = contentText.match(/채권최고액\s+금\s*([\d,\s]+)원/);
    const creditorMatch = contentText.match(/근저당권자\s+([^\s]+(?:\s+[^\s]+)?)/);

    if (dateMatch && amountMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const amount = parseInt(amountMatch[1].replace(/[,\s]/g, ''));

      return {
        type: 'mortgage',
        data: {
          priority,
          type: '근저당권',
          maxSecuredAmount: amount,
          estimatedPrincipal: Math.floor(amount / 1.2),
          registrationDate: `${year}-${month}-${day}`,
          creditor: creditorMatch ? creditorMatch[1].trim() : undefined,
          status: 'active' as const,
        },
      };
    }
  }

  // Check if it's a jeonse (전세권설정 or 전세권변경)
  if (typeText.includes('전세권설정') || typeText.includes('전세권변경')) {
    const dateMatch = contentText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    const amountMatch = contentText.match(/전세금\s+금\s*([\d,\s]+)원/);
    const tenantMatch = contentText.match(/전세권자\s+([^\s]+(?:\s+[^\s]+)?)/);

    if (dateMatch && amountMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const amount = parseInt(amountMatch[1].replace(/[,\s]/g, ''));

      return {
        type: 'jeonse',
        data: {
          priority,
          amount,
          registrationDate: `${year}-${month}-${day}`,
          tenant: tenantMatch ? tenantMatch[1].trim() : undefined,
          type: typeText.includes('변경') ? '전세권변경' : '전세권',
        },
      };
    }
  }

  return null;
}

/**
 * Parse mortgages and jeonse rights from Document AI tables
 */
export function parseFromTables(document: DocumentAIDocument): {
  mortgages: MortgageEntry[];
  jeonseRights: JeonseEntry[];
  confidence: number;
} {
  console.log('\n========== PARSING FROM TABLES ==========');

  const mortgages: MortgageEntry[] = [];
  const jeonseMap = new Map<number, JeonseEntry>();
  let totalRows = 0;
  let parsedRows = 0;

  if (!document.pages || !document.text) {
    console.log('⚠️  No pages or text in document');
    return { mortgages: [], jeonseRights: [], confidence: 0 };
  }

  // Iterate through all pages and tables
  for (let pageIdx = 0; pageIdx < document.pages.length; pageIdx++) {
    const page = document.pages[pageIdx];
    const tables = page.tables || [];

    console.log(`\nPage ${pageIdx + 1}: ${tables.length} table(s)`);

    for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
      const table = tables[tableIdx];
      const bodyRows = table.bodyRows || [];

      console.log(`  Table ${tableIdx + 1}: ${bodyRows.length} rows`);

      for (const row of bodyRows) {
        const cells = row.cells || [];
        totalRows++;

        // Extract text from each cell
        const cellTexts = cells.map((cell) =>
          extractCellText(cell, document.text!)
        );

        // Skip empty rows or header-like rows
        if (cellTexts.every((text) => text.length === 0)) {
          continue;
        }

        // Try to parse the row
        const parsed = parseTableRow(cellTexts, document.text!);

        if (parsed) {
          parsedRows++;

          if (parsed.type === 'mortgage') {
            console.log(
              `    ✅ Mortgage #${parsed.data.priority}: ₩${parsed.data.maxSecuredAmount.toLocaleString()}`
            );
            mortgages.push(parsed.data);
          } else if (parsed.type === 'jeonse') {
            console.log(
              `    ✅ Jeonse #${parsed.data.priority}: ₩${parsed.data.amount.toLocaleString()}`
            );

            // Keep latest entry per priority (변경 overrides 설정)
            const existing = jeonseMap.get(parsed.data.priority);
            if (
              !existing ||
              parsed.data.registrationDate > existing.registrationDate
            ) {
              jeonseMap.set(parsed.data.priority, parsed.data);
            }
          }
        }
      }
    }
  }

  const jeonseRights = Array.from(jeonseMap.values());

  // Calculate confidence based on parsing success rate
  const confidence = totalRows > 0 ? parsedRows / totalRows : 0;

  console.log(`\n✅ Table parsing complete:`);
  console.log(`   - Mortgages: ${mortgages.length}`);
  console.log(`   - Jeonse: ${jeonseRights.length}`);
  console.log(`   - Confidence: ${(confidence * 100).toFixed(1)}% (${parsedRows}/${totalRows} rows parsed)`);

  return {
    mortgages,
    jeonseRights,
    confidence,
  };
}
