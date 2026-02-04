/**
 * Adjacent Dong Mappings for Seoul Districts
 *
 * Used for expanding search radius when target dong has insufficient transaction data.
 * Adjacent dongs share similar market characteristics (transit, amenities, price levels).
 *
 * Format: { [district]: { [dong]: [adjacentDong1, adjacentDong2, ...] } }
 */

export const ADJACENT_DONGS: Record<string, Record<string, string[]>> = {
  // 마포구
  '마포구': {
    '서교동': ['합정동', '동교동', '연남동', '망원동', '상수동'],
    '합정동': ['서교동', '망원동', '상수동', '당인동'],
    '동교동': ['서교동', '연남동', '연희동', '신촌동'],
    '연남동': ['서교동', '동교동', '연희동', '성산동'],
    '망원동': ['합정동', '서교동', '상수동', '성산동'],
    '상수동': ['합정동', '망원동', '서교동', '당인동'],
    '성산동': ['연남동', '망원동', '상암동', '증산동'],
    '상암동': ['성산동', '증산동', '수색동'],
    '공덕동': ['도화동', '아현동', '신공덕동', '대흥동'],
    '도화동': ['공덕동', '아현동', '마포동', '용강동'],
    '아현동': ['공덕동', '도화동', '대흥동', '신촌동'],
    '대흥동': ['공덕동', '아현동', '신수동', '노고산동'],
    '신촌동': ['동교동', '아현동', '대흥동', '노고산동', '창천동'],
    '마포동': ['도화동', '용강동', '토정동', '현석동'],
    '용강동': ['마포동', '도화동', '토정동'],
  },

  // 강남구
  '강남구': {
    '역삼동': ['삼성동', '대치동', '논현동', '도곡동', '청담동'],
    '삼성동': ['역삼동', '대치동', '청담동', '압구정동'],
    '대치동': ['역삼동', '삼성동', '도곡동', '개포동'],
    '논현동': ['역삼동', '신사동', '청담동', '압구정동'],
    '청담동': ['삼성동', '논현동', '압구정동', '신사동'],
    '압구정동': ['청담동', '신사동', '논현동', '삼성동'],
    '신사동': ['압구정동', '논현동', '청담동'],
    '도곡동': ['역삼동', '대치동', '개포동'],
    '개포동': ['대치동', '도곡동', '일원동', '수서동'],
    '일원동': ['개포동', '수서동', '자곡동'],
    '수서동': ['개포동', '일원동', '자곡동', '세곡동'],
  },

  // 서초구
  '서초구': {
    '서초동': ['방배동', '반포동', '잠원동', '양재동'],
    '방배동': ['서초동', '반포동', '사당동', '내곡동'],
    '반포동': ['서초동', '방배동', '잠원동', '사평동'],
    '잠원동': ['서초동', '반포동', '신반포동', '사평동'],
    '양재동': ['서초동', '내곡동', '우면동', '원지동'],
    '내곡동': ['양재동', '방배동', '우면동', '신원동'],
  },

  // 송파구
  '송파구': {
    '잠실동': ['신천동', '삼전동', '석촌동', '가락동'],
    '신천동': ['잠실동', '삼전동', '풍납동'],
    '삼전동': ['잠실동', '신천동', '석촌동', '송파동'],
    '석촌동': ['잠실동', '삼전동', '송파동', '가락동'],
    '가락동': ['잠실동', '석촌동', '문정동', '장지동'],
    '문정동': ['가락동', '장지동', '거여동', '방이동'],
    '방이동': ['잠실동', '오금동', '문정동'],
    '오금동': ['방이동', '거여동', '마천동'],
  },

  // 용산구
  '용산구': {
    '이태원동': ['한남동', '보광동', '녹사평동', '이촌동'],
    '한남동': ['이태원동', '보광동', '옥수동', '서빙고동'],
    '이촌동': ['이태원동', '용산동', '서빙고동', '동빙고동'],
    '용산동': ['이촌동', '원효로', '효창동', '청파동'],
    '서빙고동': ['한남동', '이촌동', '동빙고동', '보광동'],
  },

  // 성동구
  '성동구': {
    '성수동': ['송정동', '용답동', '금호동', '옥수동'],
    '금호동': ['성수동', '옥수동', '행당동', '응봉동'],
    '옥수동': ['금호동', '한남동', '응봉동'],
    '왕십리동': ['행당동', '마장동', '사근동', '홍익동'],
    '행당동': ['왕십리동', '금호동', '응봉동', '마장동'],
  },

  // 광진구
  '광진구': {
    '자양동': ['구의동', '화양동', '군자동'],
    '구의동': ['자양동', '광장동', '능동'],
    '화양동': ['자양동', '군자동', '중곡동'],
    '군자동': ['화양동', '중곡동', '능동'],
    '광장동': ['구의동', '능동', '아차산동'],
  },

  // 영등포구
  '영등포구': {
    '여의도동': ['당산동', '영등포동', '문래동', '신길동'],
    '당산동': ['여의도동', '영등포동', '문래동', '양평동'],
    '영등포동': ['여의도동', '당산동', '신길동', '문래동'],
    '문래동': ['여의도동', '당산동', '영등포동', '양평동'],
    '신길동': ['영등포동', '대림동', '도림동'],
  },

  // 동작구
  '동작구': {
    '사당동': ['방배동', '이수동', '남현동', '상도동'],
    '상도동': ['사당동', '노량진동', '흑석동', '대방동'],
    '노량진동': ['상도동', '흑석동', '대방동', '본동'],
    '흑석동': ['상도동', '노량진동', '동작동'],
  },

  // 관악구
  '관악구': {
    '신림동': ['봉천동', '남현동', '서원동', '미성동'],
    '봉천동': ['신림동', '남현동', '서원동', '청룡동'],
    '남현동': ['신림동', '봉천동', '사당동'],
  },
};

