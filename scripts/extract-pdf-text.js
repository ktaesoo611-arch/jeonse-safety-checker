const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = 'test/registry_report/청계한신휴플러스 108동 2003호_registry.pdf';

async function extractPDF() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse();
  const data = await parser.parse(dataBuffer);

  console.log('PDF Text Length:', data.text.length);
  console.log('\n==================== FULL TEXT ====================\n');
  console.log(data.text);
  console.log('\n==================================================\n');

  // Save to file for easier analysis
  fs.writeFileSync('extracted-text.txt', data.text);
  console.log('✅ Text saved to extracted-text.txt');
}

extractPDF().catch(console.error);
