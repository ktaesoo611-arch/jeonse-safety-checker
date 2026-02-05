/**
 * Apick API Client for 등기부등본 (Property Registry) lookups
 *
 * API Documentation: https://apick.app/dev_guide/iros1
 *
 * Flow:
 * 1. Request 등기부등본 열람 with address → get ic_id
 * 2. Wait ~20-30 seconds for document generation
 * 3. Download document with ic_id (supports PDF or Excel format)
 *
 * Cost: 800 points per document (열람 + 다운로드)
 * Note: Use format='pdf' for Google Document AI compatibility
 */

import axios from 'axios';

const APICK_BASE_URL = 'https://apick.app/rest';

// Default format: PDF for Google Document AI compatibility
export const DEFAULT_DOWNLOAD_FORMAT: 'pdf' | 'excel' = 'pdf';

export interface ApickRegistryRequestResponse {
  data: {
    ic_id?: number;
    success: 0 | 1 | 3; // 1=success, 0=failed, 3=timeout
    error?: string;     // Error message when success=0
    type?: string;      // Document type
    result?: number;    // Result code
  };
  api: {
    success: boolean;
    cost: number;
    ms: number;
    pl_id?: number;
  };
}

export interface ApickRegistryDownloadResponse {
  success: boolean;
  result: 1 | 2; // 1=completed, 2=processing
  cost: number;
  ms: number;
  fileBuffer?: Buffer;
  format?: 'pdf' | 'excel';
  error?: string;
}

export interface RegistryLookupResult {
  success: boolean;
  fileBuffer?: Buffer;
  format?: 'pdf' | 'excel';
  ic_id?: number;
  cost?: number;
  error?: string;
}

