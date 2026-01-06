/**
 * Korean Apartment Name → English Translation Mappings
 *
 * This file contains dictionaries for translating Korean apartment names
 * to their official English brand names using pronunciation-based romanization.
 */

// ============================================================================
// BRAND DICTIONARY - Major Construction Companies
// ============================================================================

export const BRAND_DICTIONARY: Record<string, string> = {
  // Big 6 Construction Companies (Tier 1)
  '래미안': 'RAEMIAN',
  '자이': 'Xi',
  '힐스테이트': 'HILLSTATE',
  '아이파크': "I'PARK",
  '푸르지오': 'PRUGIO',
  '롯데캐슬': 'LOTTE CASTLE',
  '더샵': 'THE SHOP',
  '이편한세상': 'e-PYUNHANSESANG',
  'e편한세상': 'e-PYUNHANSESANG',

  // Premium Sub-brands
  '디에이치': 'THE H',
  '아크로': 'ACRO',
  '르엘': 'LE-EL',
  '렉슬': 'REXLE',  // RAEMIAN sub-brand

  // Tier 2 - Mid-tier Builders
  '포레나': 'FORENA',
  '센트레빌': 'CENTREVILLE',
  '위브': "We've",
  '데시앙': 'DESIAN',
  '스위첸': 'SWItZEN',
  '휴플러스': 'THE HUE Plus',
  '꿈에그린': 'FORENA',  // Hanwha rebranded
  '비발디': 'VIVALDI',
  '예가': 'The PLATINUM',
  '플래티넘': 'The PLATINUM',
  '플레티넘': 'The PLATINUM',
  '어울림': 'ARTERA',
  '아너스빌': 'HONORS VILLE',
  '롯데': 'LOTTE',  // Also matches 롯데캐슬

  // Tier 3 - Regional/Smaller Builders
  '에스클래스': 'S-CLASS',
  '리슈빌': 'RICHVILLE',
  '유보라': 'UBORA',
  '수자인': 'SUJAIN',
  '파밀리에': 'FAMILIE',
  '로얄듀크': 'ROYAL DUKE',
  '필유': 'FILLIU',
  '린': 'Lynn',

  // Special Cases
  '주공': 'Jugong',
  '현대': 'Hyundai',
  '삼성': 'Samsung',
  '대림': 'Daelim',
  '한신': 'Hanshin',
  '동아': 'Dong-A',
  '쌍용': 'Ssangyong',
  '금호': 'Kumho',
  '두산': 'Doosan',
  '한양': 'Hanyang',
  '한화': 'Hanwha',
  '신동아': 'Shindonga',
  '동부': 'Dongbu',
  '경남': 'Kyungnam',
  '성원': 'Seongwon',
  '삼익': 'Samik',
  '우성': 'Woosung',
  '선경': 'Sunkyung',
  '진흥': 'Jinheung',
  '계룡': 'Gyeryong',
  '중앙': 'Jungang',
  '중흥': 'Junghung',
  '반도': 'Bando',
  '우미': 'Woomi',
  '우림': 'Woolim',
  '동원': 'Dongwon',
  '호반': 'Hoban',
  'KCC': 'KCC',
  'LG': 'LG',
  'SK': 'SK',
  '포스코': 'POSCO',
};

// ============================================================================
// SUB-BRAND / SERIES DICTIONARY
// ============================================================================

