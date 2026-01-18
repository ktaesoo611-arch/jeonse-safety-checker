/**
 * Seoul and Gyeonggi District and Neighborhood Data with English Translations
 * Used for structured address input in MOLIT API integration
 */

import apartmentDatabaseJson from './apartment-database.json';

export interface Dong {
  name: string;
  nameEn: string;
  code: string; // bjdongCd (법정동코드, 5 digits)
}

export interface District {
  name: string;
  nameEn: string;
  code: string; // sigunguCd (시군구코드, 5 digits)
  dongs: Dong[];
}

export interface City {
  name: string;
  nameEn: string;
  code: string;
}

export const SUPPORTED_CITIES: City[] = [
  { name: '서울특별시', nameEn: 'Seoul', code: '11' },
  { name: '경기도', nameEn: 'Gyeonggi-do', code: '41' }
];

export interface Apartment {
  name: string;
  nameEn?: string;
  dong?: string; // Neighborhood (동) where the apartment is located
  dongs?: string[]; // Multiple neighborhoods (for large complexes)
  district?: string; // District (구) where the apartment is located
  districtCode?: string; // District code for MOLIT API
  molitNames?: string[]; // Alternative names used in MOLIT database
  transactionCount?: number; // Number of recent transactions
  areas?: number[]; // Available unit sizes (㎡)
  priceRange?: {
    min: number;
    max: number;
  };
}

