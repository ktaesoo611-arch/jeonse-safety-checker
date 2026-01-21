/**
 * Apick API Client for 등기부등본 (Property Registry) lookups
 *
 * API Documentation: https://apick.app/dev_guide/iros1
 *
 * Flow:
 * 1. Request 등기부등본 with address → get ic_id
 * 2. Wait ~20-30 seconds for PDF generation
 * 3. Download PDF with ic_id
 */

import axios from 'axios';

const APICK_BASE_URL = 'https://apick.app/rest';

export interface ApickRegistryRequestResponse {
  data: {
    ic_id: number;
    success: 0 | 1 | 3; // 1=success, 0=failed, 3=timeout
  };
  api: {
    success: boolean;
    cost: number;
    ms: number;
    pl_id: number;
  };
}

export interface ApickRegistryDownloadResponse {
  success: boolean;
  result: 1 | 2; // 1=completed, 2=processing
  cost: number;
  ms: number;
  pdfBuffer?: Buffer;
  error?: string;
}

export interface RegistryLookupResult {
  success: boolean;
  pdfBuffer?: Buffer;
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
      console.log(`[Apick] Requesting registry for: ${address}`);

      const formData = new FormData();
      formData.append('address', address);
      formData.append('type', type);

      const response = await axios.post<ApickRegistryRequestResponse>(
        `${APICK_BASE_URL}/iros/1`,
        formData,
        {
          headers: {
            'CL_AUTH_KEY': this.apiKey,
          },
          timeout: 60000, // 60 second timeout
        }
      );

      const data = response.data;
      console.log(`[Apick] Request response:`, JSON.stringify(data, null, 2));

      if (data.data?.success === 1 && data.data?.ic_id) {
        console.log(`[Apick] Request successful, ic_id: ${data.data.ic_id}`);
        return { success: true, ic_id: data.data.ic_id };
      } else if (data.data?.success === 3) {
        return { success: false, error: 'Request timed out' };
      } else {
        return { success: false, error: 'Request failed' };
      }
    } catch (error: any) {
      console.error('[Apick] Request error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Step 2: Download 등기부등본 PDF
   * Call this after requestRegistry with the ic_id
   * May need to retry if PDF is still being generated
   *
   * @param ic_id - Request ID from requestRegistry
   * @param format - Output format: "pdf" or "excel"
   */
  async downloadRegistry(
    ic_id: number,
    format: 'pdf' | 'excel' = 'pdf'
  ): Promise<ApickRegistryDownloadResponse> {
    if (!this.apiKey) {
      return { success: false, result: 1, cost: 0, ms: 0, error: 'Apick API key not configured' };
    }

    try {
      console.log(`[Apick] Downloading registry, ic_id: ${ic_id}, format: ${format}`);

      const formData = new FormData();
      formData.append('ic_id', ic_id.toString());
      formData.append('format', format);

      const response = await axios.post(
        `${APICK_BASE_URL}/iros_download/1`,
        formData,
        {
          headers: {
            'CL_AUTH_KEY': this.apiKey,
          },
          responseType: 'arraybuffer',
          timeout: 120000, // 2 minute timeout for download
        }
      );

      // Check response headers for status
      const success = response.headers['success'] === 'true' || response.headers['success'] === true;
      const result = parseInt(response.headers['result'] || '1', 10) as 1 | 2;
      const cost = parseInt(response.headers['cost'] || '0', 10);
      const ms = parseInt(response.headers['ms'] || '0', 10);

      if (result === 2) {
        // Still processing
        console.log('[Apick] PDF still being generated...');
        return { success: false, result: 2, cost, ms, error: 'PDF still processing' };
      }

      if (success && response.data) {
        console.log(`[Apick] Download successful, size: ${response.data.byteLength} bytes`);
        return {
          success: true,
          result: 1,
          cost,
          ms,
          pdfBuffer: Buffer.from(response.data),
        };
      } else {
        return { success: false, result: 1, cost, ms, error: 'Download failed' };
      }
    } catch (error: any) {
      console.error('[Apick] Download error:', error.message);
      return { success: false, result: 1, cost: 0, ms: 0, error: error.message };
    }
  }

  /**
   * Complete flow: Request and download 등기부등본
   * Handles the waiting and retry logic
   *
   * @param address - Property address
   * @param type - Document type
   * @param maxRetries - Maximum download retries (default: 10)
   * @param retryDelayMs - Delay between retries in ms (default: 3000)
   */
  async getRegistry(
    address: string,
    type: '토지' | '집합건물' | '건물' = '집합건물',
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
    // PDF generation takes ~20-30 seconds
    console.log(`[Apick] Waiting for PDF generation (ic_id: ${ic_id})...`);
    await this.sleep(5000); // Initial wait of 5 seconds

    let totalCost = 0;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Apick] Download attempt ${attempt}/${maxRetries}...`);

      const downloadResult = await this.downloadRegistry(ic_id);
      totalCost = downloadResult.cost || 0;

      if (downloadResult.success && downloadResult.pdfBuffer) {
        return {
          success: true,
          pdfBuffer: downloadResult.pdfBuffer,
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
        return { success: false, ic_id, error: downloadResult.error || 'Max retries exceeded' };
      }

      await this.sleep(retryDelayMs);
    }

    return { success: false, ic_id, error: 'Max retries exceeded' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const apickAPI = new ApickAPI();