export const SUBBRAND_DICTIONARY: Record<string, string> = {
  // Common sub-brands
  '포레스트': 'Forest',
  '포레': 'Forêt',
  '팰리스': 'Palace',
  '힐즈': 'Hills',
  '힐스': 'Hills',  // Alternative spelling
  '파크': 'Park',
  '타워': 'Tower',
  '센트럴': 'Central',
  '프레스티지': 'Prestige',
  '프리미어': 'Premier',
  '노블': 'Noble',
  '캐슬': 'Castle',
  '그레이튼': 'Greyton',
  '라클래시': 'La Classie',
  '루체하임': 'Lucéheim',
  '베라힐즈': 'Vera Hills',
  '블레스티지': 'Blestige',
  '포레센트': 'Forescent',
  '아너힐즈': 'Honor Hills',
  '펜타빌': 'Pentavil',
  '하이스턴': 'Highsten',
  '로이뷰': 'Roy View',
  '카운티': 'County',
  '클라시스': 'Classis',
  '솔베뉴': 'Sol Venue',
  '에코포레': 'Eco Forêt',
  '헤리티지': 'Heritage',
  '아델포레': 'Adel Forêt',
  '프레비뉴': 'Prevenue',
  '발라드': 'Ballade',
  '써밋': 'SUMMIT',
  '서밋': 'SUMMIT',
  '리베': 'Libé',
  '모닝': 'Morning',
  '트리에': 'Trier',
  '르네': 'Rene',
  '에클라트': 'Éclat',
  '첼리투스': 'Celitus',
  '트레지움': 'TRESIUM',
  '센티움': "Centi'um",
  '아트포레': 'Art Forêt',
  '파인시티': 'Fine City',
  '스카이뷰': 'Skyview',
  '리버뷰': 'River View',
  '아르테온': 'ARTEON',
  '그라시움': 'Gracium',
  '센트베르': 'Centvert',
  '베네루체': 'Bene Luce',
  '웰츠타워': 'WELLTZ TOWER',
  '프레지던스': 'Presidence',
  '애비뉴': 'Avenue',

  // Common suffixes
  '마을': 'Village',
  '아파트': '',  // Remove

  // More sub-brands (Tier 2)
  '시티': 'City',
  '타운': 'Town',
  '빌': 'Ville',
  '뷰': 'View',
  '원': 'One',
  '퍼스티지': 'Firstige',
  '원베일리': 'One Bailey',
  '그랑': 'Grand',
  '클래시': 'Classy',
  '클래식': 'Classic',
  '리오': 'Rio',
  '엘스': 'ELS',
  '리센츠': 'Ricenz',
  '헬리오': 'Helio',
  '에스티움': 'Estium',
  '베르빌': 'Berville',
  '트리마제': 'Trimaje',
  '아이비': 'IVY',
  '센트레': 'Centre',
  '레이크': 'Lake',
  '스카이': 'Sky',
  '그린': 'Green',
  '블루': 'Blue',
  '골드': 'Gold',
  '실버': 'Silver',
  '로얄': 'Royal',
  '프라임': 'Prime',
  '더': 'The',
  '뉴': 'New',
};

// ============================================================================
// LOCATION ROMANIZATION DICTIONARY (Pronunciation-based)
// ============================================================================

export const LOCATION_DICTIONARY: Record<string, string> = {
  // Seoul Districts (구)
  '강남구': 'Gangnam-gu',
  '강동구': 'Gangdong-gu',
  '강북구': 'Gangbuk-gu',
  '강서구': 'Gangseo-gu',
  '관악구': 'Gwanak-gu',
  '광진구': 'Gwangjin-gu',
  '구로구': 'Guro-gu',
  '금천구': 'Geumcheon-gu',
  '노원구': 'Nowon-gu',
  '도봉구': 'Dobong-gu',
  '동대문구': 'Dongdaemun-gu',
  '동작구': 'Dongjak-gu',
  '마포구': 'Mapo-gu',
  '서대문구': 'Seodaemun-gu',
  '서초구': 'Seocho-gu',
  '성동구': 'Seongdong-gu',
  '성북구': 'Seongbuk-gu',
  '송파구': 'Songpa-gu',
  '양천구': 'Yangcheon-gu',
  '영등포구': 'Yeongdeungpo-gu',
  '용산구': 'Yongsan-gu',
  '은평구': 'Eunpyeong-gu',
  '종로구': 'Jongno-gu',
  '중구': 'Jung-gu',
  '중랑구': 'Jungnang-gu',

  // Gangnam-gu Neighborhoods (동) - Pronunciation-based
  // NOTE: These MUST come before location words without 동 to ensure proper matching
  '개포동': 'Gaepo-dong',
  '논현동': 'Nonhyeon-dong',
  '대치동': 'Daechi-dong',
  '도곡동': 'Dogok-dong',
  '삼성동': 'Samseong-dong',  // Different from Samsung (brand)
  '세곡동': 'Segok-dong',
  '수서동': 'Suseo-dong',
  '신사동': 'Sinsa-dong',
  '압구정동': 'Apgujeong-dong',
  '역삼동': 'Yeoksam-dong',
  '율현동': 'Yulhyeon-dong',
  '일원동': 'Irwon-dong',
  '자곡동': 'Jagok-dong',
  '청담동': 'Cheongdam-dong',

  // Common location words (Pronunciation-based)
  '개포': 'Gaepo',
  '논현': 'Nonhyeon',
  '대치': 'Daechi',
  '도곡': 'Dogok',
  '삼성': 'Samseong',
  '세곡': 'Segok',
  '수서': 'Suseo',
  '신사': 'Sinsa',
  '압구정': 'Apgujeong',
  '역삼': 'Yeoksam',
  '율현': 'Yulhyeon',
  '일원': 'Irwon',
  '자곡': 'Jagok',
  '청담': 'Cheongdam',
  '강남': 'Gangnam',

  // Other Seoul locations (Pronunciation-based)
  '고덕': 'Godeok',
  '둔촌': 'Dunchon',
  '천호': 'Cheonho',
  '강일': 'Gangil',
  '문래': 'Mullae',  // NOT Munrae
  '신길': 'Singil',
  '당산': 'Dangsan',
  '영등포': 'Yeongdeungpo',
  '여의도': 'Yeouido',
  '보라매': 'Boramae',
  '용산': 'Yongsan',
  '한남': 'Hannam',
  '효창': 'Hyochang',
  '녹번': 'Nokbeon',
  '응암': 'Eungam',
  '백련산': 'Baekryeonsan',
  '북한산': 'Bukhansan',
  '마포': 'Mapo',
  '홍대': 'Hongdae',
  '합정': 'Hapjeong',
  '상암': 'Sangam',
  '잠실': 'Jamsil',
  '송파': 'Songpa',
  '방배': 'Bangbae',
  '서초': 'Seocho',
  '반포': 'Banpo',
  '잠원': 'Jamwon',
  '성수': 'Seongsu',
  '왕십리': 'Wangsimni',
  '행당': 'Haengdang',
  '옥수': 'Oksu',
  '금호': 'Geumho',  // Location (different from 금호 brand)
  '목동': 'Mokdong',
  '신정': 'Sinjeong',
  '화곡': 'Hwagok',
  '등촌': 'Deungchon',
  '발산': 'Balsan',
  '가양': 'Gayang',
  '마곡': 'Magok',
  '공덕': 'Gongdeok',
  '아현': 'Ahyeon',
  '신촌': 'Sinchon',
  '연희': 'Yeonhui',
  '연남': 'Yeonnam',

  // Gyeonggi-do locations
  '광명': 'Gwangmyeong',
};