export const SEOUL_DISTRICTS: District[] = [
  {
    name: '강남구',
    nameEn: 'Gangnam-gu',
    code: '11680',
    dongs: [
      { name: '개포동', nameEn: 'Gaepo-dong', code: '10300' },
      { name: '논현동', nameEn: 'Nonhyeon-dong', code: '10800' },
      { name: '대치동', nameEn: 'Daechi-dong', code: '10500' },
      { name: '도곡동', nameEn: 'Dogok-dong', code: '10600' },
      { name: '삼성동', nameEn: 'Samseong-dong', code: '10100' },
      { name: '세곡동', nameEn: 'Segok-dong', code: '11000' },
      { name: '수서동', nameEn: 'Suseo-dong', code: '10700' },
      { name: '신사동', nameEn: 'Sinsa-dong', code: '10200' },
      { name: '압구정동', nameEn: 'Apgujeong-dong', code: '10400' },
      { name: '역삼동', nameEn: 'Yeoksam-dong', code: '10900' },
      { name: '율현동', nameEn: 'Yulhyeon-dong', code: '10650' },
      { name: '일원동', nameEn: 'Irwon-dong', code: '11100' },
      { name: '청담동', nameEn: 'Cheongdam-dong', code: '11200' }
    ]
  },
  {
    name: '강동구',
    nameEn: 'Gangdong-gu',
    code: '11740',
    dongs: [
      { name: '강일동', nameEn: 'Gangil-dong', code: '10800' },
      { name: '고덕동', nameEn: 'Godeok-dong', code: '10200' },
      { name: '둔촌동', nameEn: 'Dunchon-dong', code: '10500' },
      { name: '명일동', nameEn: 'Myeongil-dong', code: '10300' },
      { name: '상일동', nameEn: 'Sangil-dong', code: '10600' },
      { name: '성내동', nameEn: 'Seongnae-dong', code: '10700' },
      { name: '암사동', nameEn: 'Amsa-dong', code: '10100' },
      { name: '천호동', nameEn: 'Cheonho-dong', code: '10400' },
      { name: '하일동', nameEn: 'Hail-dong', code: '10900' }
    ]
  },
  {
    name: '강북구',
    nameEn: 'Gangbuk-gu',
    code: '11305',
    dongs: [
      { name: '번동', nameEn: 'Beon-dong', code: '10100' },
      { name: '미아동', nameEn: 'Mia-dong', code: '10200' },
      { name: '송중동', nameEn: 'Songjung-dong', code: '10700' },
      { name: '송천동', nameEn: 'Songcheon-dong', code: '10800' },
      { name: '삼양동', nameEn: 'Samyang-dong', code: '10600' },
      { name: '수유동', nameEn: 'Suyu-dong', code: '10300' },
      { name: '우이동', nameEn: 'Ui-dong', code: '10400' },
      { name: '인수동', nameEn: 'Insu-dong', code: '10500' },
      { name: '삼각산동', nameEn: 'Samgaksan-dong', code: '10100' },
      { name: '번1동', nameEn: 'Beon 1-dong', code: '10100' },
      { name: '번2동', nameEn: 'Beon 2-dong', code: '10100' },
      { name: '번3동', nameEn: 'Beon 3-dong', code: '10100' },
      { name: '수유1동', nameEn: 'Suyu 1-dong', code: '10300' }
    ]
  },
  {
    name: '강서구',
    nameEn: 'Gangseo-gu',
    code: '11500',
    dongs: [
      { name: '가양동', nameEn: 'Gayang-dong', code: '10100' },
      { name: '개화동', nameEn: 'Gaehwa-dong', code: '10100' },
      { name: '공항동', nameEn: 'Gonghang-dong', code: '10200' },
      { name: '과해동', nameEn: 'Gwahae-dong', code: '10100' },
      { name: '내발산동', nameEn: 'Naebalsan-dong', code: '10300' },
      { name: '등촌동', nameEn: 'Deungchon-dong', code: '10500' },
      { name: '마곡동', nameEn: 'Magok-dong', code: '10400' },
      { name: '방화동', nameEn: 'Banghwa-dong', code: '10600' },
      { name: '염창동', nameEn: 'Yeomchang-dong', code: '10700' },
      { name: '오곡동', nameEn: 'Ogok-dong', code: '10100' },
      { name: '오쇠동', nameEn: 'Osoe-dong', code: '10100' },
      { name: '외발산동', nameEn: 'Oebalsan-dong', code: '10800' },
      { name: '화곡동', nameEn: 'Hwagok-dong', code: '10900' }
    ]
  },
  {
    name: '관악구',
    nameEn: 'Gwanak-gu',
    code: '11620',
    dongs: [
      { name: '남현동', nameEn: 'Namhyeon-dong', code: '10300' },
      { name: '봉천동', nameEn: 'Bongcheon-dong', code: '10100' },
      { name: '신림동', nameEn: 'Sillim-dong', code: '10200' },
      { name: '중앙동', nameEn: 'Jungang-dong', code: '10100' },
      { name: '청룡동', nameEn: 'Cheongnyong-dong', code: '10100' },
      { name: '행운동', nameEn: 'Haengun-dong', code: '10100' },
      { name: '청림동', nameEn: 'Cheonglim-dong', code: '10100' },
      { name: '성현동', nameEn: 'Seonghyeon-dong', code: '10100' },
      { name: '낙성대동', nameEn: 'Nakseongdae-dong', code: '10100' },
      { name: '인헌동', nameEn: 'Inheon-dong', code: '10100' },
      { name: '조원동', nameEn: 'Jowon-dong', code: '10100' },
      { name: '신원동', nameEn: 'Sinwon-dong', code: '10200' },
      { name: '서림동', nameEn: 'Seorim-dong', code: '10200' },
      { name: '신사동', nameEn: 'Sinsa-dong', code: '10200' },
      { name: '미성동', nameEn: 'Miseong-dong', code: '10200' },
      { name: '난곡동', nameEn: 'Nan-gok-dong', code: '10200' },
      { name: '난향동', nameEn: 'Nanhyang-dong', code: '10200' },
      { name: '삼성동', nameEn: 'Samseong-dong', code: '10200' },
      { name: '대학동', nameEn: 'Daehak-dong', code: '10200' },
      { name: '보라매동', nameEn: 'Boramae-dong', code: '10100' }
    ]
  },
  {
    name: '광진구',
    nameEn: 'Gwangjin-gu',
    code: '11215',
    dongs: [
      { name: '광장동', nameEn: 'Gwangjang-dong', code: '10100' },
      { name: '구의동', nameEn: 'Guui-dong', code: '10200' },
      { name: '군자동', nameEn: 'Gunja-dong', code: '10500' },
      { name: '능동', nameEn: 'Neung-dong', code: '10300' },
      { name: '자양동', nameEn: 'Jayang-dong', code: '10400' },
      { name: '중곡동', nameEn: 'Junggok-dong', code: '10600' },
      { name: '화양동', nameEn: 'Hwayang-dong', code: '10700' }
    ]
  },
  {
    name: '구로구',
    nameEn: 'Guro-gu',
    code: '11530',
    dongs: [
      { name: '가리봉동', nameEn: 'Garibong-dong', code: '10100' },
      { name: '개봉동', nameEn: 'Gaebong-dong', code: '10800' },
      { name: '고척동', nameEn: 'Gocheok-dong', code: '10200' },
      { name: '구로동', nameEn: 'Guro-dong', code: '10300' },
      { name: '궁동', nameEn: 'Gung-dong', code: '10400' },
      { name: '디지털단지', nameEn: 'Digital Complex', code: '10300' },
      { name: '번대방동', nameEn: 'Beondaebang-dong', code: '10300' },
      { name: '신도림동', nameEn: 'Sindorim-dong', code: '10500' },
      { name: '오류동', nameEn: 'Oryu-dong', code: '10600' },
      { name: '온수동', nameEn: 'Onsu-dong', code: '10700' },
      { name: '천왕동', nameEn: 'Cheonwang-dong', code: '10600' },
      { name: '항동', nameEn: 'Hang-dong', code: '10900' }
    ]
  },
  {
    name: '금천구',
    nameEn: 'Geumcheon-gu',
    code: '11545',
    dongs: [
      { name: '가산동', nameEn: 'Gasan-dong', code: '10100' },
      { name: '독산동', nameEn: 'Doksan-dong', code: '10200' },
      { name: '시흥동', nameEn: 'Siheung-dong', code: '10300' }
    ]
  },
  {
    name: '노원구',
    nameEn: 'Nowon-gu',
    code: '11350',
    dongs: [
      { name: '공릉동', nameEn: 'Gongneung-dong', code: '10100' },
      { name: '상계동', nameEn: 'Sanggye-dong', code: '10200' },
      { name: '월계동', nameEn: 'Wolgye-dong', code: '10300' },
      { name: '중계동', nameEn: 'Junggye-dong', code: '10400' },
      { name: '하계동', nameEn: 'Hagye-dong', code: '10500' }
    ]
  },
  {
    name: '도봉구',
    nameEn: 'Dobong-gu',
    code: '11320',
    dongs: [
      { name: '도봉동', nameEn: 'Dobong-dong', code: '10100' },
      { name: '방학동', nameEn: 'Banghak-dong', code: '10200' },
      { name: '쌍문동', nameEn: 'Ssangmun-dong', code: '10300' },
      { name: '창동', nameEn: 'Chang-dong', code: '10400' }
    ]
  },
  {
    name: '동대문구',
    nameEn: 'Dongdaemun-gu',
    code: '11230',
    dongs: [
      { name: '답십리동', nameEn: 'Dapsimni-dong', code: '10100' },
      { name: '신설동', nameEn: 'Sinseol-dong', code: '10200' },
      { name: '용두동', nameEn: 'Yongdu-dong', code: '10300' },
      { name: '이문동', nameEn: 'Imun-dong', code: '10400' },
      { name: '장안동', nameEn: 'Jangan-dong', code: '10500' },
      { name: '전농동', nameEn: 'Jeonnong-dong', code: '10600' },
      { name: '제기동', nameEn: 'Jegi-dong', code: '10700' },
      { name: '청량리동', nameEn: 'Cheongnyangni-dong', code: '10800' },
      { name: '회기동', nameEn: 'Hoegi-dong', code: '10900' }
    ]
  },
  {
    name: '동작구',
    nameEn: 'Dongjak-gu',
    code: '11590',
    dongs: [
      { name: '노량진동', nameEn: 'Noryangjin-dong', code: '10100' },
      { name: '대방동', nameEn: 'Daebang-dong', code: '10200' },
      { name: '동작동', nameEn: 'Dongjak-dong', code: '10300' },
      { name: '본동', nameEn: 'Bon-dong', code: '10400' },
      { name: '사당동', nameEn: 'Sadang-dong', code: '10500' },
      { name: '상도동', nameEn: 'Sangdo-dong', code: '10600' },
      { name: '신대방동', nameEn: 'Sindaebang-dong', code: '10700' },
      { name: '흑석동', nameEn: 'Heukseok-dong', code: '10800' }
    ]
  },
  {
    name: '마포구',
    nameEn: 'Mapo-gu',
    code: '11440',
    dongs: [
      { name: '공덕동', nameEn: 'Gongdeok-dong', code: '10100' },
      { name: '구수동', nameEn: 'Gusu-dong', code: '10100' },
      { name: '노고산동', nameEn: 'Nogosan-dong', code: '11500' },
      { name: '대흥동', nameEn: 'Daeheung-dong', code: '11000' },
      { name: '도화동', nameEn: 'Dohwa-dong', code: '10200' },
      { name: '동교동', nameEn: 'Donggyo-dong', code: '12100' },
      { name: '마포동', nameEn: 'Mapo-dong', code: '11800' },
      { name: '망원동', nameEn: 'Mangwon-dong', code: '10400' },
      { name: '상수동', nameEn: 'Sangsu-dong', code: '10500' },
      { name: '서교동', nameEn: 'Seogyo-dong', code: '10900' },
      { name: '성산동', nameEn: 'Seongsan-dong', code: '10700' },
      { name: '신공덕동', nameEn: 'Singongdeok-dong', code: '11300' },
      { name: '신수동', nameEn: 'Sinsu-dong', code: '11400' },
      { name: '신정동', nameEn: 'Sinjeong-dong', code: '11900' },
      { name: '아현동', nameEn: 'Ahyeon-dong', code: '11100' },
      { name: '연남동', nameEn: 'Yeonnam-dong', code: '10800' },
      { name: '염리동', nameEn: 'Yeomni-dong', code: '11200' },
      { name: '용강동', nameEn: 'Yonggang-dong', code: '10300' },
      { name: '합정동', nameEn: 'Hapjeong-dong', code: '10600' },
      { name: '현석동', nameEn: 'Hyeonseok-dong', code: '12000' }
    ]
  },
  {
    name: '서대문구',
    nameEn: 'Seodaemun-gu',
    code: '11410',
    dongs: [
      { name: '남가좌동', nameEn: 'Namgajwa-dong', code: '12000' },
      { name: '냉천동', nameEn: 'Naengcheon-dong', code: '10100' },
      { name: '대신동', nameEn: 'Daesin-dong', code: '10300' },
      { name: '대현동', nameEn: 'Daehyeon-dong', code: '10400' },
      { name: '미근동', nameEn: 'Migeun-dong', code: '10200' },
      { name: '봉원동', nameEn: 'Bongwon-dong', code: '10500' },
      { name: '북가좌동', nameEn: 'Bukgajwa-dong', code: '10600' },
      { name: '북아현동', nameEn: 'Bugahyeon-dong', code: '10700' },
      { name: '신촌동', nameEn: 'Sinchon-dong', code: '10800' },
      { name: '연희동', nameEn: 'Yeonhui-dong', code: '10900' },
      { name: '영천동', nameEn: 'Yeongcheon-dong', code: '11000' },
      { name: '옥천동', nameEn: 'Okcheon-dong', code: '11100' },
      { name: '창천동', nameEn: 'Changcheon-dong', code: '11200' },
      { name: '천연동', nameEn: 'Cheonyeon-dong', code: '11300' },
      { name: '충정로', nameEn: 'Chungjeong-ro', code: '11400' },
      { name: '홍은동', nameEn: 'Hongeun-dong', code: '11800' },
      { name: '홍제동', nameEn: 'Hongje-dong', code: '11900' }
    ]
  },
  {
    name: '서초구',
    nameEn: 'Seocho-gu',
    code: '11650',
    dongs: [
      { name: '내곡동', nameEn: 'Naegok-dong', code: '10100' },
      { name: '반포동', nameEn: 'Banpo-dong', code: '10200' },
      { name: '방배동', nameEn: 'Bangbae-dong', code: '10300' },
      { name: '서초동', nameEn: 'Seocho-dong', code: '10400' },
      { name: '신원동', nameEn: 'Sinwon-dong', code: '10500' },
      { name: '양재동', nameEn: 'Yangjae-dong', code: '10600' },
      { name: '염곡동', nameEn: 'Yeomgok-dong', code: '10700' },
      { name: '우면동', nameEn: 'Umyeon-dong', code: '10800' },
      { name: '원지동', nameEn: 'Wonji-dong', code: '10900' },
      { name: '잠원동', nameEn: 'Jamwon-dong', code: '11000' }
    ]
  },
  {
    name: '성동구',
    nameEn: 'Seongdong-gu',
    code: '11200',
    dongs: [
      { name: '금호동1가', nameEn: 'Geumho-dong 1-ga', code: '10100' },
      { name: '금호동2가', nameEn: 'Geumho-dong 2-ga', code: '10200' },
      { name: '금호동3가', nameEn: 'Geumho-dong 3-ga', code: '10300' },
      { name: '금호동4가', nameEn: 'Geumho-dong 4-ga', code: '10400' },
      { name: '도선동', nameEn: 'Doseon-dong', code: '10500' },
      { name: '마장동', nameEn: 'Majang-dong', code: '10600' },
      { name: '사근동', nameEn: 'Sageun-dong', code: '10700' },
      { name: '상왕십리동', nameEn: 'Sangwangsimni-dong', code: '10800' },
      { name: '성수동1가', nameEn: 'Seongsu-dong 1-ga', code: '10900' },
      { name: '성수동2가', nameEn: 'Seongsu-dong 2-ga', code: '11000' },
      { name: '송정동', nameEn: 'Songjeong-dong', code: '11100' },
      { name: '용답동', nameEn: 'Yongdap-dong', code: '11300' },
      { name: '옥수동', nameEn: 'Oksu-dong', code: '11200' },
      { name: '왕십리동', nameEn: 'Wangsimni-dong', code: '10800' },
      { name: '왕십리2동', nameEn: 'Wangsimni 2-dong', code: '10800' },
      { name: '하왕십리동', nameEn: 'Hawangsimni-dong', code: '11500' },
      { name: '행당동', nameEn: 'Haengdang-dong', code: '11600' },
      { name: '홍익동', nameEn: 'Hongik-dong', code: '11700' },
      { name: '응봉동', nameEn: 'Eungbong-dong', code: '11400' }
    ]
  },
  {
    name: '성북구',
    nameEn: 'Seongbuk-gu',
    code: '11290',
    dongs: [
      { name: '길음동', nameEn: 'Gireum-dong', code: '10100' },
      { name: '돈암동', nameEn: 'Donam-dong', code: '10200' },
      { name: '돈암동1가', nameEn: 'Donam-dong 1-ga', code: '10200' },
      { name: '돈암동2가', nameEn: 'Donam-dong 2-ga', code: '10200' },
      { name: '동선동', nameEn: 'Dongseon-dong', code: '10300' },
      { name: '동선동1가', nameEn: 'Dongseon-dong 1-ga', code: '10300' },
      { name: '동선동2가', nameEn: 'Dongseon-dong 2-ga', code: '10400' },
      { name: '동선동3가', nameEn: 'Dongseon-dong 3-ga', code: '10500' },
      { name: '동선동4가', nameEn: 'Dongseon-dong 4-ga', code: '10600' },
      { name: '동선동5가', nameEn: 'Dongseon-dong 5-ga', code: '10700' },
      { name: '동소문동', nameEn: 'Dongsomun-dong', code: '10800' },
      { name: '동소문동1가', nameEn: 'Dongsomun-dong 1-ga', code: '10800' },
      { name: '동소문동2가', nameEn: 'Dongsomun-dong 2-ga', code: '10900' },
      { name: '동소문동3가', nameEn: 'Dongsomun-dong 3-ga', code: '11000' },
      { name: '동소문동4가', nameEn: 'Dongsomun-dong 4-ga', code: '11100' },
      { name: '동소문동5가', nameEn: 'Dongsomun-dong 5-ga', code: '11200' },
      { name: '동소문동6가', nameEn: 'Dongsomun-dong 6-ga', code: '11300' },
      { name: '동소문동7가', nameEn: 'Dongsomun-dong 7-ga', code: '11400' },
      { name: '보문동', nameEn: 'Bomun-dong', code: '11500' },
      { name: '보문동1가', nameEn: 'Bomun-dong 1-ga', code: '11500' },
      { name: '보문동2가', nameEn: 'Bomun-dong 2-ga', code: '11600' },
      { name: '보문동3가', nameEn: 'Bomun-dong 3-ga', code: '11700' },
      { name: '보문동4가', nameEn: 'Bomun-dong 4-ga', code: '11800' },
      { name: '보문동5가', nameEn: 'Bomun-dong 5-ga', code: '11900' },
      { name: '보문동6가', nameEn: 'Bomun-dong 6-ga', code: '12000' },
      { name: '보문동7가', nameEn: 'Bomun-dong 7-ga', code: '12100' },
      { name: '삼선동', nameEn: 'Samseon-dong', code: '12200' },
      { name: '삼선동1가', nameEn: 'Samseon-dong 1-ga', code: '12200' },
      { name: '삼선동2가', nameEn: 'Samseon-dong 2-ga', code: '12300' },
      { name: '삼선동3가', nameEn: 'Samseon-dong 3-ga', code: '12400' },
      { name: '삼선동4가', nameEn: 'Samseon-dong 4-ga', code: '12500' },
      { name: '삼선동5가', nameEn: 'Samseon-dong 5-ga', code: '12600' },
      { name: '석관동', nameEn: 'Seokgwan-dong', code: '12800' },
      { name: '성북동', nameEn: 'Seongbuk-dong', code: '12900' },
      { name: '성북동1가', nameEn: 'Seongbuk-dong 1-ga', code: '13000' },
      { name: '안암동', nameEn: 'Anam-dong', code: '13100' },
      { name: '안암동1가', nameEn: 'Anam-dong 1-ga', code: '13100' },
      { name: '안암동2가', nameEn: 'Anam-dong 2-ga', code: '13200' },
      { name: '안암동3가', nameEn: 'Anam-dong 3-ga', code: '13300' },
      { name: '안암동4가', nameEn: 'Anam-dong 4-ga', code: '13400' },
      { name: '안암동5가', nameEn: 'Anam-dong 5-ga', code: '13500' },
      { name: '장위동', nameEn: 'Jangwi-dong', code: '13600' },
      { name: '정릉동', nameEn: 'Jeongneung-dong', code: '13700' },
      { name: '종암동', nameEn: 'Jongam-dong', code: '13800' }
    ]
  },
  {
    name: '송파구',
    nameEn: 'Songpa-gu',
    code: '11710',
    dongs: [
      { name: '가락동', nameEn: 'Garak-dong', code: '10100' },
      { name: '거여동', nameEn: 'Geoyeo-dong', code: '10200' },
      { name: '마천동', nameEn: 'Macheon-dong', code: '10300' },
      { name: '문정동', nameEn: 'Munjeong-dong', code: '10400' },
      { name: '방이동', nameEn: 'Bangi-dong', code: '10500' },
      { name: '삼전동', nameEn: 'Samjeon-dong', code: '10600' },
      { name: '석촌동', nameEn: 'Seokchon-dong', code: '10700' },
      { name: '송파동', nameEn: 'Songpa-dong', code: '10800' },
      { name: '신천동', nameEn: 'Sincheon-dong', code: '10900' },
      { name: '오금동', nameEn: 'Ogeum-dong', code: '11000' },
      { name: '장지동', nameEn: 'Jangji-dong', code: '11200' },
      { name: '잠실동', nameEn: 'Jamsil-dong', code: '11100' },
      { name: '풍납동', nameEn: 'Pungnap-dong', code: '11300' }
    ]
  },
  {
    name: '양천구',
    nameEn: 'Yangcheon-gu',
    code: '11470',
    dongs: [
      { name: '목동', nameEn: 'Mok-dong', code: '10100' },
      { name: '신월동', nameEn: 'Sinwol-dong', code: '10200' },
      { name: '신정동', nameEn: 'Sinjeong-dong', code: '10300' },
      { name: '신월1동', nameEn: 'Sinwol 1-dong', code: '10200' },
      { name: '신월2동', nameEn: 'Sinwol 2-dong', code: '10200' },
      { name: '신월3동', nameEn: 'Sinwol 3-dong', code: '10200' },
      { name: '신월4동', nameEn: 'Sinwol 4-dong', code: '10200' },
      { name: '신월5동', nameEn: 'Sinwol 5-dong', code: '10200' },
      { name: '신월6동', nameEn: 'Sinwol 6-dong', code: '10200' },
      { name: '신월7동', nameEn: 'Sinwol 7-dong', code: '10200' },
      { name: '신정1동', nameEn: 'Sinjeong 1-dong', code: '10300' },
      { name: '신정2동', nameEn: 'Sinjeong 2-dong', code: '10300' },
      { name: '신정3동', nameEn: 'Sinjeong 3-dong', code: '10300' },
      { name: '신정4동', nameEn: 'Sinjeong 4-dong', code: '10300' },
      { name: '신정6동', nameEn: 'Sinjeong 6-dong', code: '10300' },
      { name: '신정7동', nameEn: 'Sinjeong 7-dong', code: '10300' },
      { name: '목1동', nameEn: 'Mok 1-dong', code: '10100' },
      { name: '목2동', nameEn: 'Mok 2-dong', code: '10100' },
      { name: '목3동', nameEn: 'Mok 3-dong', code: '10100' },
      { name: '목4동', nameEn: 'Mok 4-dong', code: '10100' },
      { name: '목5동', nameEn: 'Mok 5-dong', code: '10100' }
    ]
  },
  {
    name: '영등포구',
    nameEn: 'Yeongdeungpo-gu',
    code: '11560',
    dongs: [
      { name: '당산동', nameEn: 'Dangsan-dong', code: '10700' },
      { name: '당산동1가', nameEn: 'Dangsan-dong 1-ga', code: '10100' },
      { name: '당산동2가', nameEn: 'Dangsan-dong 2-ga', code: '10200' },
      { name: '당산동3가', nameEn: 'Dangsan-dong 3-ga', code: '10300' },
      { name: '당산동4가', nameEn: 'Dangsan-dong 4-ga', code: '10400' },
      { name: '당산동5가', nameEn: 'Dangsan-dong 5-ga', code: '10500' },
      { name: '당산동6가', nameEn: 'Dangsan-dong 6-ga', code: '10600' },
      { name: '대림동', nameEn: 'Daerim-dong', code: '10800' },
      { name: '도림동', nameEn: 'Dorim-dong', code: '10900' },
      { name: '신길동', nameEn: 'Singil-dong', code: '11600' },
      { name: '문래동', nameEn: 'Mullae-dong', code: '11000' },
      { name: '문래동1가', nameEn: 'Mullae-dong 1-ga', code: '11000' },
      { name: '문래동2가', nameEn: 'Mullae-dong 2-ga', code: '11100' },
      { name: '문래동3가', nameEn: 'Mullae-dong 3-ga', code: '11200' },
      { name: '문래동4가', nameEn: 'Mullae-dong 4-ga', code: '11300' },
      { name: '문래동5가', nameEn: 'Mullae-dong 5-ga', code: '11400' },
      { name: '문래동6가', nameEn: 'Mullae-dong 6-ga', code: '11500' },
      { name: '양평동', nameEn: 'Yangpyeong-dong', code: '11700' },
      { name: '양평동1가', nameEn: 'Yangpyeong-dong 1-ga', code: '11700' },
      { name: '양평동2가', nameEn: 'Yangpyeong-dong 2-ga', code: '11800' },
      { name: '양평동3가', nameEn: 'Yangpyeong-dong 3-ga', code: '11900' },
      { name: '양평동4가', nameEn: 'Yangpyeong-dong 4-ga', code: '12000' },
      { name: '양평동5가', nameEn: 'Yangpyeong-dong 5-ga', code: '12100' },
      { name: '양평동6가', nameEn: 'Yangpyeong-dong 6-ga', code: '12200' },
      { name: '양화동', nameEn: 'Yanghwa-dong', code: '12300' },
      { name: '여의도동', nameEn: 'Yeouido-dong', code: '12400' },
      { name: '영등포동', nameEn: 'Yeongdeungpo-dong', code: '12500' },
      { name: '영등포동1가', nameEn: 'Yeongdeungpo-dong 1-ga', code: '12600' },
      { name: '영등포동2가', nameEn: 'Yeongdeungpo-dong 2-ga', code: '12700' },
      { name: '영등포동3가', nameEn: 'Yeongdeungpo-dong 3-ga', code: '12800' },
      { name: '영등포동4가', nameEn: 'Yeongdeungpo-dong 4-ga', code: '12900' },
      { name: '영등포동5가', nameEn: 'Yeongdeungpo-dong 5-ga', code: '13000' },
      { name: '영등포동6가', nameEn: 'Yeongdeungpo-dong 6-ga', code: '13100' },
      { name: '영등포동7가', nameEn: 'Yeongdeungpo-dong 7-ga', code: '13200' },
      { name: '영등포동8가', nameEn: 'Yeongdeungpo-dong 8-ga', code: '13300' }
    ]
  },
  {
    name: '용산구',
    nameEn: 'Yongsan-gu',
    code: '11170',
    dongs: [
      { name: '갈월동', nameEn: 'Galwol-dong', code: '10100' },
      { name: '남영동', nameEn: 'Namyeong-dong', code: '10200' },
      { name: '도원동', nameEn: 'Dowon-dong', code: '10200' },
      { name: '동빙고동', nameEn: 'Dongbinggo-dong', code: '10300' },
      { name: '동자동', nameEn: 'Dongja-dong', code: '10400' },
      { name: '문배동', nameEn: 'Munbae-dong', code: '10500' },
      { name: '보광동', nameEn: 'Bogwang-dong', code: '10600' },
      { name: '산천동', nameEn: 'Sancheon-dong', code: '10700' },
      { name: '서계동', nameEn: 'Seogye-dong', code: '10800' },
      { name: '서빙고동', nameEn: 'Seobinggo-dong', code: '10900' },
      { name: '신계동', nameEn: 'Singye-dong', code: '11000' },
      { name: '신창동', nameEn: 'Sinchang-dong', code: '11100' },
      { name: '원효로1가', nameEn: 'Wonhyo-ro 1-ga', code: '11900' },
      { name: '원효로2가', nameEn: 'Wonhyo-ro 2-ga', code: '12000' },
      { name: '원효로3가', nameEn: 'Wonhyo-ro 3-ga', code: '12100' },
      { name: '원효로4가', nameEn: 'Wonhyo-ro 4-ga', code: '12200' },
      { name: '용문동', nameEn: 'Yongmun-dong', code: '11200' },
      { name: '용산동1가', nameEn: 'Yongsan-dong 1-ga', code: '11300' },
      { name: '용산동2가', nameEn: 'Yongsan-dong 2-ga', code: '11400' },
      { name: '용산동3가', nameEn: 'Yongsan-dong 3-ga', code: '11500' },
      { name: '용산동4가', nameEn: 'Yongsan-dong 4-ga', code: '11600' },
      { name: '용산동5가', nameEn: 'Yongsan-dong 5-ga', code: '11700' },
      { name: '용산동6가', nameEn: 'Yongsan-dong 6-ga', code: '11800' },
      { name: '이촌동', nameEn: 'Ichon-dong', code: '12300' },
      { name: '이태원동', nameEn: 'Itaewon-dong', code: '12400' },
      { name: '주성동', nameEn: 'Juseong-dong', code: '12500' },
      { name: '청파동1가', nameEn: 'Cheongpa-dong 1-ga', code: '12700' },
      { name: '청파동2가', nameEn: 'Cheongpa-dong 2-ga', code: '12800' },
      { name: '청파동3가', nameEn: 'Cheongpa-dong 3-ga', code: '12900' },
      { name: '한강로1가', nameEn: 'Hangang-ro 1-ga', code: '13000' },
      { name: '한강로2가', nameEn: 'Hangang-ro 2-ga', code: '13100' },
      { name: '한강로3가', nameEn: 'Hangang-ro 3-ga', code: '13200' },
      { name: '한남동', nameEn: 'Hannam-dong', code: '13300' },
      { name: '효창동', nameEn: 'Hyochang-dong', code: '13400' },
      { name: '후암동', nameEn: 'Huam-dong', code: '13500' }
    ]
  },
  {
    name: '은평구',
    nameEn: 'Eunpyeong-gu',
    code: '11380',
    dongs: [
      { name: '갈현동', nameEn: 'Galhyeon-dong', code: '10100' },
      { name: '구산동', nameEn: 'Gusan-dong', code: '10200' },
      { name: '녹번동', nameEn: 'Nokbeon-dong', code: '10300' },
      { name: '대조동', nameEn: 'Daejo-dong', code: '10400' },
      { name: '불광동', nameEn: 'Bulgwang-dong', code: '10500' },
      { name: '수색동', nameEn: 'Susaek-dong', code: '10600' },
      { name: '신사동', nameEn: 'Sinsa-dong', code: '10700' },
      { name: '역촌동', nameEn: 'Yeokchon-dong', code: '10800' },
      { name: '응암동', nameEn: 'Eungam-dong', code: '10900' },
      { name: '증산동', nameEn: 'Jeungsan-dong', code: '11000' },
      { name: '진관동', nameEn: 'Jingwan-dong', code: '11100' }
    ]
  },
  {
    name: '종로구',
    nameEn: 'Jongno-gu',
    code: '11110',
    dongs: [
      { name: '가회동', nameEn: 'Gahoe-dong', code: '10100' },
      { name: '견지동', nameEn: 'Gyeonji-dong', code: '10300' },
      { name: '경운동', nameEn: 'Gyeong-un-dong', code: '10400' },
      { name: '계동', nameEn: 'Gye-dong', code: '10200' },
      { name: '공평동', nameEn: 'Gongpyeong-dong', code: '10500' },
      { name: '관수동', nameEn: 'Gwansu-dong', code: '10600' },
      { name: '관철동', nameEn: 'Gwancheol-dong', code: '10700' },
      { name: '관훈동', nameEn: 'Gwanhun-dong', code: '10800' },
      { name: '관철동', nameEn: 'Gwancheol-dong', code: '10700' },
      { name: '교남동', nameEn: 'Gyonam-dong', code: '10900' },
      { name: '교북동', nameEn: 'Gyobuk-dong', code: '11000' },
      { name: '구기동', nameEn: 'Gugi-dong', code: '11100' },
      { name: '궁정동', nameEn: 'Gungjeong-dong', code: '11200' },
      { name: '권농동', nameEn: 'Gwonnong-dong', code: '11300' },
      { name: '낙원동', nameEn: 'Nagwon-dong', code: '11400' },
      { name: '내수동', nameEn: 'Naesu-dong', code: '11500' },
      { name: '내자동', nameEn: 'Naeja-dong', code: '11600' },
      { name: '누상동', nameEn: 'Nusang-dong', code: '11700' },
      { name: '누하동', nameEn: 'Nuha-dong', code: '11800' },
      { name: '당주동', nameEn: 'Dangju-dong', code: '11900' },
      { name: '도렴동', nameEn: 'Doryeom-dong', code: '12000' },
      { name: '돈의동', nameEn: 'Donui-dong', code: '12100' },
      { name: '동숭동', nameEn: 'Dongsung-dong', code: '12200' },
      { name: '묘동', nameEn: 'Myo-dong', code: '12700' },
      { name: '무악동', nameEn: 'Muak-dong', code: '12800' },
      { name: '부암동', nameEn: 'Buam-dong', code: '13000' },
      { name: '봉익동', nameEn: 'Bongik-dong', code: '12900' },
      { name: '사간동', nameEn: 'Sagan-dong', code: '13100' },
      { name: '사직동', nameEn: 'Sajik-dong', code: '13200' },
      { name: '삼청동', nameEn: 'Samcheong-dong', code: '13300' },
      { name: '서린동', nameEn: 'Seorin-dong', code: '13400' },
      { name: '세종로', nameEn: 'Sejong-ro', code: '13500' },
      { name: '소격동', nameEn: 'Sogyeok-dong', code: '13600' },
      { name: '송월동', nameEn: 'Songwol-dong', code: '13700' },
      { name: '송현동', nameEn: 'Songhyeon-dong', code: '13800' },
      { name: '수송동', nameEn: 'Susong-dong', code: '13900' },
      { name: '숭인동', nameEn: 'Sungin-dong', code: '14000' },
      { name: '신교동', nameEn: 'Singyo-dong', code: '14100' },
      { name: '신문로1가', nameEn: 'Sinmun-ro 1-ga', code: '14200' },
      { name: '신문로2가', nameEn: 'Sinmun-ro 2-ga', code: '14300' },
      { name: '신영동', nameEn: 'Sinyeong-dong', code: '14400' },
      { name: '안국동', nameEn: 'Anguk-dong', code: '14500' },
      { name: '연건동', nameEn: 'Yeongeon-dong', code: '14600' },
      { name: '연지동', nameEn: 'Yeonji-dong', code: '14700' },
      { name: '예지동', nameEn: 'Yeji-dong', code: '14800' },
      { name: '옥인동', nameEn: 'Ogin-dong', code: '14900' },
      { name: '와룡동', nameEn: 'Waryong-dong', code: '15000' },
      { name: '운니동', nameEn: 'Unni-dong', code: '15100' },
      { name: '원남동', nameEn: 'Wonnam-dong', code: '15200' },
      { name: '원서동', nameEn: 'Wonseo-dong', code: '15300' },
      { name: '이화동', nameEn: 'Ihwa-dong', code: '15400' },
      { name: '익선동', nameEn: 'Ikseon-dong', code: '15500' },
      { name: '인사동', nameEn: 'Insa-dong', code: '15600' },
      { name: '인의동', nameEn: 'Inui-dong', code: '15700' },
      { name: '장사동', nameEn: 'Jangsa-dong', code: '15800' },
      { name: '재동', nameEn: 'Jae-dong', code: '15900' },
      { name: '적선동', nameEn: 'Jeokseon-dong', code: '16000' },
      { name: '종로1가', nameEn: 'Jongno 1-ga', code: '16100' },
      { name: '종로2가', nameEn: 'Jongno 2-ga', code: '16200' },
      { name: '종로3가', nameEn: 'Jongno 3-ga', code: '16300' },
      { name: '종로4가', nameEn: 'Jongno 4-ga', code: '16400' },
      { name: '종로5가', nameEn: 'Jongno 5-ga', code: '16500' },
      { name: '종로6가', nameEn: 'Jongno 6-ga', code: '16600' },
      { name: '중학동', nameEn: 'Junghak-dong', code: '16700' },
      { name: '창성동', nameEn: 'Changseong-dong', code: '16800' },
      { name: '창신동', nameEn: 'Changsin-dong', code: '16900' },
      { name: '청운동', nameEn: 'Cheongun-dong', code: '17000' },
      { name: '청진동', nameEn: 'Cheongjin-dong', code: '17100' },
      { name: '체부동', nameEn: 'Chebu-dong', code: '17200' },
      { name: '충신동', nameEn: 'Chungsin-dong', code: '17300' },
      { name: '통의동', nameEn: 'Tongui-dong', code: '17400' },
      { name: '통인동', nameEn: 'Tongin-dong', code: '17500' },
      { name: '팔판동', nameEn: 'Palpan-dong', code: '17600' },
      { name: '평동', nameEn: 'Pyeong-dong', code: '17700' },
      { name: '평창동', nameEn: 'Pyeongchang-dong', code: '17800' },
      { name: '필운동', nameEn: 'Pirun-dong', code: '17900' },
      { name: '행촌동', nameEn: 'Haengchon-dong', code: '18000' },
      { name: '혜화동', nameEn: 'Hyehwa-dong', code: '18100' },
      { name: '홍지동', nameEn: 'Hongji-dong', code: '18200' },
      { name: '홍파동', nameEn: 'Hongpa-dong', code: '18300' },
      { name: '화동', nameEn: 'Hwa-dong', code: '18400' },
      { name: '효자동', nameEn: 'Hyoja-dong', code: '18500' },
      { name: '효제동', nameEn: 'Hyoje-dong', code: '18100' },
      { name: '훈정동', nameEn: 'Hunjeong-dong', code: '18600' }
    ]
  },
  {
    name: '중구',
    nameEn: 'Jung-gu',
    code: '11140',
    dongs: [
      { name: '광희동', nameEn: 'Gwanghui-dong', code: '10100' },
      { name: '남대문로1가', nameEn: 'Namdaemun-ro 1-ga', code: '10300' },
      { name: '남대문로2가', nameEn: 'Namdaemun-ro 2-ga', code: '10400' },
      { name: '남대문로3가', nameEn: 'Namdaemun-ro 3-ga', code: '10500' },
      { name: '남대문로4가', nameEn: 'Namdaemun-ro 4-ga', code: '10600' },
      { name: '남대문로5가', nameEn: 'Namdaemun-ro 5-ga', code: '10700' },
      { name: '남산동1가', nameEn: 'Namsan-dong 1-ga', code: '10800' },
      { name: '남산동2가', nameEn: 'Namsan-dong 2-ga', code: '10900' },
      { name: '남산동3가', nameEn: 'Namsan-dong 3-ga', code: '11000' },
      { name: '남창동', nameEn: 'Namchang-dong', code: '11100' },
      { name: '남학동', nameEn: 'Namhak-dong', code: '11200' },
      { name: '다동', nameEn: 'Da-dong', code: '11300' },
      { name: '덕수궁길', nameEn: 'Deoksugung-gil', code: '15400' },
      { name: '무교동', nameEn: 'Mugyo-dong', code: '11800' },
      { name: '명동1가', nameEn: 'Myeong-dong 1-ga', code: '11600' },
      { name: '명동2가', nameEn: 'Myeong-dong 2-ga', code: '11700' },
      { name: '무학동', nameEn: 'Muhak-dong', code: '11900' },
      { name: '북창동', nameEn: 'Bukchang-dong', code: '12400' },
      { name: '봉래동1가', nameEn: 'Bongnae-dong 1-ga', code: '12200' },
      { name: '봉래동2가', nameEn: 'Bongnae-dong 2-ga', code: '12300' },
      { name: '산림동', nameEn: 'Sallim-dong', code: '12500' },
      { name: '서소문동', nameEn: 'Seosomun-dong', code: '12700' },
      { name: '소공동', nameEn: 'Sogong-dong', code: '12800' },
      { name: '수표동', nameEn: 'Supyo-dong', code: '12900' },
      { name: '수하동', nameEn: 'Suha-dong', code: '13000' },
      { name: '순화동', nameEn: 'Sunhwa-dong', code: '13100' },
      { name: '신당동', nameEn: 'Sindang-dong', code: '13200' },
      { name: '쌍림동', nameEn: 'Ssanglim-dong', code: '13300' },
      { name: '예관동', nameEn: 'Yegwan-dong', code: '13400' },
      { name: '예장동', nameEn: 'Yejang-dong', code: '13500' },
      { name: '오장동', nameEn: 'Ojang-dong', code: '13600' },
      { name: '을지로1가', nameEn: 'Euljiro 1-ga', code: '13700' },
      { name: '을지로2가', nameEn: 'Euljiro 2-ga', code: '13800' },
      { name: '을지로3가', nameEn: 'Euljiro 3-ga', code: '13900' },
      { name: '을지로4가', nameEn: 'Euljiro 4-ga', code: '14000' },
      { name: '을지로5가', nameEn: 'Euljiro 5-ga', code: '14100' },
      { name: '을지로6가', nameEn: 'Euljiro 6-ga', code: '14200' },
      { name: '을지로7가', nameEn: 'Euljiro 7-ga', code: '14300' },
      { name: '의주로1가', nameEn: 'Uiju-ro 1-ga', code: '14400' },
      { name: '의주로2가', nameEn: 'Uiju-ro 2-ga', code: '14500' },
      { name: '인현동1가', nameEn: 'Inhyeon-dong 1-ga', code: '14600' },
      { name: '인현동2가', nameEn: 'Inhyeon-dong 2-ga', code: '14700' },
      { name: '입정동', nameEn: 'Ipjeong-dong', code: '14800' },
      { name: '장교동', nameEn: 'Janggyo-dong', code: '14900' },
      { name: '장충동1가', nameEn: 'Jangchung-dong 1-ga', code: '15000' },
      { name: '장충동2가', nameEn: 'Jangchung-dong 2-ga', code: '15100' },
      { name: '저동1가', nameEn: 'Jeo-dong 1-ga', code: '15200' },
      { name: '저동2가', nameEn: 'Jeo-dong 2-ga', code: '15300' },
      { name: '정동', nameEn: 'Jeong-dong', code: '15400' },
      { name: '주교동', nameEn: 'Jugyo-dong', code: '15500' },
      { name: '주자동', nameEn: 'Juja-dong', code: '15600' },
      { name: '중림동', nameEn: 'Jungnim-dong', code: '15700' },
      { name: '초동', nameEn: 'Cho-dong', code: '15800' },
      { name: '충무로1가', nameEn: 'Chungmuro 1-ga', code: '15900' },
      { name: '충무로2가', nameEn: 'Chungmuro 2-ga', code: '16000' },
      { name: '충무로3가', nameEn: 'Chungmuro 3-ga', code: '16100' },
      { name: '충무로4가', nameEn: 'Chungmuro 4-ga', code: '16200' },
      { name: '충무로5가', nameEn: 'Chungmuro 5-ga', code: '16300' },
      { name: '태평로1가', nameEn: 'Taepyeong-ro 1-ga', code: '16500' },
      { name: '태평로2가', nameEn: 'Taepyeong-ro 2-ga', code: '16600' },
      { name: '퇴계로1가', nameEn: 'Toegye-ro 1-ga', code: '15900' },
      { name: '퇴계로2가', nameEn: 'Toegye-ro 2-ga', code: '16000' },
      { name: '퇴계로3가', nameEn: 'Toegye-ro 3-ga', code: '16100' },
      { name: '퇴계로4가', nameEn: 'Toegye-ro 4-ga', code: '16200' },
      { name: '퇴계로5가', nameEn: 'Toegye-ro 5-ga', code: '16300' },
      { name: '퇴계로6가', nameEn: 'Toegye-ro 6-ga', code: '16300' },
      { name: '필동1가', nameEn: 'Pil-dong 1-ga', code: '16700' },
      { name: '필동2가', nameEn: 'Pil-dong 2-ga', code: '16800' },
      { name: '필동3가', nameEn: 'Pil-dong 3-ga', code: '16900' },
      { name: '황학동', nameEn: 'Hwanghak-dong', code: '17000' },
      { name: '회현동1가', nameEn: 'Hoehyeon-dong 1-ga', code: '17100' },
      { name: '회현동2가', nameEn: 'Hoehyeon-dong 2-ga', code: '17200' },
      { name: '회현동3가', nameEn: 'Hoehyeon-dong 3-ga', code: '17300' },
      { name: '흥인동', nameEn: 'Heungin-dong', code: '17400' }
    ]
  },
  {
    name: '중랑구',
    nameEn: 'Jungnang-gu',
    code: '11260',
    dongs: [
      { name: '망우동', nameEn: 'Mangu-dong', code: '10100' },
      { name: '면목동', nameEn: 'Myeonmok-dong', code: '10200' },
      { name: '묵동', nameEn: 'Muk-dong', code: '10300' },
      { name: '상봉동', nameEn: 'Sangbong-dong', code: '10400' },
      { name: '신내동', nameEn: 'Sinnae-dong', code: '10500' },
      { name: '중화동', nameEn: 'Junghwa-dong', code: '10600' }
    ]
  }
];

