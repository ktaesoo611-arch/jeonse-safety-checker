/**
 * Inspect the full Document AI response to see available structured data
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
const location = process.env.DOCUMENT_AI_LOCATION!;
const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID!;

const client = new DocumentProcessorServiceClient({
  keyFilename: './credentials/google-vision.json',
});

async function inspectDocumentAI() {
  // Use a test PDF - you can change this path to your 반포자이 PDF
  const pdfPath = 'C:\\Users\\Lenovo\\Downloads\\banpo.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found at:', pdfPath);
    console.log('Please update the pdfPath in the script to point to your test PDF');
    return;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  console.log('Processing document with Document AI...\n');

  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    },
    imagelessMode: true,
  });

  const document = result.document;

  console.log('=== DOCUMENT AI RESPONSE STRUCTURE ===\n');

  // 1. Basic text
  console.log('1. TEXT LENGTH:', document?.text?.length || 0, 'characters');

  // 2. Pages
  console.log('\n2. PAGES:', document?.pages?.length || 0);
  if (document?.pages && document.pages.length > 0) {
    const firstPage = document.pages[0];
    console.log('   First page has:');
    console.log('   - Blocks:', firstPage.blocks?.length || 0);
    console.log('   - Paragraphs:', firstPage.paragraphs?.length || 0);
    console.log('   - Lines:', firstPage.lines?.length || 0);
    console.log('   - Tokens:', firstPage.tokens?.length || 0);
    console.log('   - Tables:', firstPage.tables?.length || 0);
  }

  // 3. Tables (THIS IS WHAT WE WANT!)
  console.log('\n3. TABLES:');
  if (document?.pages) {
    for (let pageIdx = 0; pageIdx < document.pages.length; pageIdx++) {
      const page = document.pages[pageIdx];
      const tables = page.tables || [];

      console.log(`\n   Page ${pageIdx + 1}: ${tables.length} table(s)`);

      for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
        const table = tables[tableIdx];
        const headerRows = table.headerRows?.length || 0;
        const bodyRows = table.bodyRows?.length || 0;

        console.log(`\n   Table ${tableIdx + 1}:`);
        console.log(`   - Header rows: ${headerRows}`);
        console.log(`   - Body rows: ${bodyRows}`);

        // Show first few rows
        if (bodyRows > 0) {
          console.log('\n   First 3 body rows:');
          const rowsToShow = Math.min(3, bodyRows);

          for (let i = 0; i < rowsToShow; i++) {
            const row = table.bodyRows![i];
            const cells = row.cells || [];
            const cellTexts = cells.map(cell => {
              const layout = cell.layout;
              if (!layout?.textAnchor?.textSegments) return '';

              const segment = layout.textAnchor.textSegments[0];
              const startIdx = parseInt(segment.startIndex || '0');
              const endIdx = parseInt(segment.endIndex || '0');
              return document!.text!.substring(startIdx, endIdx).trim();
            });

            console.log(`   Row ${i + 1}: [${cellTexts.join(' | ')}]`);
          }
        }
      }
    }
  }

  // 4. Entities (if any)
  console.log('\n4. ENTITIES:', document?.entities?.length || 0);
  if (document?.entities && document.entities.length > 0) {
    console.log('   First 5 entities:');
    document.entities.slice(0, 5).forEach((entity, idx) => {
      console.log(`   ${idx + 1}. Type: ${entity.type}, Mention: ${entity.mentionText}`);
    });
  }

  // Save full response for inspection
  const outputPath = 'C:\\Projects\\jeonse-safety-checker\\scripts\\document-ai-full-response.json';
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        textLength: document?.text?.length,
        pageCount: document?.pages?.length,
        tablesPerPage: document?.pages?.map((p, i) => ({
          page: i + 1,
          tableCount: p.tables?.length || 0,
        })),
        // Include first page's first table structure (if exists)
        sampleTable: document?.pages?.[0]?.tables?.[0] ? {
          headerRowCount: document.pages[0].tables[0].headerRows?.length,
          bodyRowCount: document.pages[0].tables[0].bodyRows?.length,
          firstBodyRow: document.pages[0].tables[0].bodyRows?.[0],
        } : null,
      },
      null,
      2
    )
  );

  console.log(`\n\n✅ Full response structure saved to: ${outputPath}`);
  console.log('\n=== SUMMARY ===');
  console.log(`Tables found: ${document?.pages?.reduce((sum, p) => sum + (p.tables?.length || 0), 0) || 0}`);
  console.log('If tables > 0, we can use structured table parsing!');
  console.log('If tables = 0, Document AI did not detect tables (we\'ll need to use text parsing)');
}

inspectDocumentAI().catch(console.error);