// ============================================================================
// COMPLEX/PHASE TRANSLATIONS
// ============================================================================

export const COMPLEX_PATTERNS: Array<{pattern: RegExp, replacement: string}> = [
  { pattern: /(\d+)단지/g, replacement: ' Complex $1' },
  { pattern: /(\d+)차/g, replacement: ' $1st' },  // Will be post-processed for 2nd, 3rd
  { pattern: /제(\d+)단지/g, replacement: ' Complex $1' },
  { pattern: /(\d+)동~(\d+)동/g, replacement: ' Bldg $1-$2' },
  { pattern: /(\d+)동/g, replacement: ' Bldg $1' },
];

// ============================================================================
// SUFFIXES TO REMOVE
// ============================================================================

export const SUFFIXES_TO_REMOVE = [
  '아파트',
  'APT',
  'apt',
];

// ============================================================================
// SPECIAL FULL NAME OVERRIDES (Manual corrections)
// ============================================================================

export const FULL_NAME_OVERRIDES: Record<string, string> = {
  // Gangnam-gu special cases
  '도곡렉슬': 'Dogok RAEMIAN REXLE',
  '나인원한남': 'Nine One Hannam',
  '한남더힐': 'Hannam The Hill',
  '까치마을': 'Kkachi Village',
  '은마': 'Eunma',
  '삼성래미안': 'Samsung RAEMIAN',
  '삼성래미안2차': 'Samsung RAEMIAN 2nd',
  '래미안삼성2차': 'RAEMIAN Samsung 2nd',
  '대치삼성': 'Daechi Samsung',

  // Village names (마을)
  '푸른마을': 'Pureun Village',
  '한솔마을': 'Hansol Village',
  '무지개마을': 'Rainbow Village',
  '샛별마을': 'Saetbyeol Village',
  '은하마을': 'Eunha Village',

  // Flower names
  '개나리': 'Gaenari',
  '진달래': 'Jindallae',
  '무궁화': 'Mugunghwa',
  '장미': 'Jangmi',

  // Complex cases with parentheses
  '아크로힐스논현': 'ACRO Hills Nonhyeon',

  // Add more manual overrides as needed
};

// ============================================================================
// ENGLISH NAME GENERATOR
// ============================================================================