export class ApickAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APICK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Apick] No API key configured');
    }
  }

  /**
   * Step 1: Request 등기부등본 lookup
   * This initiates the request and returns an ic_id for downloading
   *
   * @param address - Property address (e.g., "서울시 강남구 역삼동 123-45 ○○아파트 101동 1001호")
   * @param type - Document type: "토지" (land), "집합건물" (multi-unit), "건물" (building)
   */
  async requestRegistry(
    address: string,
    type: '토지' | '집합건물' | '건물' = '집합건물'
  ): Promise<{ success: boolean; ic_id?: number; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Apick API key not configured' };
    }

    try {
      // Sanitize address: keep only allowed characters
      // Apick API allows: Korean, numbers, alphabet, hyphens (-), spaces
      // Remove parentheses and other special characters, but keep spaces for address parsing
      const sanitizedAddress = address.replace(/[^가-힣a-zA-Z0-9\-\s]/g, '').trim();
      console.log(`[Apick] Requesting registry for: ${address} -> sanitized: ${sanitizedAddress}`);

      // Use URLSearchParams for form-urlencoded data (works in Node.js)
      const params = new URLSearchParams();
      params.append('address', sanitizedAddress);
      params.append('type', type);

      const response = await axios.post<ApickRegistryRequestResponse>(
        `${APICK_BASE_URL}/iros/1`,
        params.toString(),
        {
          headers: {
            'CL_AUTH_KEY': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 120000, // 120 second timeout (Apick can take 60-90s)
          // Apick API returns 401 even for valid responses when no results found
          validateStatus: (status) => status >= 200 && status < 500,
        }
      );

      const data = response.data;
      console.log(`[Apick] Request response:`, JSON.stringify(data, null, 2));

      // Check for error message in response (can be in data.error or result.error)
      const errorMessage = data.data?.error || data.result?.error;
      if (errorMessage) {
        console.error(`[Apick] API error: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      if (data.data?.success === 1 && data.data?.ic_id) {
        console.log(`[Apick] Request successful, ic_id: ${data.data.ic_id}`);
        return { success: true, ic_id: data.data.ic_id };
      } else if (data.data?.success === 3) {
        return { success: false, error: 'Request timed out' };
      } else if (data.data?.success === 0) {
        // Apick returns success=0 when address is not found
        return { success: false, error: data.data.error || '검색 결과가 없습니다 (주소를 확인해주세요)' };
      } else {
        // Log unexpected response for debugging
        console.error(`[Apick] Unexpected response structure:`, JSON.stringify(data, null, 2));
        return { success: false, error: `Request failed: ${JSON.stringify(data)}` };
      }
    } catch (error: any) {
      console.error('[Apick] Request error:', error.message);
      // Capture the response data from axios error if available
      if (error.response) {
        console.error('[Apick] Response status:', error.response.status);
        console.error('[Apick] Response data:', JSON.stringify(error.response.data, null, 2));
        const errorMsg = error.response.data?.message || error.response.data?.error || `API returned status ${error.response.status}`;
        return { success: false, error: errorMsg };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 2: Download 등기부등본 document
   * Call this after requestRegistry with the ic_id
   * May need to retry if document is still being generated
   *
   * @param ic_id - Request ID from requestRegistry
   * @param format - Output format: "pdf" or "excel" (default: excel for better text extraction)
   */
  async downloadRegistry(
    ic_id: number,
    format: 'pdf' | 'excel' = DEFAULT_DOWNLOAD_FORMAT
  ): Promise<ApickRegistryDownloadResponse> {
    if (!this.apiKey) {
      return { success: false, result: 1, cost: 0, ms: 0, error: 'Apick API key not configured' };
    }

    try {
      console.log(`[Apick] Downloading registry, ic_id: ${ic_id}, format: ${format}`);

      // Use URLSearchParams for form-urlencoded data (works in Node.js)
      const params = new URLSearchParams();
      params.append('ic_id', ic_id.toString());
      params.append('format', format);

      const response = await axios.post(
        `${APICK_BASE_URL}/iros_download/1`,
        params.toString(),
        {
          headers: {
            'CL_AUTH_KEY': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          responseType: 'arraybuffer',
          timeout: 120000, // 2 minute timeout for download
        }
      );

      // Check response headers for status
      const successHeader = response.headers['success'];
      const success = successHeader === 'true' || successHeader === true || successHeader === '1' || successHeader === 1;
      const result = parseInt(response.headers['result'] || '1', 10) as 1 | 2;
      const cost = parseInt(response.headers['cost'] || '0', 10);
      const ms = parseInt(response.headers['ms'] || '0', 10);

      console.log(`[Apick] Download response headers - success: ${successHeader}, result: ${result}, cost: ${cost}`);

      if (result === 2) {
        // Still processing
        console.log('[Apick] Document still being generated...');
        return { success: false, result: 2, cost, ms, format, error: 'Document still processing' };
      }

      // Check if we received valid file data (minimum reasonable size for a document)
      const hasValidData = response.data && response.data.byteLength > 1000;

      if ((success || hasValidData) && response.data) {
        console.log(`[Apick] Download successful, format: ${format}, size: ${response.data.byteLength} bytes`);
        return {
          success: true,
          result: 1,
          cost,
          ms,
          format,
          fileBuffer: Buffer.from(response.data),
        };
      } else {
        console.error(`[Apick] Download failed - success header: ${successHeader}, data size: ${response.data?.byteLength || 0}`);
        return { success: false, result: 1, cost, ms, format, error: 'Download failed' };
      }
    } catch (error: any) {
      console.error('[Apick] Download error:', error.message);
      return { success: false, result: 1, cost: 0, ms: 0, format, error: error.message };
    }
  }

  /**
   * Complete flow: Request and download 등기부등본
   * Handles the waiting and retry logic
   *
   * @param address - Property address
   * @param type - Document type
   * @param format - Output format (default: 'excel' for better text extraction)
   * @param maxRetries - Maximum download retries (default: 10)
   * @param retryDelayMs - Delay between retries in ms (default: 3000)
   */
  async getRegistry(
    address: string,
    type: '토지' | '집합건물' | '건물' = '집합건물',
    format: 'pdf' | 'excel' = DEFAULT_DOWNLOAD_FORMAT,
    maxRetries: number = 10,
    retryDelayMs: number = 3000
  ): Promise<RegistryLookupResult> {
    // Step 1: Request
    const requestResult = await this.requestRegistry(address, type);
    if (!requestResult.success || !requestResult.ic_id) {
      return { success: false, error: requestResult.error || 'Request failed' };
    }

    const ic_id = requestResult.ic_id;

    // Step 2: Wait and download with retries
    // Document generation takes ~20-30 seconds
    console.log(`[Apick] Waiting for document generation (ic_id: ${ic_id}, format: ${format})...`);
    await this.sleep(5000); // Initial wait of 5 seconds

    let totalCost = 0;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Apick] Download attempt ${attempt}/${maxRetries}...`);

      const downloadResult = await this.downloadRegistry(ic_id, format);
      totalCost = downloadResult.cost || 0;

      if (downloadResult.success && downloadResult.fileBuffer) {
        return {
          success: true,
          fileBuffer: downloadResult.fileBuffer,
          format: downloadResult.format,
          ic_id,
          cost: totalCost,
        };
      }

      if (downloadResult.result === 2) {
        // Still processing, wait and retry
        console.log(`[Apick] Still processing, waiting ${retryDelayMs}ms...`);
        await this.sleep(retryDelayMs);
        continue;
      }

      // Other error
      if (attempt === maxRetries) {
        return { success: false, ic_id, format, error: downloadResult.error || 'Max retries exceeded' };
      }

      await this.sleep(retryDelayMs);
    }

    return { success: false, ic_id, format, error: 'Max retries exceeded' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apickAPI = new ApickAPI();