/**
 * Gyeonggi Province Districts with Neighborhoods
 * Major cities in the Seoul Metropolitan Area
 */
export const GYEONGGI_DISTRICTS: District[] = [
  // 성남시 (Seongnam) - Major jeonse market
  {
    name: '성남시 분당구',
    nameEn: 'Seongnam-si Bundang-gu',
    code: '41135',
    dongs: [
      { name: '분당동', nameEn: 'Bundang-dong', code: '10100' },
      { name: '수내동', nameEn: 'Sunae-dong', code: '10200' },
      { name: '정자동', nameEn: 'Jeongja-dong', code: '10300' },
      { name: '서현동', nameEn: 'Seohyeon-dong', code: '10400' },
      { name: '이매동', nameEn: 'Imae-dong', code: '10500' },
      { name: '야탑동', nameEn: 'Yatap-dong', code: '10600' },
      { name: '판교동', nameEn: 'Pangyo-dong', code: '10700' },
      { name: '삼평동', nameEn: 'Sampyeong-dong', code: '10800' },
      { name: '백현동', nameEn: 'Baekhyeon-dong', code: '10900' },
      { name: '금곡동', nameEn: 'Geumgok-dong', code: '11000' },
      { name: '궁내동', nameEn: 'Gungnae-dong', code: '11100' },
      { name: '동원동', nameEn: 'Dongwon-dong', code: '11200' },
      { name: '구미동', nameEn: 'Gumi-dong', code: '11300' },
      { name: '운중동', nameEn: 'Unjung-dong', code: '11400' },
      { name: '대장동', nameEn: 'Daejang-dong', code: '11500' }
    ]
  },
  {
    name: '성남시 수정구',
    nameEn: 'Seongnam-si Sujeong-gu',
    code: '41131',
    dongs: [
      { name: '신흥동', nameEn: 'Sinheung-dong', code: '10100' },
      { name: '태평동', nameEn: 'Taepyeong-dong', code: '10200' },
      { name: '수진동', nameEn: 'Sujin-dong', code: '10300' },
      { name: '단대동', nameEn: 'Dandae-dong', code: '10400' },
      { name: '산성동', nameEn: 'Sanseong-dong', code: '10500' },
      { name: '양지동', nameEn: 'Yangji-dong', code: '10600' },
      { name: '복정동', nameEn: 'Bokjeong-dong', code: '10700' },
      { name: '창곡동', nameEn: 'Changgok-dong', code: '10800' },
      { name: '금토동', nameEn: 'Geumto-dong', code: '10900' },
      { name: '시흥동', nameEn: 'Siheung-dong', code: '11000' },
      { name: '고등동', nameEn: 'Godeung-dong', code: '11100' }
    ]
  },
  {
    name: '성남시 중원구',
    nameEn: 'Seongnam-si Jungwon-gu',
    code: '41133',
    dongs: [
      { name: '성남동', nameEn: 'Seongnam-dong', code: '10100' },
      { name: '중앙동', nameEn: 'Jungang-dong', code: '10200' },
      { name: '금광동', nameEn: 'Geumgwang-dong', code: '10300' },
      { name: '은행동', nameEn: 'Eunhaeng-dong', code: '10400' },
      { name: '상대원동', nameEn: 'Sangdaewon-dong', code: '10500' },
      { name: '하대원동', nameEn: 'Hadaewon-dong', code: '10600' },
      { name: '도촌동', nameEn: 'Dochon-dong', code: '10700' },
      { name: '여수동', nameEn: 'Yeosu-dong', code: '10800' },
      { name: '갈현동', nameEn: 'Galhyeon-dong', code: '10900' }
    ]
  },
  // 수원시 (Suwon)
  {
    name: '수원시 영통구',
    nameEn: 'Suwon-si Yeongtong-gu',
    code: '41117',
    dongs: [
      { name: '영통동', nameEn: 'Yeongtong-dong', code: '10100' },
      { name: '망포동', nameEn: 'Mangpo-dong', code: '10200' },
      { name: '원천동', nameEn: 'Woncheon-dong', code: '10300' },
      { name: '이의동', nameEn: 'Iui-dong', code: '10400' },
      { name: '하동', nameEn: 'Ha-dong', code: '10500' },
      { name: '신동', nameEn: 'Sin-dong', code: '10600' },
      { name: '광교동', nameEn: 'Gwanggyo-dong', code: '10700' }
    ]
  },
  {
    name: '수원시 장안구',
    nameEn: 'Suwon-si Jangan-gu',
    code: '41111',
    dongs: [
      { name: '파장동', nameEn: 'Pajang-dong', code: '10100' },
      { name: '정자동', nameEn: 'Jeongja-dong', code: '10200' },
      { name: '이목동', nameEn: 'Imok-dong', code: '10300' },
      { name: '율전동', nameEn: 'Yuljeon-dong', code: '10400' },
      { name: '천천동', nameEn: 'Cheoncheon-dong', code: '10500' },
      { name: '영화동', nameEn: 'Yeonghwa-dong', code: '10600' },
      { name: '송죽동', nameEn: 'Songjuk-dong', code: '10700' },
      { name: '조원동', nameEn: 'Jowon-dong', code: '10800' },
      { name: '연무동', nameEn: 'Yeonmu-dong', code: '10900' }
    ]
  },
  {
    name: '수원시 권선구',
    nameEn: 'Suwon-si Gwonseon-gu',
    code: '41113',
    dongs: [
      { name: '권선동', nameEn: 'Gwonseon-dong', code: '10100' },
      { name: '세류동', nameEn: 'Seryu-dong', code: '10200' },
      { name: '평동', nameEn: 'Pyeong-dong', code: '10300' },
      { name: '서둔동', nameEn: 'Seodun-dong', code: '10400' },
      { name: '구운동', nameEn: 'Guun-dong', code: '10500' },
      { name: '금곡동', nameEn: 'Geumgok-dong', code: '10600' },
      { name: '호매실동', nameEn: 'Homaesil-dong', code: '10700' },
      { name: '탑동', nameEn: 'Tap-dong', code: '10800' },
      { name: '입북동', nameEn: 'Ipbuk-dong', code: '10900' }
    ]
  },
  {
    name: '수원시 팔달구',
    nameEn: 'Suwon-si Paldal-gu',
    code: '41115',
    dongs: [
      { name: '팔달로1가', nameEn: 'Paldal-ro 1-ga', code: '10100' },
      { name: '팔달로2가', nameEn: 'Paldal-ro 2-ga', code: '10200' },
      { name: '팔달로3가', nameEn: 'Paldal-ro 3-ga', code: '10300' },
      { name: '인계동', nameEn: 'Ingye-dong', code: '10400' },
      { name: '매산로1가', nameEn: 'Maesan-ro 1-ga', code: '10500' },
      { name: '매산로2가', nameEn: 'Maesan-ro 2-ga', code: '10600' },
      { name: '매산로3가', nameEn: 'Maesan-ro 3-ga', code: '10700' },
      { name: '우만동', nameEn: 'Uman-dong', code: '10800' },
      { name: '매교동', nameEn: 'Maegyo-dong', code: '10900' },
      { name: '지동', nameEn: 'Ji-dong', code: '11000' },
      { name: '고등동', nameEn: 'Godeung-dong', code: '11100' },
      { name: '화서동', nameEn: 'Hwaseo-dong', code: '11200' }
    ]
  },
  // 용인시 (Yongin)
  {
    name: '용인시 수지구',
    nameEn: 'Yongin-si Suji-gu',
    code: '41465',
    dongs: [
      { name: '풍덕천동', nameEn: 'Pungdeokcheon-dong', code: '10100' },
      { name: '죽전동', nameEn: 'Jukjeon-dong', code: '10200' },
      { name: '동천동', nameEn: 'Dongcheon-dong', code: '10300' },
      { name: '고기동', nameEn: 'Gogi-dong', code: '10400' },
      { name: '신봉동', nameEn: 'Sinbong-dong', code: '10500' },
      { name: '성복동', nameEn: 'Seongbok-dong', code: '10600' },
      { name: '상현동', nameEn: 'Sanghyeon-dong', code: '10700' }
    ]
  },
  {
    name: '용인시 기흥구',
    nameEn: 'Yongin-si Giheung-gu',
    code: '41463',
    dongs: [
      { name: '기흥동', nameEn: 'Giheung-dong', code: '10100' },
      { name: '구갈동', nameEn: 'Gugal-dong', code: '10200' },
      { name: '상갈동', nameEn: 'Sanggal-dong', code: '10300' },
      { name: '보라동', nameEn: 'Bora-dong', code: '10400' },
      { name: '신갈동', nameEn: 'Singal-dong', code: '10500' },
      { name: '영덕동', nameEn: 'Yeongdeok-dong', code: '10600' },
      { name: '언남동', nameEn: 'Eonnam-dong', code: '10700' },
      { name: '마북동', nameEn: 'Mabuk-dong', code: '10800' },
      { name: '동백동', nameEn: 'Dongbaek-dong', code: '10900' },
      { name: '중동', nameEn: 'Jung-dong', code: '11000' },
      { name: '서천동', nameEn: 'Seocheon-dong', code: '11100' }
    ]
  },
  {
    name: '용인시 처인구',
    nameEn: 'Yongin-si Cheoin-gu',
    code: '41461',
    dongs: [
      { name: '김량장동', nameEn: 'Gimnyangjiang-dong', code: '10100' },
      { name: '역북동', nameEn: 'Yeokbuk-dong', code: '10200' },
      { name: '삼가동', nameEn: 'Samga-dong', code: '10300' },
      { name: '유방동', nameEn: 'Yubang-dong', code: '10400' },
      { name: '고림동', nameEn: 'Gorim-dong', code: '10500' },
      { name: '마평동', nameEn: 'Mapyeong-dong', code: '10600' },
      { name: '운학동', nameEn: 'Unhak-dong', code: '10700' },
      { name: '호동', nameEn: 'Ho-dong', code: '10800' }
    ]
  },
  // 고양시 (Goyang)
  {
    name: '고양시 일산동구',
    nameEn: 'Goyang-si Ilsandong-gu',
    code: '41285',
    dongs: [
      { name: '백석동', nameEn: 'Baekseok-dong', code: '10100' },
      { name: '마두동', nameEn: 'Madu-dong', code: '10200' },
      { name: '장항동', nameEn: 'Janghang-dong', code: '10300' },
      { name: '정발산동', nameEn: 'Jeongbalsan-dong', code: '10400' },
      { name: '풍동', nameEn: 'Pung-dong', code: '10500' },
      { name: '식사동', nameEn: 'Siksa-dong', code: '10600' },
      { name: '중산동', nameEn: 'Jungsan-dong', code: '10700' },
      { name: '산황동', nameEn: 'Sanhwang-dong', code: '10800' }
    ]
  },
  {
    name: '고양시 일산서구',
    nameEn: 'Goyang-si Ilsanseo-gu',
    code: '41287',
    dongs: [
      { name: '주엽동', nameEn: 'Juyeop-dong', code: '10100' },
      { name: '대화동', nameEn: 'Daehwa-dong', code: '10200' },
      { name: '일산동', nameEn: 'Ilsan-dong', code: '10300' },
      { name: '탄현동', nameEn: 'Tanhyeon-dong', code: '10400' },
      { name: '덕이동', nameEn: 'Deogi-dong', code: '10500' },
      { name: '가좌동', nameEn: 'Gajwa-dong', code: '10600' }
    ]
  },
  {
    name: '고양시 덕양구',
    nameEn: 'Goyang-si Deogyang-gu',
    code: '41281',
    dongs: [
      { name: '행신동', nameEn: 'Haengsin-dong', code: '10100' },
      { name: '화정동', nameEn: 'Hwajeong-dong', code: '10200' },
      { name: '능곡동', nameEn: 'Neunggok-dong', code: '10300' },
      { name: '삼송동', nameEn: 'Samsong-dong', code: '10400' },
      { name: '원흥동', nameEn: 'Wonheung-dong', code: '10500' },
      { name: '주교동', nameEn: 'Jugyo-dong', code: '10600' },
      { name: '대장동', nameEn: 'Daejang-dong', code: '10700' },
      { name: '성사동', nameEn: 'Seongsa-dong', code: '10800' },
      { name: '향동동', nameEn: 'Hyangdong-dong', code: '10900' }
    ]
  },
  // 하남시 (Hanam)
  {
    name: '하남시',
    nameEn: 'Hanam-si',
    code: '41450',
    dongs: [
      { name: '신장동', nameEn: 'Sinjang-dong', code: '10100' },
      { name: '덕풍동', nameEn: 'Deokpung-dong', code: '10200' },
      { name: '풍산동', nameEn: 'Pungsan-dong', code: '10300' },
      { name: '미사동', nameEn: 'Misa-dong', code: '10400' },
      { name: '감일동', nameEn: 'Gamil-dong', code: '10500' },
      { name: '망월동', nameEn: 'Mangwol-dong', code: '10600' },
      { name: '감북동', nameEn: 'Gambuk-dong', code: '10700' },
      { name: '천현동', nameEn: 'Cheonhyeon-dong', code: '10800' },
      { name: '창우동', nameEn: 'Changu-dong', code: '10900' },
      { name: '위례동', nameEn: 'Wirye-dong', code: '11000' }
    ]
  },
  // 과천시 (Gwacheon)
  {
    name: '과천시',
    nameEn: 'Gwacheon-si',
    code: '41290',
    dongs: [
      { name: '중앙동', nameEn: 'Jungang-dong', code: '10100' },
      { name: '부림동', nameEn: 'Burim-dong', code: '10200' },
      { name: '별양동', nameEn: 'Byeoryang-dong', code: '10300' },
      { name: '갈현동', nameEn: 'Galhyeon-dong', code: '10400' },
      { name: '문원동', nameEn: 'Munwon-dong', code: '10500' },
      { name: '과천동', nameEn: 'Gwacheon-dong', code: '10600' },
      { name: '주암동', nameEn: 'Juam-dong', code: '10700' },
      { name: '막계동', nameEn: 'Makgye-dong', code: '10800' }
    ]
  },
  // 남양주시 (Namyangju)
  {
    name: '남양주시',
    nameEn: 'Namyangju-si',
    code: '41360',
    dongs: [
      { name: '호평동', nameEn: 'Hopyeong-dong', code: '10100' },
      { name: '평내동', nameEn: 'Pyeongnae-dong', code: '10200' },
      { name: '금곡동', nameEn: 'Geumgok-dong', code: '10300' },
      { name: '양정동', nameEn: 'Yangjeong-dong', code: '10400' },
      { name: '다산동', nameEn: 'Dasan-dong', code: '10500' },
      { name: '별내동', nameEn: 'Byeollae-dong', code: '10600' },
      { name: '퇴계원동', nameEn: 'Toegyewon-dong', code: '10700' },
      { name: '오남동', nameEn: 'Onam-dong', code: '10800' },
      { name: '진접읍', nameEn: 'Jinjeop-eup', code: '10900' },
      { name: '화도읍', nameEn: 'Hwado-eup', code: '11000' }
    ]
  },
  // 부천시 (Bucheon)
  {
    name: '부천시',
    nameEn: 'Bucheon-si',
    code: '41190',
    dongs: [
      { name: '상동', nameEn: 'Sang-dong', code: '10100' },
      { name: '중동', nameEn: 'Jung-dong', code: '10200' },
      { name: '송내동', nameEn: 'Songnae-dong', code: '10300' },
      { name: '역곡동', nameEn: 'Yeokgok-dong', code: '10400' },
      { name: '심곡동', nameEn: 'Simgok-dong', code: '10500' },
      { name: '원미동', nameEn: 'Wonmi-dong', code: '10600' },
      { name: '춘의동', nameEn: 'Chunui-dong', code: '10700' },
      { name: '도당동', nameEn: 'Dodang-dong', code: '10800' },
      { name: '약대동', nameEn: 'Yakdae-dong', code: '10900' },
      { name: '오정동', nameEn: 'Ojeong-dong', code: '11000' },
      { name: '고강동', nameEn: 'Gogang-dong', code: '11100' },
      { name: '작동', nameEn: 'Jak-dong', code: '11200' },
      { name: '소사동', nameEn: 'Sosa-dong', code: '11300' },
      { name: '범박동', nameEn: 'Beombak-dong', code: '11400' }
    ]
  },
  // 광명시 (Gwangmyeong)
  {
    name: '광명시',
    nameEn: 'Gwangmyeong-si',
    code: '41210',
    dongs: [
      { name: '철산동', nameEn: 'Cheolsan-dong', code: '10100' },
      { name: '광명동', nameEn: 'Gwangmyeong-dong', code: '10200' },
      { name: '하안동', nameEn: 'Haan-dong', code: '10300' },
      { name: '소하동', nameEn: 'Soha-dong', code: '10400' },
      { name: '일직동', nameEn: 'Iljik-dong', code: '10500' },
      { name: '가학동', nameEn: 'Gahak-dong', code: '10600' },
      { name: '노온사동', nameEn: 'Noonsa-dong', code: '10700' }
    ]
  },
  // 안양시 (Anyang)
  {
    name: '안양시 동안구',
    nameEn: 'Anyang-si Dongan-gu',
    code: '41173',
    dongs: [
      { name: '비산동', nameEn: 'Bisan-dong', code: '10100' },
      { name: '관양동', nameEn: 'Gwanyang-dong', code: '10200' },
      { name: '평촌동', nameEn: 'Pyeongchon-dong', code: '10300' },
      { name: '호계동', nameEn: 'Hogye-dong', code: '10400' },
      { name: '달안동', nameEn: 'Dalan-dong', code: '10500' },
      { name: '귀인동', nameEn: 'Gwiin-dong', code: '10600' }
    ]
  },
  {
    name: '안양시 만안구',
    nameEn: 'Anyang-si Manan-gu',
    code: '41171',
    dongs: [
      { name: '안양동', nameEn: 'Anyang-dong', code: '10100' },
      { name: '석수동', nameEn: 'Seoksu-dong', code: '10200' },
      { name: '박달동', nameEn: 'Bakdal-dong', code: '10300' },
      { name: '신촌동', nameEn: 'Sinchon-dong', code: '10400' }
    ]
  },
  // 화성시 (Hwaseong)
  {
    name: '화성시',
    nameEn: 'Hwaseong-si',
    code: '41590',
    dongs: [
      { name: '동탄동', nameEn: 'Dongtan-dong', code: '10100' },
      { name: '반송동', nameEn: 'Bansong-dong', code: '10200' },
      { name: '석우동', nameEn: 'Seoku-dong', code: '10300' },
      { name: '영천동', nameEn: 'Yeongcheon-dong', code: '10400' },
      { name: '장지동', nameEn: 'Jangji-dong', code: '10500' },
      { name: '오산동', nameEn: 'Osan-dong', code: '10600' },
      { name: '청계동', nameEn: 'Cheonggye-dong', code: '10700' },
      { name: '병점동', nameEn: 'Byeongjeom-dong', code: '10800' },
      { name: '진안동', nameEn: 'Jinan-dong', code: '10900' },
      { name: '반월동', nameEn: 'Banwol-dong', code: '11000' },
      { name: '기배동', nameEn: 'Gibae-dong', code: '11100' },
      { name: '목동', nameEn: 'Mok-dong', code: '11200' },
      { name: '산척동', nameEn: 'Sancheok-dong', code: '11300' },
      { name: '송산동', nameEn: 'Songsan-dong', code: '11400' }
    ]
  },
  // 김포시 (Gimpo)
  {
    name: '김포시',
    nameEn: 'Gimpo-si',
    code: '41570',
    dongs: [
      { name: '장기동', nameEn: 'Janggi-dong', code: '10100' },
      { name: '구래동', nameEn: 'Gurae-dong', code: '10200' },
      { name: '마산동', nameEn: 'Masan-dong', code: '10300' },
      { name: '운양동', nameEn: 'Unyang-dong', code: '10400' },
      { name: '풍무동', nameEn: 'Pungmu-dong', code: '10500' },
      { name: '사우동', nameEn: 'Sau-dong', code: '10600' },
      { name: '걸포동', nameEn: 'Geolpo-dong', code: '10700' },
      { name: '북변동', nameEn: 'Bukbyeon-dong', code: '10800' },
      { name: '감정동', nameEn: 'Gamjeong-dong', code: '10900' },
      { name: '고촌읍', nameEn: 'Gochon-eup', code: '11000' }
    ]
  },
  // 안산시 (Ansan)
  {
    name: '안산시 단원구',
    nameEn: 'Ansan-si Danwon-gu',
    code: '41273',
    dongs: [
      { name: '고잔동', nameEn: 'Gojan-dong', code: '10100' },
      { name: '와동', nameEn: 'Wa-dong', code: '10200' },
      { name: '원곡동', nameEn: 'Wongok-dong', code: '10300' },
      { name: '선부동', nameEn: 'Seonbu-dong', code: '10400' },
      { name: '초지동', nameEn: 'Choji-dong', code: '10500' },
      { name: '원시동', nameEn: 'Wonsi-dong', code: '10600' }
    ]
  },
  {
    name: '안산시 상록구',
    nameEn: 'Ansan-si Sangnok-gu',
    code: '41271',
    dongs: [
      { name: '본오동', nameEn: 'Bono-dong', code: '10100' },
      { name: '사동', nameEn: 'Sa-dong', code: '10200' },
      { name: '이동', nameEn: 'I-dong', code: '10300' },
      { name: '부곡동', nameEn: 'Bugok-dong', code: '10400' },
      { name: '성포동', nameEn: 'Seongpo-dong', code: '10500' },
      { name: '월피동', nameEn: 'Wolpi-dong', code: '10600' },
      { name: '일동', nameEn: 'Il-dong', code: '10700' }
    ]
  },
  // 의정부시 (Uijeongbu)
  {
    name: '의정부시',
    nameEn: 'Uijeongbu-si',
    code: '41150',
    dongs: [
      { name: '의정부동', nameEn: 'Uijeongbu-dong', code: '10100' },
      { name: '호원동', nameEn: 'Howon-dong', code: '10200' },
      { name: '장암동', nameEn: 'Jangam-dong', code: '10300' },
      { name: '신곡동', nameEn: 'Singok-dong', code: '10400' },
      { name: '민락동', nameEn: 'Millak-dong', code: '10500' },
      { name: '가능동', nameEn: 'Ganeung-dong', code: '10600' },
      { name: '금오동', nameEn: 'Geumo-dong', code: '10700' },
      { name: '녹양동', nameEn: 'Nokyang-dong', code: '10800' }
    ]
  },
  // 구리시 (Guri)
  {
    name: '구리시',
    nameEn: 'Guri-si',
    code: '41310',
    dongs: [
      { name: '교문동', nameEn: 'Gyomun-dong', code: '10100' },
      { name: '인창동', nameEn: 'Inchang-dong', code: '10200' },
      { name: '갈매동', nameEn: 'Galmae-dong', code: '10300' },
      { name: '수택동', nameEn: 'Sutaek-dong', code: '10400' },
      { name: '토평동', nameEn: 'Topyeong-dong', code: '10500' }
    ]
  },
  // 군포시 (Gunpo)
  {
    name: '군포시',
    nameEn: 'Gunpo-si',
    code: '41410',
    dongs: [
      { name: '산본동', nameEn: 'Sanbon-dong', code: '10100' },
      { name: '금정동', nameEn: 'Geumjeong-dong', code: '10200' },
      { name: '군포동', nameEn: 'Gunpo-dong', code: '10300' },
      { name: '당동', nameEn: 'Dang-dong', code: '10400' },
      { name: '당정동', nameEn: 'Dangjeong-dong', code: '10500' },
      { name: '부곡동', nameEn: 'Bugok-dong', code: '10600' }
    ]
  },
  // 시흥시 (Siheung)
  {
    name: '시흥시',
    nameEn: 'Siheung-si',
    code: '41390',
    dongs: [
      { name: '정왕동', nameEn: 'Jeongwang-dong', code: '10100' },
      { name: '대야동', nameEn: 'Daeya-dong', code: '10200' },
      { name: '신천동', nameEn: 'Sincheon-dong', code: '10300' },
      { name: '은행동', nameEn: 'Eunhaeng-dong', code: '10400' },
      { name: '매화동', nameEn: 'Maehwa-dong', code: '10500' },
      { name: '목감동', nameEn: 'Mokgam-dong', code: '10600' },
      { name: '배곧동', nameEn: 'Baegot-dong', code: '10700' },
      { name: '능곡동', nameEn: 'Neunggok-dong', code: '10800' },
      { name: '거모동', nameEn: 'Geomo-dong', code: '10900' }
    ]
  },
  // 의왕시 (Uiwang)
  {
    name: '의왕시',
    nameEn: 'Uiwang-si',
    code: '41430',
    dongs: [
      { name: '내손동', nameEn: 'Naeson-dong', code: '10100' },
      { name: '오전동', nameEn: 'Ojeon-dong', code: '10200' },
      { name: '학의동', nameEn: 'Hagui-dong', code: '10300' },
      { name: '포일동', nameEn: 'Poil-dong', code: '10400' },
      { name: '월암동', nameEn: 'Woram-dong', code: '10500' },
      { name: '청계동', nameEn: 'Cheonggye-dong', code: '10600' }
    ]
  },
  // 파주시 (Paju)
  {
    name: '파주시',
    nameEn: 'Paju-si',
    code: '41480',
    dongs: [
      { name: '금촌동', nameEn: 'Geumchon-dong', code: '10100' },
      { name: '교하동', nameEn: 'Gyoha-dong', code: '10200' },
      { name: '야당동', nameEn: 'Yadang-dong', code: '10300' },
      { name: '문발동', nameEn: 'Munbal-dong', code: '10400' },
      { name: '다율동', nameEn: 'Dayul-dong', code: '10500' },
      { name: '야당동', nameEn: 'Yadang-dong', code: '10600' },
      { name: '운정동', nameEn: 'Unjeong-dong', code: '10700' },
      { name: '목동동', nameEn: 'Mokdong-dong', code: '10800' }
    ]
  },
  // 이천시 (Icheon)
  {
    name: '이천시',
    nameEn: 'Icheon-si',
    code: '41500',
    dongs: [
      { name: '중리동', nameEn: 'Jungni-dong', code: '10100' },
      { name: '관고동', nameEn: 'Gwango-dong', code: '10200' },
      { name: '창전동', nameEn: 'Changjeon-dong', code: '10300' },
      { name: '증포동', nameEn: 'Jeungpo-dong', code: '10400' },
      { name: '사음동', nameEn: 'Saeum-dong', code: '10500' }
    ]
  },
  // 오산시 (Osan)
  {
    name: '오산시',
    nameEn: 'Osan-si',
    code: '41370',
    dongs: [
      { name: '오산동', nameEn: 'Osan-dong', code: '10100' },
      { name: '원동', nameEn: 'Won-dong', code: '10200' },
      { name: '세교동', nameEn: 'Segyo-dong', code: '10300' },
      { name: '청학동', nameEn: 'Cheonghak-dong', code: '10400' },
      { name: '부산동', nameEn: 'Busan-dong', code: '10500' }
    ]
  },
  // 평택시 (Pyeongtaek)
  {
    name: '평택시',
    nameEn: 'Pyeongtaek-si',
    code: '41220',
    dongs: [
      { name: '비전동', nameEn: 'Bijeon-dong', code: '10100' },
      { name: '소사동', nameEn: 'Sosa-dong', code: '10200' },
      { name: '지산동', nameEn: 'Jisan-dong', code: '10300' },
      { name: '합정동', nameEn: 'Hapjeong-dong', code: '10400' },
      { name: '용이동', nameEn: 'Yongi-dong', code: '10500' },
      { name: '동삭동', nameEn: 'Dongsak-dong', code: '10600' },
      { name: '세교동', nameEn: 'Segyo-dong', code: '10700' },
      { name: '이충동', nameEn: 'Ichung-dong', code: '10800' },
      { name: '청북동', nameEn: 'Cheongbuk-dong', code: '10900' }
    ]
  },
  // 광주시 (Gwangju - Gyeonggi)
  {
    name: '광주시',
    nameEn: 'Gwangju-si (Gyeonggi)',
    code: '41610',
    dongs: [
      { name: '경안동', nameEn: 'Gyeongan-dong', code: '10100' },
      { name: '송정동', nameEn: 'Songjeong-dong', code: '10200' },
      { name: '쌍령동', nameEn: 'Ssangnyeong-dong', code: '10300' },
      { name: '역동', nameEn: 'Yeok-dong', code: '10400' },
      { name: '태전동', nameEn: 'Taejeon-dong', code: '10500' },
      { name: '목동', nameEn: 'Mok-dong', code: '10600' }
    ]
  },
  // 양주시 (Yangju)
  {
    name: '양주시',
    nameEn: 'Yangju-si',
    code: '41630',
    dongs: [
      { name: '옥정동', nameEn: 'Okjeong-dong', code: '10100' },
      { name: '회천동', nameEn: 'Hoecheon-dong', code: '10200' },
      { name: '고읍동', nameEn: 'Goeup-dong', code: '10300' },
      { name: '덕계동', nameEn: 'Deokgye-dong', code: '10400' },
      { name: '백석읍', nameEn: 'Baekseok-eup', code: '10500' },
      { name: '남면', nameEn: 'Nam-myeon', code: '10600' }
    ]
  }
];