/**
 * Generates English name from Korean apartment name
 * Uses brand dictionary, location romanization, and pattern matching
 */
export function generateEnglishName(koreanName: string, district?: string): string {
  // Check for full name override first
  if (FULL_NAME_OVERRIDES[koreanName]) {
    return FULL_NAME_OVERRIDES[koreanName];
  }

  let englishName = koreanName;

  // Step 1: Remove suffixes
  for (const suffix of SUFFIXES_TO_REMOVE) {
    englishName = englishName.replace(new RegExp(suffix + '$', 'gi'), '');
  }

  // Step 2: Replace locations FIRST (longest match first)
  // This ensures 삼성동 → Samseong before 삼성 → Samsung
  const sortedLocations = Object.keys(LOCATION_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const location of sortedLocations) {
    if (englishName.includes(location)) {
      // Remove -dong, -gu suffix for apartment names
      const cleanLocation = LOCATION_DICTIONARY[location]
        .replace(/-dong$/, '')
        .replace(/-gu$/, '');
      englishName = englishName.replace(location, ` ${cleanLocation} `);
    }
  }

  // Step 3: Replace brands (longest match first)
  const sortedBrands = Object.keys(BRAND_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const brand of sortedBrands) {
    if (englishName.includes(brand)) {
      englishName = englishName.replace(brand, ` ${BRAND_DICTIONARY[brand]} `);
    }
  }

  // Step 4: Replace sub-brands
  const sortedSubbrands = Object.keys(SUBBRAND_DICTIONARY).sort((a, b) => b.length - a.length);
  for (const subbrand of sortedSubbrands) {
    if (englishName.includes(subbrand)) {
      englishName = englishName.replace(subbrand, ` ${SUBBRAND_DICTIONARY[subbrand]} `);
    }
  }

  // Step 5: Apply complex patterns
  for (const { pattern, replacement } of COMPLEX_PATTERNS) {
    englishName = englishName.replace(pattern, replacement);
  }

  // Step 6: Fix ordinal numbers (1st, 2nd, 3rd, 4th...)
  // Handle special cases: 11th, 12th, 13th (not 11st, 12nd, 13rd)
  englishName = englishName
    .replace(/11st/g, '11th')
    .replace(/12st/g, '12th')
    .replace(/13st/g, '13th')
    .replace(/1st/g, '1st')
    .replace(/2st/g, '2nd')
    .replace(/3st/g, '3rd')
    .replace(/(\d)st/g, '$1th');  // 4th, 5th, etc.

  // Step 7: Clean up whitespace
  englishName = englishName
    .replace(/\s+/g, ' ')
    .trim();

  // Step 8: If still has Korean characters, try basic romanization
  if (/[가-힣]/.test(englishName)) {
    // For remaining Korean, use a simple romanization
    // This is a fallback - ideally all common words are in dictionaries
    englishName = romanizeKorean(englishName);
  }

  return englishName;
}

/**
 * Basic Korean romanization (pronunciation-based)
 * This is a fallback for words not in the dictionary
 */
function romanizeKorean(text: string): string {
  // Korean Unicode block: 가-힣 (AC00-D7A3)
  // This is a simplified romanization - for complex cases, use the dictionary
  const result: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    if (code >= 0xAC00 && code <= 0xD7A3) {
      // Korean syllable
      const syllableIndex = code - 0xAC00;
      const cho = Math.floor(syllableIndex / 588);
      const jung = Math.floor((syllableIndex % 588) / 28);
      const jong = syllableIndex % 28;

      const choRoman = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'][cho];
      const jungRoman = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'][jung];
      const jongRoman = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'][jong];

      result.push(choRoman + jungRoman + jongRoman);
    } else {
      result.push(char);
    }
  }

  // Capitalize first letter of each word
  return result.join('')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Search helper - checks if query matches apartment name (Korean or English)
 */
export function matchesSearchQuery(
  apartment: { name: string; nameEn?: string },
  query: string
): boolean {
  const normalizedQuery = query.toLowerCase().trim();

  // Check Korean name
  if (apartment.name.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check English name
  if (apartment.nameEn?.toLowerCase().includes(normalizedQuery)) {
    return true;
  }

  // Check brand matches
  for (const [korean, english] of Object.entries(BRAND_DICTIONARY)) {
    if (normalizedQuery.includes(english.toLowerCase()) && apartment.name.includes(korean)) {
      return true;
    }
  }

  return false;
}
