/**
 * Korean to English Transliteration Utility
 * Converts Korean apartment names to romanized English
 */

// Revised Romanization of Korean (국립국어원 표준)
const INITIAL_CONSONANTS: Record<string, string> = {
  'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt',
  'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's',
  'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch',
  'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h'
};

const VOWELS: Record<string, string> = {
  'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo',
  'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa',
  'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo',
  'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui',
  'ㅣ': 'i'
};

const FINAL_CONSONANTS: Record<string, string> = {
  'ㄱ': 'k', 'ㄲ': 'k', 'ㄳ': 'k', 'ㄴ': 'n', 'ㄵ': 'n',
  'ㄶ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㄺ': 'k', 'ㄻ': 'm',
  'ㄼ': 'l', 'ㄽ': 'l', 'ㄾ': 'l', 'ㄿ': 'p', 'ㅀ': 'l',
  'ㅁ': 'm', 'ㅂ': 'p', 'ㅄ': 'p', 'ㅅ': 't', 'ㅆ': 't',
  'ㅇ': 'ng', 'ㅈ': 't', 'ㅊ': 't', 'ㅋ': 'k', 'ㅌ': 't',
  'ㅍ': 'p', 'ㅎ': 't'
};

// Special mappings for common apartment name components
const SPECIAL_MAPPINGS: Record<string, string> = {
  // Major brands
  '아이파크': 'I-Park',
  '래미안': 'Raemian',
  '자이': 'Xi',
  '푸르지오': 'Prugio',
  '힐스테이트': 'Hillstate',
  'e편한세상': 'e-Pyeonhansesang',
  '센트럴': 'Central',
  '더샵': 'The Sharp',
  '롯데캐슬': 'Lotte Castle',
  '호반베르디움': 'Hoban Verdi Um',

  // Builders/companies
  '현대': 'Hyundai',
  '삼성': 'Samsung',
  '한양': 'Hanyang',
  '주공': 'Jugong',
  '신동아': 'Shindonga',
  '한신': 'Hanshin',
  'GS': 'GS',
  'SK': 'SK',

  // Common descriptors
  '휴플러스': 'Huplus',
  '렉슬': 'Lexle',
  '아르테온': 'Arteon',
  '엠밸리': 'M-Valley',
  '스카이': 'Sky',
  '더힐': 'The Hill',
  '헬리오시티': 'Helios City',
  '신시가지': 'New Town',
  '프레지던스': 'Presidence',

  // Specific apartments
  '텐즈힐': 'Tens Hill',
  '엘마파트': 'Elma Apartments',
  '까치마을': 'Kkachi Village',

  // Location descriptors (longer patterns first)
  '마을': 'Village',
  '타워': 'Tower',
  '파크': 'Park',
  '빌': 'Ville',
  '시티': 'City'
};

/**
 * Decompose a Korean character into its components
 */
function decomposeHangul(char: string): { initial: string; vowel: string; final: string } | null {
  const code = char.charCodeAt(0);

  // Check if it's a Hangul syllable (가-힣)
  if (code < 0xAC00 || code > 0xD7A3) {
    return null;
  }

  const syllableIndex = code - 0xAC00;
  const initialIndex = Math.floor(syllableIndex / 588);
  const vowelIndex = Math.floor((syllableIndex % 588) / 28);
  const finalIndex = syllableIndex % 28;

  const initialConsonants = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const vowels = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const finalConsonants = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  return {
    initial: initialConsonants[initialIndex],
    vowel: vowels[vowelIndex],
    final: finalConsonants[finalIndex]
  };
}

/**
 * Transliterate a single Korean character to English
 */
function transliterateChar(char: string): string {
  const decomposed = decomposeHangul(char);

  if (!decomposed) {
    // Not a Korean character, return as-is
    return char;
  }

  const initial = INITIAL_CONSONANTS[decomposed.initial] || '';
  const vowel = VOWELS[decomposed.vowel] || '';
  const final = decomposed.final ? (FINAL_CONSONANTS[decomposed.final] || '') : '';

  return initial + vowel + final;
}

/**
 * Transliterate Korean text to English using Revised Romanization
 */
export function transliterateKorean(korean: string): string {
  // Check for special mappings first
  for (const [kr, en] of Object.entries(SPECIAL_MAPPINGS)) {
    if (korean.includes(kr)) {
      korean = korean.replace(new RegExp(kr, 'g'), `|${en}|`);
    }
  }

  // Transliterate remaining Korean characters
  let result = '';
  for (let i = 0; i < korean.length; i++) {
    const char = korean[i];

    // Keep special markers
    if (char === '|') {
      result += char;
      continue;
    }

    // Transliterate Korean character
    result += transliterateChar(char);
  }

  // Clean up special markers and capitalize
  result = result
    .split('|')
    .map(part => {
      // If it's a special mapping, keep it as-is
      if (Object.values(SPECIAL_MAPPINGS).includes(part)) {
        return part;
      }
      // Otherwise, capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ')
    .trim();

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ');

  return result;
}

/**
 * Generate English name for an apartment complex
 * Handles common patterns and special cases
 */
export function generateApartmentEnglishName(koreanName: string): string {
  // Handle phase numbers (e.g., "1단지", "2단지")
  const phaseMatch = koreanName.match(/(.+)\((\d+)단지\)/);
  if (phaseMatch) {
    const baseName = transliterateKorean(phaseMatch[1]);
    const phase = phaseMatch[2];
    return `${baseName} (Complex ${phase})`;
  }

  // Standard transliteration
  return transliterateKorean(koreanName);
}