/**
 * Combined districts for both Seoul and Gyeonggi
 */
export function getDistrictsByCity(cityName: string): District[] {
  if (cityName === '서울특별시' || cityName === '서울') {
    return SEOUL_DISTRICTS;
  } else if (cityName === '경기도' || cityName === '경기') {
    return GYEONGGI_DISTRICTS;
  }
  return [];
}

/**
 * Load comprehensive apartment database from generated JSON file
 * This contains ALL apartments in Seoul and Gyeonggi with recent transactions
 */
function loadApartmentDatabase(): Apartment[] {
  try {
    // Use imported JSON data (works in both dev and production)
    const apartments = apartmentDatabaseJson.apartments as Apartment[];
    console.log(`✅ Loaded ${apartments.length} apartments from database`);
    return apartments;
  } catch (error) {
    console.warn('Failed to load apartment database, falling back to hardcoded list:', error);
    // Fallback to hardcoded list if database file not found
    return SEOUL_APARTMENTS_FALLBACK;
  }
}

/**
 * Fallback list of common Seoul apartments (used if database file not available)
 * This is a curated list of popular apartment complexes across Seoul
 */
const SEOUL_APARTMENTS_FALLBACK: Apartment[] = [
  // Major brands - General
  { name: '래미안', nameEn: 'Raemian' },
  { name: '아이파크', nameEn: 'I-Park' },
  { name: '자이', nameEn: 'Xi' },
  { name: '푸르지오', nameEn: 'Prugio' },
  { name: '힐스테이트', nameEn: 'Hillstate' },
  { name: 'e편한세상', nameEn: 'e-Pyeonhansesang' },
  { name: '센트럴', nameEn: 'Central' },
  { name: '더샵', nameEn: 'The Sharp' },
  { name: '롯데캐슬', nameEn: 'Lotte Castle' },
  { name: '호반베르디움', nameEn: 'Hoban Verdi Um' },

  // Gangnam-gu (강남구)
  { name: '개포동아이파크', nameEn: 'Gaepo I-Park', district: '강남구', dong: '개포동' },
  { name: '개포주공', nameEn: 'Gaepo Jugong', district: '강남구', dong: '개포동' },
  { name: '논현동아이파크', nameEn: 'Nonhyeon I-Park', district: '강남구', dong: '논현동' },
  { name: '대치래미안', nameEn: 'Daechi Raemian', district: '강남구', dong: '대치동' },
  { name: '대치아이파크', nameEn: 'Daechi I-Park', district: '강남구', dong: '대치동' },
  { name: '도곡렉슬', nameEn: 'Dogok Lexle', district: '강남구', dong: '도곡동' },
  { name: '삼성래미안', nameEn: 'Samsung Raemian', district: '강남구', dong: '삼성동' },
  { name: '압구정현대', nameEn: 'Apgujeong Hyundai', district: '강남구', dong: '압구정동' },
  { name: '압구정한양', nameEn: 'Apgujeong Hanyang', district: '강남구', dong: '압구정동' },
  { name: '역삼래미안', nameEn: 'Yeoksam Raemian', district: '강남구', dong: '역삼동' },
  { name: '청담래미안', nameEn: 'Cheongdam Raemian', district: '강남구', dong: '청담동' },

  // Gangdong-gu (강동구)
  { name: '고덕아르테온', nameEn: 'Godeok Arteon', district: '강동구', dong: '고덕동' },
  { name: '고덕래미안', nameEn: 'Godeok Raemian', district: '강동구', dong: '고덕동' },
  { name: '둔촌주공', nameEn: 'Dunchon Jugong', district: '강동구', dong: '둔촌동' },
  { name: '명일동래미안', nameEn: 'Myeongil-dong Raemian', district: '강동구', dong: '명일동' },
  { name: '천호동아이파크', nameEn: 'Cheonho-dong I-Park', district: '강동구', dong: '천호동' },

  // Gangbuk-gu (강북구)
  { name: '미아동래미안', nameEn: 'Mia-dong Raemian', district: '강북구', dong: '미아동' },
  { name: '수유리래미안', nameEn: 'Suyuri Raemian', district: '강북구', dong: '수유동' },

  // Gangseo-gu (강서구)
  { name: '가양아이파크', nameEn: 'Gayang I-Park', district: '강서구', dong: '가양동' },
  { name: '마곡엠밸리', nameEn: 'Magok M-Valley', district: '강서구', dong: '마곡동' },
  { name: '마곡센트럴', nameEn: 'Magok Central', district: '강서구', dong: '마곡동' },
  { name: '방화동아이파크', nameEn: 'Banghwa-dong I-Park', district: '강서구', dong: '방화동' },

  // Gwanak-gu (관악구)
  { name: '봉천동래미안', nameEn: 'Bongcheon-dong Raemian', district: '관악구', dong: '봉천동' },
  { name: '신림동자이', nameEn: 'Sillim-dong Xi', district: '관악구', dong: '신림동' },

  // Gwangjin-gu (광진구)
  { name: '구의래미안', nameEn: 'Guui Raemian', district: '광진구', dong: '구의동' },
  { name: '자양동래미안', nameEn: 'Jayang-dong Raemian', district: '광진구', dong: '자양동' },

  // Guro-gu (구로구)
  { name: '개봉동아이파크', nameEn: 'Gaebong-dong I-Park', district: '구로구', dong: '개봉동', molitNames: ['개봉동현대아이파크'] },
  { name: '고척스카이', nameEn: 'Gocheok Sky', district: '구로구', dong: '고척동' },
  { name: '구로디지털단지아이파크', nameEn: 'Guro Digital Complex I-Park', district: '구로구', dong: '구로동' },
  { name: '신도림래미안', nameEn: 'Sindorim Raemian', district: '구로구', dong: '신도림동' },

  // Geumcheon-gu (금천구)
  { name: '가산디지털단지래미안', nameEn: 'Gasan Digital Complex Raemian', district: '금천구', dong: '가산동' },
  { name: '독산동아이파크', nameEn: 'Doksan-dong I-Park', district: '금천구', dong: '독산동' },

  // Nowon-gu (노원구)
  { name: '상계주공', nameEn: 'Sanggye Jugong' },
  { name: '중계래미안', nameEn: 'Junggye Raemian' },
  { name: '하계동래미안', nameEn: 'Hagye-dong Raemian' },

  // Dobong-gu (도봉구)
  { name: '도봉동래미안', nameEn: 'Dobong-dong Raemian' },
  { name: '창동신동아', nameEn: 'Chang-dong Shindonga' },

  // Dongdaemun-gu (동대문구)
  { name: '답십리래미안', nameEn: 'Dapsimni Raemian' },
  { name: '이문동래미안', nameEn: 'Imun-dong Raemian' },
  { name: '장안동래미안', nameEn: 'Jangan-dong Raemian' },
  { name: '청계한신휴플러스', nameEn: 'Cheonggye Hanshin Huplus' },
  { name: '회기동래미안', nameEn: 'Hoegi-dong Raemian' },

  // Dongjak-gu (동작구)
  { name: '노량진래미안', nameEn: 'Noryangjin Raemian' },
  { name: '사당동래미안', nameEn: 'Sadang-dong Raemian' },
  { name: '상도동래미안', nameEn: 'Sangdo-dong Raemian' },

  // Mapo-gu (마포구)
  { name: '공덕동래미안', nameEn: 'Gongdeok-dong Raemian' },
  { name: '마포래미안', nameEn: 'Mapo Raemian' },
  { name: '망원동래미안', nameEn: 'Mangwon-dong Raemian' },
  { name: '상암DMC래미안', nameEn: 'Sangam DMC Raemian' },
  { name: '합정동래미안', nameEn: 'Hapjeong-dong Raemian' },

  // Seodaemun-gu (서대문구)
  { name: '남가좌동래미안', nameEn: 'Namgajwa-dong Raemian' },
  { name: '연희동래미안', nameEn: 'Yeonhui-dong Raemian' },

  // Seocho-gu (서초구)
  { name: '반포래미안', nameEn: 'Banpo Raemian' },
  { name: '방배동래미안', nameEn: 'Bangbae-dong Raemian' },
  { name: '서초래미안', nameEn: 'Seocho Raemian' },
  { name: '양재동래미안', nameEn: 'Yangjae-dong Raemian' },
  { name: '잠원동래미안', nameEn: 'Jamwon-dong Raemian' },

  // Seongdong-gu (성동구)
  { name: '금호동래미안', nameEn: 'Geumho-dong Raemian', district: '성동구', dong: '금호동' },
  { name: '성수동아이파크', nameEn: 'Seongsu-dong I-Park', district: '성동구', dong: '성수동' },
  { name: '옥수동래미안', nameEn: 'Oksu-dong Raemian', district: '성동구', dong: '옥수동' },
  { name: '행당동래미안', nameEn: 'Haengdang-dong Raemian', district: '성동구', dong: '행당동' },

  // Seongbuk-gu (성북구)
  { name: '길음동래미안', nameEn: 'Gireum-dong Raemian' },
  { name: '돈암동래미안', nameEn: 'Donam-dong Raemian' },
  { name: '장위동래미안', nameEn: 'Jangwi-dong Raemian' },
  { name: '정릉동래미안', nameEn: 'Jeongneung-dong Raemian' },

  // Songpa-gu (송파구)
  { name: '가락동래미안', nameEn: 'Garak-dong Raemian' },
  { name: '문정동래미안', nameEn: 'Munjeong-dong Raemian' },
  { name: '잠실래미안', nameEn: 'Jamsil Raemian' },
  { name: '잠실주공', nameEn: 'Jamsil Jugong' },
  { name: '헬리오시티', nameEn: 'Helios City' },

  // Yangcheon-gu (양천구)
  { name: '목동아이파크', nameEn: 'Mok-dong I-Park', district: '양천구', dong: '목동' },
  { name: '목동신시가지', nameEn: 'Mok-dong New Town', district: '양천구', dong: '목동' },

  // Yeongdeungpo-gu (영등포구)
  { name: '당산동래미안', nameEn: 'Dangsan-dong Raemian' },
  { name: '대림동래미안', nameEn: 'Daerim-dong Raemian' },
  { name: '여의도자이', nameEn: 'Yeouido Xi' },

  // Yongsan-gu (용산구)
  { name: '용산래미안', nameEn: 'Yongsan Raemian' },
  { name: '이촌동래미안', nameEn: 'Ichon-dong Raemian' },
  { name: '한남더힐', nameEn: 'Hannam The Hill' },

  // Eunpyeong-gu (은평구)
  { name: '불광동래미안', nameEn: 'Bulgwang-dong Raemian' },
  { name: '응암동래미안', nameEn: 'Eungam-dong Raemian' },

  // Jongno-gu (종로구)
  { name: '종로래미안', nameEn: 'Jongno Raemian' },
  { name: '혜화동래미안', nameEn: 'Hyehwa-dong Raemian' },

  // Jung-gu (중구)
  { name: '신당동래미안', nameEn: 'Sindang-dong Raemian' },
  { name: '장충동래미안', nameEn: 'Jangchung-dong Raemian' },

  // Jungnang-gu (중랑구)
  { name: '면목동래미안', nameEn: 'Myeonmok-dong Raemian' },
  { name: '상봉동래미안', nameEn: 'Sangbong-dong Raemian' }
];

