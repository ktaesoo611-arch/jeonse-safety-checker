/**
 * Building Ledger Parser (건축물대장 파서)
 * Extracts violation information and building details from 건축물대장
 */

export interface BuildingLedgerData {
  buildingNumber: string;        // 건물ID
  address: string;                // 대지위치
  buildingName?: string;          // 건물명
  hasViolation: boolean;          // 위반건축물 여부
  violationHistory: ViolationRecord[];
  completionDate?: string;        // 사용승인일
  totalArea?: number;             // 면적(㎡)
}

export interface ViolationRecord {
  date: string;                   // 변동일자 (e.g., "2008.1.28")
  description: string;            // 변동사항 내역
  isViolationRelated: boolean;    // 위반 관련 여부
}

export class BuildingLedgerParser {
  /**
   * Parse 건축물대장 OCR text
   */
  parse(ocrText: string): BuildingLedgerData {
    const data: BuildingLedgerData = {
      buildingNumber: '',
      address: '',
      hasViolation: false,
      violationHistory: []
    };

    // Extract building ID (건물ID)
    const buildingIdMatch = ocrText.match(/건물ID[:\s]*(\d+)/);
    if (buildingIdMatch) {
      data.buildingNumber = buildingIdMatch[1];
    }

    // Extract address (대지위치 / 서울특별시 용산구 이촌동)
    const addressMatch = ocrText.match(/대지위치[:\s]*(.*?)(?:\n|지번)/);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    // Check for violation indicator in header
    // Look for "위반건축물" checkbox or marker
    data.hasViolation = this.detectViolationStatus(ocrText);

    // Extract violation history from 변동사항 table
    data.violationHistory = this.extractViolationHistory(ocrText);

    // If violation history exists, mark as having violations
    if (data.violationHistory.some(v => v.isViolationRelated)) {
      data.hasViolation = true;
    }

    // Extract completion date
    const completionMatch = ocrText.match(/(\d{4}\.\d{1,2}\.\d{1,2})/);
    if (completionMatch) {
      data.completionDate = completionMatch[1];
    }

    return data;
  }

  /**
   * Detect if building has violation status
   * Looks for "위반건축물" indicator in header
   */
  private detectViolationStatus(ocrText: string): boolean {
    // Check for violation checkbox header
    // Pattern: "위반건축물" followed by checkbox or marker
    const violationHeaderPattern = /위반건축물[\s]*(?:☑|✓|✔|√|체크|v|1)/i;
    if (violationHeaderPattern.test(ocrText)) {
      return true;
    }

    // Check for explicit violation markers
    const violationMarkers = [
      '위반건축물로',
      '위반건축물이',
      '불법건축',
      '무허가건축'
    ];

    return violationMarkers.some(marker => ocrText.includes(marker));
  }

  /**
   * Extract violation history from 변동사항 table
   */
  private extractViolationHistory(ocrText: string): ViolationRecord[] {
    const records: ViolationRecord[] = [];

    // Find 변동사항 section
    const changeHistoryMatch = ocrText.match(/변동사항[\s\S]*?(?=\n\n|$)/);
    if (!changeHistoryMatch) {
      return records;
    }

    const changeHistorySection = changeHistoryMatch[0];

    // Extract date and description pairs
    // Pattern: YYYY.M.D followed by description
    const entryPattern = /(\d{4}\.\d{1,2}\.\d{1,2})[^\d]+(.*?)(?=\d{4}\.\d{1,2}\.\d{1,2}|$)/gs;

    let match;
    while ((match = entryPattern.exec(changeHistorySection)) !== null) {
      const date = match[1];
      const description = match[2].trim();

      // Check if this entry is violation-related
      const isViolationRelated = this.isViolationRelatedEntry(description);

      if (description.length > 5) { // Filter out very short entries
        records.push({
          date,
          description,
          isViolationRelated
        });
      }
    }

    return records;
  }

  /**
   * Check if a change history entry is related to violations
   */
  private isViolationRelatedEntry(description: string): boolean {
    const violationKeywords = [
      '위반',
      '불법',
      '무허가',
      '정비',
      '시정',
      '개선',
      '철거',
      '해소',
      '미조치',
      '위법'
    ];

    return violationKeywords.some(keyword => description.includes(keyword));
  }

  /**
   * Summarize violations for display
   */
  summarizeViolations(data: BuildingLedgerData): string {
    if (!data.hasViolation && data.violationHistory.length === 0) {
      return 'No violations found';
    }

    const violationEntries = data.violationHistory.filter(v => v.isViolationRelated);

    if (violationEntries.length === 0 && data.hasViolation) {
      return 'Building marked as 위반건축물 (Building Code Violation)';
    }

    const summary = violationEntries.map(v =>
      `${v.date}: ${v.description.substring(0, 100)}${v.description.length > 100 ? '...' : ''}`
    ).join('\n');

    return summary;
  }
}
