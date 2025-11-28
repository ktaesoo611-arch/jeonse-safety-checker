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
  }

  /**
   * Extract full structured document data from PDF using Document AI
   * Returns the complete Document AI response including tables, text, and layout
   */
  async extractStructuredDocument(buffer: Buffer): Promise<any> {
    try {
      console.log('Using Google Document AI for structured extraction...');

      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

      const [result] = await this.client.processDocument({
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
        imagelessMode: true,
      });

      console.log('Document AI extraction successful');
      console.log(`- Text: ${result.document?.text?.length || 0} chars`);
      console.log(`- Pages: ${result.document?.pages?.length || 0}`);
      console.log(`- Tables: ${result.document?.pages?.reduce((sum, p) => sum + (p.tables?.length || 0), 0) || 0}`);

      return result.document;
    } catch (error) {
      console.error('Document AI structured extraction failed:', error);
      throw error;
    }
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
      // Use imageless mode to support documents up to 30 pages (instead of 15-page limit)
      const requestConfig = {
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
        imagelessMode: true, // Enable imageless mode for 30-page limit (instead of 15)
      };

      console.log('=== Document AI Request Debug ===');
      console.log('Processor name:', name);
      console.log('Buffer size:', buffer.length, 'bytes');
      console.log('imagelessMode:', requestConfig.imagelessMode);
      console.log('=================================');

      const [result] = await this.client.processDocument(requestConfig);

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