/**
 * Fallback list of common Gyeonggi apartments
 */
const GYEONGGI_APARTMENTS_FALLBACK: Apartment[] = [
  // 성남시 분당구
  { name: '파크뷰', nameEn: 'Park View', district: '성남시 분당구', dong: '정자동' },
  { name: '한솔마을', nameEn: 'Hansol Village', district: '성남시 분당구', dong: '서현동' },
  { name: '시범단지', nameEn: 'Sibeom Danji', district: '성남시 분당구', dong: '수내동' },
  { name: '샛별마을', nameEn: 'Saetbyeol Village', district: '성남시 분당구', dong: '야탑동' },
  { name: '판교원마을', nameEn: 'Pangyo Wonmaeul', district: '성남시 분당구', dong: '삼평동' },
  { name: '판교푸르지오그랑블', nameEn: 'Pangyo Prugio Grand Ville', district: '성남시 분당구', dong: '삼평동' },
  { name: '판교알파리움', nameEn: 'Pangyo Alpharim', district: '성남시 분당구', dong: '삼평동' },
  { name: '봇들마을', nameEn: 'Botdeul Village', district: '성남시 분당구', dong: '야탑동' },
  { name: '무지개마을', nameEn: 'Rainbow Village', district: '성남시 분당구', dong: '야탑동' },
  { name: '이매촌', nameEn: 'Imaechon', district: '성남시 분당구', dong: '이매동' },

  // 수원시
  { name: '광교호반베르디움', nameEn: 'Gwanggyo Hoban Verdium', district: '수원시 영통구', dong: '광교동' },
  { name: '광교자연앤힐스테이트', nameEn: 'Gwanggyo Jayeon and Hillstate', district: '수원시 영통구', dong: '광교동' },
  { name: '광교더샵레이크시티', nameEn: 'Gwanggyo The Sharp Lake City', district: '수원시 영통구', dong: '광교동' },
  { name: '영통아이파크캐슬', nameEn: 'Yeongtong I-Park Castle', district: '수원시 영통구', dong: '영통동' },
  { name: '매탄위브하늘채', nameEn: 'Maetan Weve Hanulchae', district: '수원시 영통구', dong: '망포동' },
  { name: '수원래미안', nameEn: 'Suwon Raemian', district: '수원시 팔달구', dong: '인계동' },

  // 용인시
  { name: '수지래미안이스트팰리스', nameEn: 'Suji Raemian East Palace', district: '용인시 수지구', dong: '풍덕천동' },
  { name: '죽전자이', nameEn: 'Jukjeon Xi', district: '용인시 수지구', dong: '죽전동' },
  { name: '성복역롯데캐슬골드타운', nameEn: 'Seongbok Lotte Castle Gold Town', district: '용인시 수지구', dong: '성복동' },
  { name: '동백롯데캐슬', nameEn: 'Dongbaek Lotte Castle', district: '용인시 기흥구', dong: '동백동' },
  { name: '기흥역센트럴푸르지오', nameEn: 'Giheung Central Prugio', district: '용인시 기흥구', dong: '신갈동' },
  { name: '보라동양우내안애', nameEn: 'Bora Dongyang Woo Nae-An-Ae', district: '용인시 기흥구', dong: '보라동' },

  // 고양시
  { name: '킨텍스꿈에그린', nameEn: 'Kintex Kkum-e-Green', district: '고양시 일산동구', dong: '장항동' },
  { name: '일산자이위시티', nameEn: 'Ilsan Xi We City', district: '고양시 일산동구', dong: '중산동' },
  { name: '산들마을', nameEn: 'Sandle Village', district: '고양시 일산동구', dong: '풍동' },
  { name: '강선마을', nameEn: 'Kangseon Village', district: '고양시 일산동구', dong: '마두동' },
  { name: '주엽역한화꿈에그린', nameEn: 'Juyeop Hanwha Kkum-e-Green', district: '고양시 일산서구', dong: '주엽동' },
  { name: '탄현마을', nameEn: 'Tanhyeon Village', district: '고양시 일산서구', dong: '탄현동' },
  { name: '삼송역세권센트럴파크', nameEn: 'Samsong Central Park', district: '고양시 덕양구', dong: '삼송동' },
  { name: '향동지구', nameEn: 'Hyangdong District', district: '고양시 덕양구', dong: '향동동' },

  // 하남시
  { name: '미사강변센트럴자이', nameEn: 'Misa Gangbyeon Central Xi', district: '하남시', dong: '미사동' },
  { name: '미사강변도시', nameEn: 'Misa Riverside City', district: '하남시', dong: '미사동' },
  { name: '미사역스카이폴리스', nameEn: 'Misa Station Sky Polis', district: '하남시', dong: '미사동' },
  { name: '감일지구', nameEn: 'Gamil District', district: '하남시', dong: '감일동' },
  { name: '위례신도시', nameEn: 'Wirye New Town', district: '하남시', dong: '위례동' },

  // 과천시
  { name: '래미안슈르', nameEn: 'Raemian Sure', district: '과천시', dong: '별양동' },
  { name: '과천자이', nameEn: 'Gwacheon Xi', district: '과천시', dong: '중앙동' },
  { name: '과천센트럴파크푸르지오써밋', nameEn: 'Gwacheon Central Park Prugio Summit', district: '과천시', dong: '과천동' },

  // 남양주시
  { name: '다산신도시자연앤자이', nameEn: 'Dasan Jayeon and Xi', district: '남양주시', dong: '다산동' },
  { name: '다산신도시e편한세상', nameEn: 'Dasan e-Pyeonhansesang', district: '남양주시', dong: '다산동' },
  { name: '별내자이더스타', nameEn: 'Byeollae Xi The Star', district: '남양주시', dong: '별내동' },
  { name: '평내호평역모아', nameEn: 'Pyeongnae Hopyeong Moa', district: '남양주시', dong: '호평동' },

  // 부천시
  { name: '중동신도시', nameEn: 'Jungdong New Town', district: '부천시', dong: '중동' },
  { name: '상동호반베르디움', nameEn: 'Sangdong Hoban Verdium', district: '부천시', dong: '상동' },
  { name: '송내역트리플타워', nameEn: 'Songnae Triple Tower', district: '부천시', dong: '송내동' },

  // 광명시
  { name: '광명역센트럴자이', nameEn: 'Gwangmyeong Central Xi', district: '광명시', dong: '일직동' },
  { name: '철산래미안자이', nameEn: 'Cheolsan Raemian Xi', district: '광명시', dong: '철산동' },
  { name: '하안동래미안', nameEn: 'Haan-dong Raemian', district: '광명시', dong: '하안동' },

  // 안양시
  { name: '평촌래미안', nameEn: 'Pyeongchon Raemian', district: '안양시 동안구', dong: '평촌동' },
  { name: '평촌자이', nameEn: 'Pyeongchon Xi', district: '안양시 동안구', dong: '평촌동' },
  { name: '인덕원자이', nameEn: 'Indeokwon Xi', district: '안양시 동안구', dong: '관양동' },
  { name: '호계동래미안', nameEn: 'Hogye-dong Raemian', district: '안양시 동안구', dong: '호계동' },

  // 화성시
  { name: '동탄역롯데캐슬', nameEn: 'Dongtan Lotte Castle', district: '화성시', dong: '동탄동' },
  { name: '동탄레이크파크자연앤자이', nameEn: 'Dongtan Lake Park Xi', district: '화성시', dong: '동탄동' },
  { name: '동탄2신도시', nameEn: 'Dongtan 2 New Town', district: '화성시', dong: '동탄동' },
  { name: '메타폴리스', nameEn: 'Metapolis', district: '화성시', dong: '반송동' },

  // 김포시
  { name: '한강신도시', nameEn: 'Hangang New Town', district: '김포시', dong: '구래동' },
  { name: '풍무역센트럴푸르지오', nameEn: 'Pungmu Central Prugio', district: '김포시', dong: '풍무동' },
  { name: '마산역푸르지오', nameEn: 'Masan Prugio', district: '김포시', dong: '마산동' },
  { name: '장기동센트럴파크', nameEn: 'Janggi Central Park', district: '김포시', dong: '장기동' },

  // 의정부시
  { name: '민락2지구', nameEn: 'Millak 2 District', district: '의정부시', dong: '민락동' },
  { name: '신곡동래미안', nameEn: 'Singok Raemian', district: '의정부시', dong: '신곡동' },

  // 시흥시
  { name: '배곧신도시', nameEn: 'Baegot New Town', district: '시흥시', dong: '배곧동' },
  { name: '목감지구', nameEn: 'Mokgam District', district: '시흥시', dong: '목감동' },

  // 파주시
  { name: '운정신도시', nameEn: 'Unjeong New Town', district: '파주시', dong: '운정동' },
  { name: '힐스테이트운정', nameEn: 'Hillstate Unjeong', district: '파주시', dong: '운정동' },

  // 구리시
  { name: '갈매역자이', nameEn: 'Galmae Xi', district: '구리시', dong: '갈매동' },
  { name: '인창동래미안', nameEn: 'Inchang Raemian', district: '구리시', dong: '인창동' }
];