/**
 * Get adjacent dongs for a given district and dong
 * Returns empty array if no adjacency mapping exists
 */
export function getAdjacentDongs(district: string, dong: string): string[] {
  const districtMap = ADJACENT_DONGS[district];
  if (!districtMap) return [];

  return districtMap[dong] || [];
}

/**
 * Get expanded dong list (target dong + adjacent dongs)
 * Returns at least the target dong even if no adjacency mapping exists
 */
export function getExpandedDongs(district: string, dong: string): string[] {
  const adjacent = getAdjacentDongs(district, dong);
  return [dong, ...adjacent];
}

/**
 * Adjacent District Mappings for Seoul
 *
 * Used for expanding search radius when district-level data is still insufficient.
 * Adjacent districts share similar market characteristics and geographic proximity.
 *
 * Format: { [district]: { name: string, code: string }[] }
 */
export const ADJACENT_DISTRICTS: Record<string, { name: string; code: string }[]> = {
  '마포구': [
    { name: '서대문구', code: '11410' },
    { name: '용산구', code: '11170' },
    { name: '영등포구', code: '11560' },
    { name: '은평구', code: '11380' },
  ],
  '강남구': [
    { name: '서초구', code: '11650' },
    { name: '송파구', code: '11710' },
    { name: '성동구', code: '11200' },
    { name: '광진구', code: '11215' },
  ],
  '서초구': [
    { name: '강남구', code: '11680' },
    { name: '동작구', code: '11590' },
    { name: '관악구', code: '11620' },
    { name: '송파구', code: '11710' },
  ],
  '송파구': [
    { name: '강남구', code: '11680' },
    { name: '강동구', code: '11740' },
    { name: '서초구', code: '11650' },
    { name: '광진구', code: '11215' },
  ],
  '용산구': [
    { name: '마포구', code: '11440' },
    { name: '성동구', code: '11200' },
    { name: '동작구', code: '11590' },
    { name: '중구', code: '11140' },
  ],
  '성동구': [
    { name: '광진구', code: '11215' },
    { name: '동대문구', code: '11230' },
    { name: '중구', code: '11140' },
    { name: '용산구', code: '11170' },
  ],
  '광진구': [
    { name: '성동구', code: '11200' },
    { name: '송파구', code: '11710' },
    { name: '강동구', code: '11740' },
    { name: '동대문구', code: '11230' },
  ],
  '영등포구': [
    { name: '마포구', code: '11440' },
    { name: '동작구', code: '11590' },
    { name: '구로구', code: '11530' },
    { name: '양천구', code: '11470' },
  ],
  '동작구': [
    { name: '영등포구', code: '11560' },
    { name: '서초구', code: '11650' },
    { name: '관악구', code: '11620' },
    { name: '용산구', code: '11170' },
  ],
  '관악구': [
    { name: '동작구', code: '11590' },
    { name: '서초구', code: '11650' },
    { name: '금천구', code: '11545' },
    { name: '구로구', code: '11530' },
  ],
  '서대문구': [
    { name: '마포구', code: '11440' },
    { name: '은평구', code: '11380' },
    { name: '종로구', code: '11110' },
    { name: '중구', code: '11140' },
  ],
  '은평구': [
    { name: '마포구', code: '11440' },
    { name: '서대문구', code: '11410' },
    { name: '종로구', code: '11110' },
  ],
  '종로구': [
    { name: '서대문구', code: '11410' },
    { name: '은평구', code: '11380' },
    { name: '중구', code: '11140' },
    { name: '성북구', code: '11290' },
  ],
  '중구': [
    { name: '종로구', code: '11110' },
    { name: '용산구', code: '11170' },
    { name: '성동구', code: '11200' },
    { name: '동대문구', code: '11230' },
  ],
  '동대문구': [
    { name: '성동구', code: '11200' },
    { name: '광진구', code: '11215' },
    { name: '중랑구', code: '11260' },
    { name: '성북구', code: '11290' },
  ],
  '성북구': [
    { name: '종로구', code: '11110' },
    { name: '동대문구', code: '11230' },
    { name: '강북구', code: '11305' },
    { name: '노원구', code: '11350' },
  ],
  '강북구': [
    { name: '성북구', code: '11290' },
    { name: '도봉구', code: '11320' },
    { name: '노원구', code: '11350' },
  ],
  '도봉구': [
    { name: '강북구', code: '11305' },
    { name: '노원구', code: '11350' },
  ],
  '노원구': [
    { name: '도봉구', code: '11320' },
    { name: '강북구', code: '11305' },
    { name: '중랑구', code: '11260' },
  ],
  '중랑구': [
    { name: '동대문구', code: '11230' },
    { name: '광진구', code: '11215' },
    { name: '노원구', code: '11350' },
  ],
  '강동구': [
    { name: '송파구', code: '11710' },
    { name: '광진구', code: '11215' },
  ],
  '양천구': [
    { name: '영등포구', code: '11560' },
    { name: '구로구', code: '11530' },
    { name: '강서구', code: '11500' },
  ],
  '강서구': [
    { name: '양천구', code: '11470' },
    { name: '구로구', code: '11530' },
  ],
  '구로구': [
    { name: '영등포구', code: '11560' },
    { name: '금천구', code: '11545' },
    { name: '양천구', code: '11470' },
    { name: '관악구', code: '11620' },
  ],
  '금천구': [
    { name: '구로구', code: '11530' },
    { name: '관악구', code: '11620' },
  ],
};

/**
 * Get adjacent districts for a given district
 * Returns empty array if no adjacency mapping exists
 */
export function getAdjacentDistricts(district: string): { name: string; code: string }[] {
  return ADJACENT_DISTRICTS[district] || [];
}
