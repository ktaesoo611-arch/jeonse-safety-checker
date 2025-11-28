/**
 * Enhanced OCR Service using Document AI Form Parser
 * Extracts structured data (tables, forms) from PDF documents
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export interface TableCell {
  text: string;
  rowIndex: number;
  colIndex: number;
  confidence: number;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface StructuredDocumentData {
  text: string;
  tables: TableData[];
  formFields: Record<string, string>;
}

export class EnhancedOCRService {
  private client: DocumentProcessorServiceClient;
  private projectId: string;
  private location: string = 'us';
  private processorId: string;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'jeonse-safety-checker';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || '';

    // Support both file path (local dev) and JSON string (Vercel deployment)
    const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    let clientConfig: any = {};

    if (credentialsEnv) {
      // Check if it's a JSON string or file path
      if (credentialsEnv.startsWith('{')) {
        // It's a JSON string - parse and use as credentials object
        try {
          clientConfig.credentials = JSON.parse(credentialsEnv);
        } catch (error) {
          console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS as JSON:', error);
          throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS JSON format');
        }
      } else {
        // It's a file path
        clientConfig.keyFilename = credentialsEnv;
      }
    } else {
      // Fallback to local credentials file
      clientConfig.keyFilename = './credentials/google-documentai.json';
    }

    this.client = new DocumentProcessorServiceClient(clientConfig);

    console.log(`[EnhancedOCR] Initialized with processor: ${this.processorId}`);
  }

  /**
   * Extract structured data from PDF using Form Parser
   */
  async extractStructuredData(buffer: Buffer): Promise<StructuredDocumentData> {
    console.log('[EnhancedOCR] Starting structured extraction with Form Parser...');

    const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

    try {
      const [result] = await this.client.processDocument({
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      });

      const document = result.document;
      if (!document) {
        throw new Error('No document returned from Form Parser');
      }

      const fullText = document.text || '';
      console.log(`[EnhancedOCR] Extracted ${fullText.length} characters of text`);

      // Extract tables
      const tables = this.extractTables(document);
      console.log(`[EnhancedOCR] Extracted ${tables.length} tables`);

      // Extract form fields
      const formFields = this.extractFormFields(document);
      console.log(`[EnhancedOCR] Extracted ${Object.keys(formFields).length} form fields`);

      return {
        text: fullText,
        tables,
        formFields
      };

    } catch (error: any) {
      console.error('[EnhancedOCR] Error during extraction:', error.message);
      throw new Error(`Form Parser extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract all tables from document
   */
  private extractTables(document: any): TableData[] {
    const tables: TableData[] = [];

    if (!document.pages) {
      console.warn('[EnhancedOCR] No pages found in document');
      return tables;
    }

    document.pages.forEach((page: any, pageIndex: number) => {
      if (!page.tables || page.tables.length === 0) {
        return;
      }

      console.log(`[EnhancedOCR] Page ${pageIndex + 1}: Found ${page.tables.length} tables`);

      page.tables.forEach((table: any, tableIndex: number) => {
        const tableData = this.parseTable(table, document.text);
        tables.push(tableData);

        console.log(`[EnhancedOCR]   Table ${tableIndex + 1}: ${tableData.headers.length} columns, ${tableData.rows.length} rows`);
      });
    });

    return tables;
  }

  /**
   * Parse a single table into structured data
   */
  private parseTable(table: any, fullText: string): TableData {
    const headers: string[] = [];

    // Extract header rows
    if (table.headerRows && table.headerRows.length > 0) {
      // Use first header row
      table.headerRows[0].cells.forEach((cell: any) => {
        const text = this.extractTextFromSegments(cell.layout?.textAnchor, fullText);
        headers.push(text.trim());
      });
    }

    // Extract body rows
    const rows: string[][] = [];
    if (table.bodyRows) {
      table.bodyRows.forEach((row: any) => {
        const rowData: string[] = [];
        row.cells.forEach((cell: any) => {
          const text = this.extractTextFromSegments(cell.layout?.textAnchor, fullText);
          rowData.push(text.trim());
        });
        rows.push(rowData);
      });
    }

    return { headers, rows };
  }

  /**
   * Extract text from text anchor segments
   */
  private extractTextFromSegments(textAnchor: any, fullText: string): string {
    if (!textAnchor || !textAnchor.textSegments) {
      return '';
    }

    let text = '';
    textAnchor.textSegments.forEach((segment: any) => {
      const startIndex = parseInt(segment.startIndex || '0');
      const endIndex = parseInt(segment.endIndex || '0');
      text += fullText.substring(startIndex, endIndex);
    });

    return text;
  }

  /**
   * Extract form fields (key-value pairs) from document
   */
  private extractFormFields(document: any): Record<string, string> {
    const fields: Record<string, string> = {};

    if (!document.pages) {
      return fields;
    }

    document.pages.forEach((page: any) => {
      if (!page.formFields) {
        return;
      }

      page.formFields.forEach((field: any) => {
        const fieldName = this.extractTextFromSegments(
          field.fieldName?.textAnchor,
          document.text
        ).trim();

        const fieldValue = this.extractTextFromSegments(
          field.fieldValue?.textAnchor,
          document.text
        ).trim();

        if (fieldName) {
          fields[fieldName] = fieldValue;
        }
      });
    });

    return fields;
  }

  /**
   * Debug: Print table structure
   */
  debugPrintTable(table: TableData, tableName: string = 'Table'): void {
    console.log(`\n========== ${tableName} ==========`);
    console.log('Headers:', table.headers.join(' | '));
    console.log('-'.repeat(80));

    table.rows.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row.join(' | '));
    });

    console.log('='.repeat(80) + '\n');
  }
}