/**
 * Get comprehensive apartment list
 * Loads from database file if available, otherwise uses fallback
 * Includes both Seoul and Gyeonggi apartments
 */
export const SEOUL_APARTMENTS: Apartment[] = loadApartmentDatabase();

/**
 * Combined list of all apartments (Seoul + Gyeonggi fallback)
 */
export const ALL_APARTMENTS: Apartment[] = [...SEOUL_APARTMENTS, ...GYEONGGI_APARTMENTS_FALLBACK];

export function getDistrictByCode(code: string): District | undefined {
  return SEOUL_DISTRICTS.find(d => d.code === code);
}

export function getDistrictByName(name: string): District | undefined {
  return SEOUL_DISTRICTS.find(d => d.name === name);
}

export function searchApartments(query: string, dong?: string, district?: string): Apartment[] {
  const lowerQuery = query.toLowerCase();
  return ALL_APARTMENTS.filter(apt => {
    // Match query against apartment name, district, and dong
    const matchesName = apt.name.toLowerCase().includes(lowerQuery) ||
      (apt.nameEn && apt.nameEn.toLowerCase().includes(lowerQuery));

    const matchesDistrict = apt.district && apt.district.toLowerCase().includes(lowerQuery);

    const matchesDong = (apt.dong && apt.dong.toLowerCase().includes(lowerQuery)) ||
      (apt.dongs && apt.dongs.some(d => d.toLowerCase().includes(lowerQuery)));

    const matchesQuery = matchesName || matchesDistrict || matchesDong;

    if (!matchesQuery) {
      return false;
    }

    // If dong is specified, filter by dong
    if (dong) {
      // Check both single dong and multiple dongs
      const matchesDongFilter = apt.dong === dong ||
        (apt.dongs && apt.dongs.includes(dong));

      if (!matchesDongFilter) {
        return false;
      }
    }

    // If only district is specified, filter by district
    if (district && apt.district) {
      return apt.district === district;
    }

    // If no location filter, return all matches
    return true;
  });
}

/**
 * Get all possible building name variants for MOLIT API queries
 * Returns an array with the original name first, followed by MOLIT-specific variants
 */
export function getBuildingNameVariants(buildingName: string): string[] {
  // Find the apartment in our database
  const apartment = ALL_APARTMENTS.find(apt => apt.name === buildingName);

  if (apartment?.molitNames) {
    // Return original name + MOLIT variants
    return [buildingName, ...apartment.molitNames];
  }

  // If no variants found, just return the original name
  return [buildingName];
}
