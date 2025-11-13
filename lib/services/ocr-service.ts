/**
 * OCR Service for extracting text from PDF documents
 * Uses Google Cloud Document AI for Korean document OCR
 */

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export class OCRService {
  private client: DocumentProcessorServiceClient;
  private projectId: string;
  private location: string = 'us'; // Document AI location
  private processorId: string;

  constructor() {
    // Initialize Google Document AI client with service account credentials
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'jeonse-safety-checker';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || 'OCR_PROCESSOR';

    // Document AI requires service account credentials (API keys are not supported)
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials/google-documentai.json';

    this.client = new DocumentProcessorServiceClient({
      keyFilename: credentialsPath
    });
  }

  /**
   * Extract text from PDF using Document AI
   * Document AI is specifically designed for document OCR and accepts PDFs directly
   */
  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Try 1: Simple text extraction using pdf2json (fast for text-based PDFs)
      console.log('Attempting simple text extraction from PDF...');
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser();

      const textPromise = new Promise<string>((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          const rawText = pdfParser.getRawTextContent();
          resolve(rawText);
        });
        pdfParser.parseBuffer(buffer);
      });

      const extractedText = await Promise.race([
        textPromise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('PDF parsing timeout')), 10000))
      ]);

      if (extractedText && extractedText.length > 100) {
        console.log('Simple text extraction successful:', extractedText.length, 'characters');
        return extractedText;
      }

      console.log('PDF appears to be image-based, trying Document AI OCR...');

      // Try 2: Google Document AI - accepts PDF directly!
      console.log('Using Google Document AI for OCR (sending PDF directly)...');

      // Construct the full processor name
      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

      // Process the PDF document
      const [result] = await this.client.processDocument({
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      });

      const fullText = result.document?.text || '';

      if (!fullText || fullText.length < 50) {
        console.warn('Document AI returned minimal text:', fullText.length, 'characters');
        throw new Error('Document AI returned insufficient text');
      }

      console.log('Document AI OCR extraction successful:', fullText.length, 'characters');
      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text with Korean language optimization
   */
  async extractKoreanText(buffer: Buffer): Promise<string> {
    try {
      return await this.extractTextFromPDF(buffer);
    } catch (error) {
      console.error('Korean OCR failed:', error);
      return '';
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService();
