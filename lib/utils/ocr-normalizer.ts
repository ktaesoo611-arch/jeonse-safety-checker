/**
 * OCR Normalization Utility
 * Normalizes inconsistent OCR output from Document AI to a consistent format
 * This reduces the need for multiple regex patterns
 */

export class OCRNormalizer {
  /**
   * Normalize OCR text to consistent format for parsing
   */
  static normalize(text: string): string {
    let normalized = text;

    // 1. Remove excessive whitespace but preserve structure
    normalized = normalized.replace(/[ \t]+/g, ' '); // Multiple spaces → single space
    normalized = normalized.replace(/\n{3,}/g, '\n\n'); // Multiple newlines → double newline

    // 2. Normalize section headers
    normalized = normalized.replace(/3\s*\.\s*\(\s*근\s*\)\s*저당권\s*및\s*전세권\s*등/g, '3. (근)저당권 및 전세권 등');
    normalized = normalized.replace(/【\s*을\s*구?\s*】/g, '【을구】');
    normalized = normalized.replace(/【\s*갑\s*구?\s*】/g, '【갑구】');

    // 3. Normalize mortgage-related keywords
    normalized = normalized.replace(/근\s*저\s*당\s*권\s*설\s*정/g, '근저당권설정');
    normalized = normalized.replace(/근\s*저\s*당\s*권\s*이\s*전/g, '근저당권이전');
    normalized = normalized.replace(/근\s*저\s*당\s*권\s*변\s*경/g, '근저당권변경');
    normalized = normalized.replace(/채\s*권\s*최\s*고\s*액/g, '채권최고액');
    normalized = normalized.replace(/근\s*저\s*당\s*권\s*자/g, '근저당권자');

    // 4. Normalize date formats
    // "2017년 12월 14일" → "2017년12월14일"
    normalized = normalized.replace(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g, '$1년$2월$3일');

    // 5. Normalize currency amounts
    // "금 600,000,000 원" → "금600,000,000원"
    normalized = normalized.replace(/금\s*([\d,\s]+)\s*원/g, (match, amount) => {
      return '금' + amount.replace(/\s+/g, '') + '원';
    });

    // 6. Fix table header contamination
    // Remove merged table headers that appear inline
    // "1 근저당권설정 [참고사항] 접수정보 주요등기사항 대상소유자 2017년12월14일"
    // → "1 근저당권설정 2017년12월14일"
    normalized = normalized.replace(
      /(\d+)\s+근저당권설정\s+\[참고사항\]\s*접수정보\s*주요등기사항\s*대상소유자\s+/g,
      '$1 근저당권설정 '
    );

    // Also remove other header fragments that get merged
    normalized = normalized.replace(
      /순위번호\s*등기목적\s*접수정보?\s*주요등기사항\s*대상소유자\s*/g,
      ''
    );

    // 7. Normalize receipt numbers
    // "제 211724 호" → "제211724호"
    normalized = normalized.replace(/제\s*(\d+)\s*호/g, '제$1호');

    // 8. Normalize bank/company names
    normalized = normalized.replace(/주\s*식\s*회\s*사/g, '주식회사');
    normalized = normalized.replace(/농\s*업\s*협\s*동\s*조\s*합/g, '농업협동조합');

    return normalized;
  }

  /**
   * Clean up [참고사항] footer section to prevent it from interfering with data extraction
   */
  static cleanFooterContamination(text: string): string {
    // If [참고사항] appears inline with data, move it to separate line
    return text.replace(
      /(\d+년\d+월\d+일[^\n]*?)\s*\[참고사항\]/g,
      '$1\n[참고사항]'
    );
  }

  /**
   * Normalize summary section specifically
   */
  static normalizeSummarySection(summaryText: string): string {
    let normalized = summaryText;

    // Remove table headers that got merged into data rows
    const headerPatterns = [
      /순위번호\s*등기목적\s*/g,
      /접수정보\s*/g,
      /주요등기사항\s*/g,
      /대상소유자(?=\s*\d+년)/g  // Only remove if followed by date
    ];

    headerPatterns.forEach(pattern => {
      normalized = normalized.replace(pattern, '');
    });

    // Clean up [참고사항] contamination
    normalized = OCRNormalizer.cleanFooterContamination(normalized);

    return normalized;
  }
}
