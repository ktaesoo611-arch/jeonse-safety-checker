/**
 * Seoul District and Neighborhood Data with English Translations
 * Used for structured address input in MOLIT API integration
 */

export interface District {
  name: string;
  nameEn: string;
  code: string;
  dongs: Array<{ name: string; nameEn: string }>;
}

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
      { name: '개포동', nameEn: 'Gaepo-dong' },
      { name: '논현동', nameEn: 'Nonhyeon-dong' },
      { name: '대치동', nameEn: 'Daechi-dong' },
      { name: '도곡동', nameEn: 'Dogok-dong' },
      { name: '삼성동', nameEn: 'Samseong-dong' },
      { name: '세곡동', nameEn: 'Segok-dong' },
      { name: '수서동', nameEn: 'Suseo-dong' },
      { name: '신사동', nameEn: 'Sinsa-dong' },
      { name: '압구정동', nameEn: 'Apgujeong-dong' },
      { name: '역삼동', nameEn: 'Yeoksam-dong' },
      { name: '율현동', nameEn: 'Yulhyeon-dong' },
      { name: '일원동', nameEn: 'Irwon-dong' },
      { name: '청담동', nameEn: 'Cheongdam-dong' }
    ]
  },
  {
    name: '강동구',
    nameEn: 'Gangdong-gu',
    code: '11740',
    dongs: [
      { name: '강일동', nameEn: 'Gangil-dong' },
      { name: '고덕동', nameEn: 'Godeok-dong' },
      { name: '둔촌동', nameEn: 'Dunchon-dong' },
      { name: '명일동', nameEn: 'Myeongil-dong' },
      { name: '상일동', nameEn: 'Sangil-dong' },
      { name: '성내동', nameEn: 'Seongnae-dong' },
      { name: '암사동', nameEn: 'Amsa-dong' },
      { name: '천호동', nameEn: 'Cheonho-dong' },
      { name: '하일동', nameEn: 'Hail-dong' }
    ]
  },
  {
    name: '강북구',
    nameEn: 'Gangbuk-gu',
    code: '11305',
    dongs: [
      { name: '번동', nameEn: 'Beon-dong' },
      { name: '미아동', nameEn: 'Mia-dong' },
      { name: '송중동', nameEn: 'Songjung-dong' },
      { name: '송천동', nameEn: 'Songcheon-dong' },
      { name: '삼양동', nameEn: 'Samyang-dong' },
      { name: '수유동', nameEn: 'Suyu-dong' },
      { name: '우이동', nameEn: 'Ui-dong' },
      { name: '인수동', nameEn: 'Insu-dong' },
      { name: '삼각산동', nameEn: 'Samgaksan-dong' },
      { name: '번1동', nameEn: 'Beon 1-dong' },
      { name: '번2동', nameEn: 'Beon 2-dong' },
      { name: '번3동', nameEn: 'Beon 3-dong' },
      { name: '수유1동', nameEn: 'Suyu 1-dong' }
    ]
  },
  {
    name: '강서구',
    nameEn: 'Gangseo-gu',
    code: '11500',
    dongs: [
      { name: '가양동', nameEn: 'Gayang-dong' },
      { name: '개화동', nameEn: 'Gaehwa-dong' },
      { name: '공항동', nameEn: 'Gonghang-dong' },
      { name: '과해동', nameEn: 'Gwahae-dong' },
      { name: '내발산동', nameEn: 'Naebalsan-dong' },
      { name: '등촌동', nameEn: 'Deungchon-dong' },
      { name: '마곡동', nameEn: 'Magok-dong' },
      { name: '방화동', nameEn: 'Banghwa-dong' },
      { name: '염창동', nameEn: 'Yeomchang-dong' },
      { name: '오곡동', nameEn: 'Ogok-dong' },
      { name: '오쇠동', nameEn: 'Osoe-dong' },
      { name: '외발산동', nameEn: 'Oebalsan-dong' },
      { name: '화곡동', nameEn: 'Hwagok-dong' }
    ]
  },
  {
    name: '관악구',
    nameEn: 'Gwanak-gu',
    code: '11620',
    dongs: [
      { name: '남현동', nameEn: 'Namhyeon-dong' },
      { name: '봉천동', nameEn: 'Bongcheon-dong' },
      { name: '신림동', nameEn: 'Sillim-dong' },
      { name: '중앙동', nameEn: 'Jungang-dong' },
      { name: '청룡동', nameEn: 'Cheongnyong-dong' },
      { name: '행운동', nameEn: 'Haengun-dong' },
      { name: '청림동', nameEn: 'Cheonglim-dong' },
      { name: '성현동', nameEn: 'Seonghyeon-dong' },
      { name: '낙성대동', nameEn: 'Nakseongdae-dong' },
      { name: '인헌동', nameEn: 'Inheon-dong' },
      { name: '조원동', nameEn: 'Jowon-dong' },
      { name: '신원동', nameEn: 'Sinwon-dong' },
      { name: '서림동', nameEn: 'Seorim-dong' },
      { name: '신사동', nameEn: 'Sinsa-dong' },
      { name: '미성동', nameEn: 'Miseong-dong' },
      { name: '난곡동', nameEn: 'Nan-gok-dong' },
      { name: '난향동', nameEn: 'Nanhyang-dong' },
      { name: '삼성동', nameEn: 'Samseong-dong' },
      { name: '대학동', nameEn: 'Daehak-dong' },
      { name: '보라매동', nameEn: 'Boramae-dong' }
    ]
  },
  {
    name: '광진구',
    nameEn: 'Gwangjin-gu',
    code: '11215',
    dongs: [
      { name: '광장동', nameEn: 'Gwangjang-dong' },
      { name: '구의동', nameEn: 'Guui-dong' },
      { name: '군자동', nameEn: 'Gunja-dong' },
      { name: '능동', nameEn: 'Neung-dong' },
      { name: '자양동', nameEn: 'Jayang-dong' },
      { name: '중곡동', nameEn: 'Junggok-dong' },
      { name: '화양동', nameEn: 'Hwayang-dong' }
    ]
  },
  {
    name: '구로구',
    nameEn: 'Guro-gu',
    code: '11530',
    dongs: [
      { name: '가리봉동', nameEn: 'Garibong-dong' },
      { name: '개봉동', nameEn: 'Gaebong-dong' },
      { name: '고척동', nameEn: 'Gocheok-dong' },
      { name: '구로동', nameEn: 'Guro-dong' },
      { name: '궁동', nameEn: 'Gung-dong' },
      { name: '디지털단지', nameEn: 'Digital Complex' },
      { name: '번대방동', nameEn: 'Beondaebang-dong' },
      { name: '신도림동', nameEn: 'Sindorim-dong' },
      { name: '오류동', nameEn: 'Oryu-dong' },
      { name: '온수동', nameEn: 'Onsu-dong' },
      { name: '천왕동', nameEn: 'Cheonwang-dong' },
      { name: '항동', nameEn: 'Hang-dong' }
    ]
  },
  {
    name: '금천구',
    nameEn: 'Geumcheon-gu',
    code: '11545',
    dongs: [
      { name: '가산동', nameEn: 'Gasan-dong' },
      { name: '독산동', nameEn: 'Doksan-dong' },
      { name: '시흥동', nameEn: 'Siheung-dong' }
    ]
  },
  {
    name: '노원구',
    nameEn: 'Nowon-gu',
    code: '11350',
    dongs: [
      { name: '공릉동', nameEn: 'Gongneung-dong' },
      { name: '상계동', nameEn: 'Sanggye-dong' },
      { name: '월계동', nameEn: 'Wolgye-dong' },
      { name: '중계동', nameEn: 'Junggye-dong' },
      { name: '하계동', nameEn: 'Hagye-dong' }
    ]
  },
  {
    name: '도봉구',
    nameEn: 'Dobong-gu',
    code: '11320',
    dongs: [
      { name: '도봉동', nameEn: 'Dobong-dong' },
      { name: '방학동', nameEn: 'Banghak-dong' },
      { name: '쌍문동', nameEn: 'Ssangmun-dong' },
      { name: '창동', nameEn: 'Chang-dong' }
    ]
  },
  {
    name: '동대문구',
    nameEn: 'Dongdaemun-gu',
    code: '11230',
    dongs: [
      { name: '답십리동', nameEn: 'Dapsimni-dong' },
      { name: '신설동', nameEn: 'Sinseol-dong' },
      { name: '용두동', nameEn: 'Yongdu-dong' },
      { name: '이문동', nameEn: 'Imun-dong' },
      { name: '장안동', nameEn: 'Jangan-dong' },
      { name: '전농동', nameEn: 'Jeonnong-dong' },
      { name: '제기동', nameEn: 'Jegi-dong' },
      { name: '청량리동', nameEn: 'Cheongnyangni-dong' },
      { name: '회기동', nameEn: 'Hoegi-dong' }
    ]
  },
  {
    name: '동작구',
    nameEn: 'Dongjak-gu',
    code: '11590',
    dongs: [
      { name: '노량진동', nameEn: 'Noryangjin-dong' },
      { name: '대방동', nameEn: 'Daebang-dong' },
      { name: '동작동', nameEn: 'Dongjak-dong' },
      { name: '본동', nameEn: 'Bon-dong' },
      { name: '사당동', nameEn: 'Sadang-dong' },
      { name: '상도동', nameEn: 'Sangdo-dong' },
      { name: '신대방동', nameEn: 'Sindaebang-dong' },
      { name: '흑석동', nameEn: 'Heukseok-dong' }
    ]
  },
  {
    name: '마포구',
    nameEn: 'Mapo-gu',
    code: '11440',
    dongs: [
      { name: '공덕동', nameEn: 'Gongdeok-dong' },
      { name: '구수동', nameEn: 'Gusu-dong' },
      { name: '노고산동', nameEn: 'Nogosan-dong' },
      { name: '대흥동', nameEn: 'Daeheung-dong' },
      { name: '도화동', nameEn: 'Dohwa-dong' },
      { name: '동교동', nameEn: 'Donggyo-dong' },
      { name: '마포동', nameEn: 'Mapo-dong' },
      { name: '망원동', nameEn: 'Mangwon-dong' },
      { name: '상수동', nameEn: 'Sangsu-dong' },
      { name: '서교동', nameEn: 'Seogyo-dong' },
      { name: '성산동', nameEn: 'Seongsan-dong' },
      { name: '신공덕동', nameEn: 'Singongdeok-dong' },
      { name: '신수동', nameEn: 'Sinsu-dong' },
      { name: '신정동', nameEn: 'Sinjeong-dong' },
      { name: '아현동', nameEn: 'Ahyeon-dong' },
      { name: '연남동', nameEn: 'Yeonnam-dong' },
      { name: '염리동', nameEn: 'Yeomni-dong' },
      { name: '용강동', nameEn: 'Yonggang-dong' },
      { name: '합정동', nameEn: 'Hapjeong-dong' },
      { name: '현석동', nameEn: 'Hyeonseok-dong' }
    ]
  },
  {
    name: '서대문구',
    nameEn: 'Seodaemun-gu',
    code: '11410',
    dongs: [
      { name: '남가좌동', nameEn: 'Namgajwa-dong' },
      { name: '냉천동', nameEn: 'Naengcheon-dong' },
      { name: '대신동', nameEn: 'Daesin-dong' },
      { name: '대현동', nameEn: 'Daehyeon-dong' },
      { name: '미근동', nameEn: 'Migeun-dong' },
      { name: '봉원동', nameEn: 'Bongwon-dong' },
      { name: '북가좌동', nameEn: 'Bukgajwa-dong' },
      { name: '북아현동', nameEn: 'Bugahyeon-dong' },
      { name: '신촌동', nameEn: 'Sinchon-dong' },
      { name: '연희동', nameEn: 'Yeonhui-dong' },
      { name: '영천동', nameEn: 'Yeongcheon-dong' },
      { name: '옥천동', nameEn: 'Okcheon-dong' },
      { name: '창천동', nameEn: 'Changcheon-dong' },
      { name: '천연동', nameEn: 'Cheonyeon-dong' },
      { name: '충정로', nameEn: 'Chungjeong-ro' },
      { name: '홍은동', nameEn: 'Hongeun-dong' },
      { name: '홍제동', nameEn: 'Hongje-dong' }
    ]
  },
  {
    name: '서초구',
    nameEn: 'Seocho-gu',
    code: '11650',
    dongs: [
      { name: '내곡동', nameEn: 'Naegok-dong' },
      { name: '반포동', nameEn: 'Banpo-dong' },
      { name: '방배동', nameEn: 'Bangbae-dong' },
      { name: '서초동', nameEn: 'Seocho-dong' },
      { name: '신원동', nameEn: 'Sinwon-dong' },
      { name: '양재동', nameEn: 'Yangjae-dong' },
      { name: '염곡동', nameEn: 'Yeomgok-dong' },
      { name: '우면동', nameEn: 'Umyeon-dong' },
      { name: '원지동', nameEn: 'Wonji-dong' },
      { name: '잠원동', nameEn: 'Jamwon-dong' }
    ]
  },
  {
    name: '성동구',
    nameEn: 'Seongdong-gu',
    code: '11200',
    dongs: [
      { name: '금호동1가', nameEn: 'Geumho-dong 1-ga' },
      { name: '금호동2가', nameEn: 'Geumho-dong 2-ga' },
      { name: '금호동3가', nameEn: 'Geumho-dong 3-ga' },
      { name: '금호동4가', nameEn: 'Geumho-dong 4-ga' },
      { name: '도선동', nameEn: 'Doseon-dong' },
      { name: '마장동', nameEn: 'Majang-dong' },
      { name: '사근동', nameEn: 'Sageun-dong' },
      { name: '상왕십리동', nameEn: 'Sangwangsimni-dong' },
      { name: '성수동1가', nameEn: 'Seongsu-dong 1-ga' },
      { name: '성수동2가', nameEn: 'Seongsu-dong 2-ga' },
      { name: '송정동', nameEn: 'Songjeong-dong' },
      { name: '용답동', nameEn: 'Yongdap-dong' },
      { name: '옥수동', nameEn: 'Oksu-dong' },
      { name: '왕십리동', nameEn: 'Wangsimni-dong' },
      { name: '왕십리2동', nameEn: 'Wangsimni 2-dong' },
      { name: '하왕십리동', nameEn: 'Hawangsimni-dong' },
      { name: '행당동', nameEn: 'Haengdang-dong' },
      { name: '홍익동', nameEn: 'Hongik-dong' },
      { name: '응봉동', nameEn: 'Eungbong-dong' }
    ]
  },
  {
    name: '성북구',
    nameEn: 'Seongbuk-gu',
    code: '11290',
    dongs: [
      { name: '길음동', nameEn: 'Gireum-dong' },
      { name: '돈암동', nameEn: 'Donam-dong' },
      { name: '돈암동1가', nameEn: 'Donam-dong 1-ga' },
      { name: '돈암동2가', nameEn: 'Donam-dong 2-ga' },
      { name: '동선동', nameEn: 'Dongseon-dong' },
      { name: '동선동1가', nameEn: 'Dongseon-dong 1-ga' },
      { name: '동선동2가', nameEn: 'Dongseon-dong 2-ga' },
      { name: '동선동3가', nameEn: 'Dongseon-dong 3-ga' },
      { name: '동선동4가', nameEn: 'Dongseon-dong 4-ga' },
      { name: '동선동5가', nameEn: 'Dongseon-dong 5-ga' },
      { name: '동소문동', nameEn: 'Dongsomun-dong' },
      { name: '동소문동1가', nameEn: 'Dongsomun-dong 1-ga' },
      { name: '동소문동2가', nameEn: 'Dongsomun-dong 2-ga' },
      { name: '동소문동3가', nameEn: 'Dongsomun-dong 3-ga' },
      { name: '동소문동4가', nameEn: 'Dongsomun-dong 4-ga' },
      { name: '동소문동5가', nameEn: 'Dongsomun-dong 5-ga' },
      { name: '동소문동6가', nameEn: 'Dongsomun-dong 6-ga' },
      { name: '동소문동7가', nameEn: 'Dongsomun-dong 7-ga' },
      { name: '보문동', nameEn: 'Bomun-dong' },
      { name: '보문동1가', nameEn: 'Bomun-dong 1-ga' },
      { name: '보문동2가', nameEn: 'Bomun-dong 2-ga' },
      { name: '보문동3가', nameEn: 'Bomun-dong 3-ga' },
      { name: '보문동4가', nameEn: 'Bomun-dong 4-ga' },
      { name: '보문동5가', nameEn: 'Bomun-dong 5-ga' },
      { name: '보문동6가', nameEn: 'Bomun-dong 6-ga' },
      { name: '보문동7가', nameEn: 'Bomun-dong 7-ga' },
      { name: '삼선동', nameEn: 'Samseon-dong' },
      { name: '삼선동1가', nameEn: 'Samseon-dong 1-ga' },
      { name: '삼선동2가', nameEn: 'Samseon-dong 2-ga' },
      { name: '삼선동3가', nameEn: 'Samseon-dong 3-ga' },
      { name: '삼선동4가', nameEn: 'Samseon-dong 4-ga' },
      { name: '삼선동5가', nameEn: 'Samseon-dong 5-ga' },
      { name: '석관동', nameEn: 'Seokgwan-dong' },
      { name: '성북동', nameEn: 'Seongbuk-dong' },
      { name: '성북동1가', nameEn: 'Seongbuk-dong 1-ga' },
      { name: '안암동', nameEn: 'Anam-dong' },
      { name: '안암동1가', nameEn: 'Anam-dong 1-ga' },
      { name: '안암동2가', nameEn: 'Anam-dong 2-ga' },
      { name: '안암동3가', nameEn: 'Anam-dong 3-ga' },
      { name: '안암동4가', nameEn: 'Anam-dong 4-ga' },
      { name: '안암동5가', nameEn: 'Anam-dong 5-ga' },
      { name: '장위동', nameEn: 'Jangwi-dong' },
      { name: '정릉동', nameEn: 'Jeongneung-dong' },
      { name: '종암동', nameEn: 'Jongam-dong' }
    ]
  },
  {
    name: '송파구',
    nameEn: 'Songpa-gu',
    code: '11710',
    dongs: [
      { name: '가락동', nameEn: 'Garak-dong' },
      { name: '거여동', nameEn: 'Geoyeo-dong' },
      { name: '마천동', nameEn: 'Macheon-dong' },
      { name: '문정동', nameEn: 'Munjeong-dong' },
      { name: '방이동', nameEn: 'Bangi-dong' },
      { name: '삼전동', nameEn: 'Samjeon-dong' },
      { name: '석촌동', nameEn: 'Seokchon-dong' },
      { name: '송파동', nameEn: 'Songpa-dong' },
      { name: '신천동', nameEn: 'Sincheon-dong' },
      { name: '오금동', nameEn: 'Ogeum-dong' },
      { name: '장지동', nameEn: 'Jangji-dong' },
      { name: '잠실동', nameEn: 'Jamsil-dong' },
      { name: '풍납동', nameEn: 'Pungnap-dong' }
    ]
  },
  {
    name: '양천구',
    nameEn: 'Yangcheon-gu',
    code: '11470',
    dongs: [
      { name: '목동', nameEn: 'Mok-dong' },
      { name: '신월동', nameEn: 'Sinwol-dong' },
      { name: '신정동', nameEn: 'Sinjeong-dong' },
      { name: '신월1동', nameEn: 'Sinwol 1-dong' },
      { name: '신월2동', nameEn: 'Sinwol 2-dong' },
      { name: '신월3동', nameEn: 'Sinwol 3-dong' },
      { name: '신월4동', nameEn: 'Sinwol 4-dong' },
      { name: '신월5동', nameEn: 'Sinwol 5-dong' },
      { name: '신월6동', nameEn: 'Sinwol 6-dong' },
      { name: '신월7동', nameEn: 'Sinwol 7-dong' },
      { name: '신정1동', nameEn: 'Sinjeong 1-dong' },
      { name: '신정2동', nameEn: 'Sinjeong 2-dong' },
      { name: '신정3동', nameEn: 'Sinjeong 3-dong' },
      { name: '신정4동', nameEn: 'Sinjeong 4-dong' },
      { name: '신정6동', nameEn: 'Sinjeong 6-dong' },
      { name: '신정7동', nameEn: 'Sinjeong 7-dong' },
      { name: '목1동', nameEn: 'Mok 1-dong' },
      { name: '목2동', nameEn: 'Mok 2-dong' },
      { name: '목3동', nameEn: 'Mok 3-dong' },
      { name: '목4동', nameEn: 'Mok 4-dong' },
      { name: '목5동', nameEn: 'Mok 5-dong' }
    ]
  },
  {
    name: '영등포구',
    nameEn: 'Yeongdeungpo-gu',
    code: '11560',
    dongs: [
      { name: '경인로', nameEn: 'Gyeongin-ro' },
      { name: '당산동', nameEn: 'Dangsan-dong' },
      { name: '당산동1가', nameEn: 'Dangsan-dong 1-ga' },
      { name: '당산동2가', nameEn: 'Dangsan-dong 2-ga' },
      { name: '당산동3가', nameEn: 'Dangsan-dong 3-ga' },
      { name: '당산동4가', nameEn: 'Dangsan-dong 4-ga' },
      { name: '당산동5가', nameEn: 'Dangsan-dong 5-ga' },
      { name: '당산동6가', nameEn: 'Dangsan-dong 6-ga' },
      { name: '대림동', nameEn: 'Daerim-dong' },
      { name: '도림동', nameEn: 'Dorim-dong' },
      { name: '문래동', nameEn: 'Mullae-dong' },
      { name: '문래동1가', nameEn: 'Mullae-dong 1-ga' },
      { name: '문래동2가', nameEn: 'Mullae-dong 2-ga' },
      { name: '문래동3가', nameEn: 'Mullae-dong 3-ga' },
      { name: '문래동4가', nameEn: 'Mullae-dong 4-ga' },
      { name: '문래동5가', nameEn: 'Mullae-dong 5-ga' },
      { name: '문래동6가', nameEn: 'Mullae-dong 6-ga' },
      { name: '양평동', nameEn: 'Yangpyeong-dong' },
      { name: '양평동1가', nameEn: 'Yangpyeong-dong 1-ga' },
      { name: '양평동2가', nameEn: 'Yangpyeong-dong 2-ga' },
      { name: '양평동3가', nameEn: 'Yangpyeong-dong 3-ga' },
      { name: '양평동4가', nameEn: 'Yangpyeong-dong 4-ga' },
      { name: '양평동5가', nameEn: 'Yangpyeong-dong 5-ga' },
      { name: '양평동6가', nameEn: 'Yangpyeong-dong 6-ga' },
      { name: '양화동', nameEn: 'Yanghwa-dong' },
      { name: '여의도동', nameEn: 'Yeouido-dong' },
      { name: '영등포동', nameEn: 'Yeongdeungpo-dong' },
      { name: '영등포동1가', nameEn: 'Yeongdeungpo-dong 1-ga' },
      { name: '영등포동2가', nameEn: 'Yeongdeungpo-dong 2-ga' },
      { name: '영등포동3가', nameEn: 'Yeongdeungpo-dong 3-ga' },
      { name: '영등포동4가', nameEn: 'Yeongdeungpo-dong 4-ga' },
      { name: '영등포동5가', nameEn: 'Yeongdeungpo-dong 5-ga' },
      { name: '영등포동6가', nameEn: 'Yeongdeungpo-dong 6-ga' },
      { name: '영등포동7가', nameEn: 'Yeongdeungpo-dong 7-ga' },
      { name: '영등포동8가', nameEn: 'Yeongdeungpo-dong 8-ga' }
    ]
  },
  {
    name: '용산구',
    nameEn: 'Yongsan-gu',
    code: '11170',
    dongs: [
      { name: '갈월동', nameEn: 'Galwol-dong' },
      { name: '남영동', nameEn: 'Namyeong-dong' },
      { name: '도원동', nameEn: 'Dowon-dong' },
      { name: '동빙고동', nameEn: 'Dongbinggo-dong' },
      { name: '동자동', nameEn: 'Dongja-dong' },
      { name: '문배동', nameEn: 'Munbae-dong' },
      { name: '보광동', nameEn: 'Bogwang-dong' },
      { name: '산천동', nameEn: 'Sancheon-dong' },
      { name: '서계동', nameEn: 'Seogye-dong' },
      { name: '서빙고동', nameEn: 'Seobinggo-dong' },
      { name: '신계동', nameEn: 'Singye-dong' },
      { name: '신창동', nameEn: 'Sinchang-dong' },
      { name: '원효로1가', nameEn: 'Wonhyo-ro 1-ga' },
      { name: '원효로2가', nameEn: 'Wonhyo-ro 2-ga' },
      { name: '원효로3가', nameEn: 'Wonhyo-ro 3-ga' },
      { name: '원효로4가', nameEn: 'Wonhyo-ro 4-ga' },
      { name: '용문동', nameEn: 'Yongmun-dong' },
      { name: '용산동1가', nameEn: 'Yongsan-dong 1-ga' },
      { name: '용산동2가', nameEn: 'Yongsan-dong 2-ga' },
      { name: '용산동3가', nameEn: 'Yongsan-dong 3-ga' },
      { name: '용산동4가', nameEn: 'Yongsan-dong 4-ga' },
      { name: '용산동5가', nameEn: 'Yongsan-dong 5-ga' },
      { name: '용산동6가', nameEn: 'Yongsan-dong 6-ga' },
      { name: '이촌동', nameEn: 'Ichon-dong' },
      { name: '이태원동', nameEn: 'Itaewon-dong' },
      { name: '주성동', nameEn: 'Juseong-dong' },
      { name: '청파동1가', nameEn: 'Cheongpa-dong 1-ga' },
      { name: '청파동2가', nameEn: 'Cheongpa-dong 2-ga' },
      { name: '청파동3가', nameEn: 'Cheongpa-dong 3-ga' },
      { name: '한강로1가', nameEn: 'Hangang-ro 1-ga' },
      { name: '한강로2가', nameEn: 'Hangang-ro 2-ga' },
      { name: '한강로3가', nameEn: 'Hangang-ro 3-ga' },
      { name: '한남동', nameEn: 'Hannam-dong' },
      { name: '효창동', nameEn: 'Hyochang-dong' },
      { name: '후암동', nameEn: 'Huam-dong' }
    ]
  },
  {
    name: '은평구',
    nameEn: 'Eunpyeong-gu',
    code: '11380',
    dongs: [
      { name: '갈현동', nameEn: 'Galhyeon-dong' },
      { name: '구산동', nameEn: 'Gusan-dong' },
      { name: '녹번동', nameEn: 'Nokbeon-dong' },
      { name: '대조동', nameEn: 'Daejo-dong' },
      { name: '불광동', nameEn: 'Bulgwang-dong' },
      { name: '수색동', nameEn: 'Susaek-dong' },
      { name: '신사동', nameEn: 'Sinsa-dong' },
      { name: '역촌동', nameEn: 'Yeokchon-dong' },
      { name: '응암동', nameEn: 'Eungam-dong' },
      { name: '증산동', nameEn: 'Jeungsan-dong' },
      { name: '진관동', nameEn: 'Jingwan-dong' }
    ]
  },
  {
    name: '종로구',
    nameEn: 'Jongno-gu',
    code: '11110',
    dongs: [
      { name: '가회동', nameEn: 'Gahoe-dong' },
      { name: '견지동', nameEn: 'Gyeonji-dong' },
      { name: '경운동', nameEn: 'Gyeong-un-dong' },
      { name: '계동', nameEn: 'Gye-dong' },
      { name: '공평동', nameEn: 'Gongpyeong-dong' },
      { name: '관수동', nameEn: 'Gwansu-dong' },
      { name: '관철동', nameEn: 'Gwancheol-dong' },
      { name: '관훈동', nameEn: 'Gwanhun-dong' },
      { name: '관철동', nameEn: 'Gwancheol-dong' },
      { name: '교남동', nameEn: 'Gyonam-dong' },
      { name: '교북동', nameEn: 'Gyobuk-dong' },
      { name: '구기동', nameEn: 'Gugi-dong' },
      { name: '궁정동', nameEn: 'Gungjeong-dong' },
      { name: '권농동', nameEn: 'Gwonnong-dong' },
      { name: '낙원동', nameEn: 'Nagwon-dong' },
      { name: '내수동', nameEn: 'Naesu-dong' },
      { name: '내자동', nameEn: 'Naeja-dong' },
      { name: '누상동', nameEn: 'Nusang-dong' },
      { name: '누하동', nameEn: 'Nuha-dong' },
      { name: '당주동', nameEn: 'Dangju-dong' },
      { name: '도렴동', nameEn: 'Doryeom-dong' },
      { name: '돈의동', nameEn: 'Donui-dong' },
      { name: '동숭동', nameEn: 'Dongsung-dong' },
      { name: '묘동', nameEn: 'Myo-dong' },
      { name: '무악동', nameEn: 'Muak-dong' },
      { name: '부암동', nameEn: 'Buam-dong' },
      { name: '봉익동', nameEn: 'Bongik-dong' },
      { name: '사간동', nameEn: 'Sagan-dong' },
      { name: '사직동', nameEn: 'Sajik-dong' },
      { name: '삼청동', nameEn: 'Samcheong-dong' },
      { name: '서린동', nameEn: 'Seorin-dong' },
      { name: '세종로', nameEn: 'Sejong-ro' },
      { name: '소격동', nameEn: 'Sogyeok-dong' },
      { name: '송월동', nameEn: 'Songwol-dong' },
      { name: '송현동', nameEn: 'Songhyeon-dong' },
      { name: '수송동', nameEn: 'Susong-dong' },
      { name: '숭인동', nameEn: 'Sungin-dong' },
      { name: '신교동', nameEn: 'Singyo-dong' },
      { name: '신문로1가', nameEn: 'Sinmun-ro 1-ga' },
      { name: '신문로2가', nameEn: 'Sinmun-ro 2-ga' },
      { name: '신영동', nameEn: 'Sinyeong-dong' },
      { name: '안국동', nameEn: 'Anguk-dong' },
      { name: '연건동', nameEn: 'Yeongeon-dong' },
      { name: '연지동', nameEn: 'Yeonji-dong' },
      { name: '예지동', nameEn: 'Yeji-dong' },
      { name: '옥인동', nameEn: 'Ogin-dong' },
      { name: '와룡동', nameEn: 'Waryong-dong' },
      { name: '운니동', nameEn: 'Unni-dong' },
      { name: '원남동', nameEn: 'Wonnam-dong' },
      { name: '원서동', nameEn: 'Wonseo-dong' },
      { name: '이화동', nameEn: 'Ihwa-dong' },
      { name: '익선동', nameEn: 'Ikseon-dong' },
      { name: '인사동', nameEn: 'Insa-dong' },
      { name: '인의동', nameEn: 'Inui-dong' },
      { name: '장사동', nameEn: 'Jangsa-dong' },
      { name: '재동', nameEn: 'Jae-dong' },
      { name: '적선동', nameEn: 'Jeokseon-dong' },
      { name: '종로1가', nameEn: 'Jongno 1-ga' },
      { name: '종로2가', nameEn: 'Jongno 2-ga' },
      { name: '종로3가', nameEn: 'Jongno 3-ga' },
      { name: '종로4가', nameEn: 'Jongno 4-ga' },
      { name: '종로5가', nameEn: 'Jongno 5-ga' },
      { name: '종로6가', nameEn: 'Jongno 6-ga' },
      { name: '중학동', nameEn: 'Junghak-dong' },
      { name: '창성동', nameEn: 'Changseong-dong' },
      { name: '창신동', nameEn: 'Changsin-dong' },
      { name: '청운동', nameEn: 'Cheongun-dong' },
      { name: '청진동', nameEn: 'Cheongjin-dong' },
      { name: '체부동', nameEn: 'Chebu-dong' },
      { name: '충신동', nameEn: 'Chungsin-dong' },
      { name: '통의동', nameEn: 'Tongui-dong' },
      { name: '통인동', nameEn: 'Tongin-dong' },
      { name: '팔판동', nameEn: 'Palpan-dong' },
      { name: '평동', nameEn: 'Pyeong-dong' },
      { name: '평창동', nameEn: 'Pyeongchang-dong' },
      { name: '필운동', nameEn: 'Pirun-dong' },
      { name: '행촌동', nameEn: 'Haengchon-dong' },
      { name: '혜화동', nameEn: 'Hyehwa-dong' },
      { name: '홍지동', nameEn: 'Hongji-dong' },
      { name: '홍파동', nameEn: 'Hongpa-dong' },
      { name: '화동', nameEn: 'Hwa-dong' },
      { name: '효자동', nameEn: 'Hyoja-dong' },
      { name: '효제동', nameEn: 'Hyoje-dong' },
      { name: '훈정동', nameEn: 'Hunjeong-dong' }
    ]
  },
  {
    name: '중구',
    nameEn: 'Jung-gu',
    code: '11140',
    dongs: [
      { name: '광희동', nameEn: 'Gwanghui-dong' },
      { name: '남대문로1가', nameEn: 'Namdaemun-ro 1-ga' },
      { name: '남대문로2가', nameEn: 'Namdaemun-ro 2-ga' },
      { name: '남대문로3가', nameEn: 'Namdaemun-ro 3-ga' },
      { name: '남대문로4가', nameEn: 'Namdaemun-ro 4-ga' },
      { name: '남대문로5가', nameEn: 'Namdaemun-ro 5-ga' },
      { name: '남산동1가', nameEn: 'Namsan-dong 1-ga' },
      { name: '남산동2가', nameEn: 'Namsan-dong 2-ga' },
      { name: '남산동3가', nameEn: 'Namsan-dong 3-ga' },
      { name: '남창동', nameEn: 'Namchang-dong' },
      { name: '남학동', nameEn: 'Namhak-dong' },
      { name: '다동', nameEn: 'Da-dong' },
      { name: '덕수궁길', nameEn: 'Deoksugung-gil' },
      { name: '무교동', nameEn: 'Mugyo-dong' },
      { name: '명동1가', nameEn: 'Myeong-dong 1-ga' },
      { name: '명동2가', nameEn: 'Myeong-dong 2-ga' },
      { name: '무학동', nameEn: 'Muhak-dong' },
      { name: '북창동', nameEn: 'Bukchang-dong' },
      { name: '봉래동1가', nameEn: 'Bongnae-dong 1-ga' },
      { name: '봉래동2가', nameEn: 'Bongnae-dong 2-ga' },
      { name: '산림동', nameEn: 'Sallim-dong' },
      { name: '서소문동', nameEn: 'Seosomun-dong' },
      { name: '소공동', nameEn: 'Sogong-dong' },
      { name: '수표동', nameEn: 'Supyo-dong' },
      { name: '수하동', nameEn: 'Suha-dong' },
      { name: '순화동', nameEn: 'Sunhwa-dong' },
      { name: '신당동', nameEn: 'Sindang-dong' },
      { name: '쌍림동', nameEn: 'Ssanglim-dong' },
      { name: '예관동', nameEn: 'Yegwan-dong' },
      { name: '예장동', nameEn: 'Yejang-dong' },
      { name: '오장동', nameEn: 'Ojang-dong' },
      { name: '을지로1가', nameEn: 'Euljiro 1-ga' },
      { name: '을지로2가', nameEn: 'Euljiro 2-ga' },
      { name: '을지로3가', nameEn: 'Euljiro 3-ga' },
      { name: '을지로4가', nameEn: 'Euljiro 4-ga' },
      { name: '을지로5가', nameEn: 'Euljiro 5-ga' },
      { name: '을지로6가', nameEn: 'Euljiro 6-ga' },
      { name: '을지로7가', nameEn: 'Euljiro 7-ga' },
      { name: '의주로1가', nameEn: 'Uiju-ro 1-ga' },
      { name: '의주로2가', nameEn: 'Uiju-ro 2-ga' },
      { name: '인현동1가', nameEn: 'Inhyeon-dong 1-ga' },
      { name: '인현동2가', nameEn: 'Inhyeon-dong 2-ga' },
      { name: '입정동', nameEn: 'Ipjeong-dong' },
      { name: '장교동', nameEn: 'Janggyo-dong' },
      { name: '장충동1가', nameEn: 'Jangchung-dong 1-ga' },
      { name: '장충동2가', nameEn: 'Jangchung-dong 2-ga' },
      { name: '저동1가', nameEn: 'Jeo-dong 1-ga' },
      { name: '저동2가', nameEn: 'Jeo-dong 2-ga' },
      { name: '정동', nameEn: 'Jeong-dong' },
      { name: '주교동', nameEn: 'Jugyo-dong' },
      { name: '주자동', nameEn: 'Juja-dong' },
      { name: '중림동', nameEn: 'Jungnim-dong' },
      { name: '초동', nameEn: 'Cho-dong' },
      { name: '충무로1가', nameEn: 'Chungmuro 1-ga' },
      { name: '충무로2가', nameEn: 'Chungmuro 2-ga' },
      { name: '충무로3가', nameEn: 'Chungmuro 3-ga' },
      { name: '충무로4가', nameEn: 'Chungmuro 4-ga' },
      { name: '충무로5가', nameEn: 'Chungmuro 5-ga' },
      { name: '태평로1가', nameEn: 'Taepyeong-ro 1-ga' },
      { name: '태평로2가', nameEn: 'Taepyeong-ro 2-ga' },
      { name: '퇴계로1가', nameEn: 'Toegye-ro 1-ga' },
      { name: '퇴계로2가', nameEn: 'Toegye-ro 2-ga' },
      { name: '퇴계로3가', nameEn: 'Toegye-ro 3-ga' },
      { name: '퇴계로4가', nameEn: 'Toegye-ro 4-ga' },
      { name: '퇴계로5가', nameEn: 'Toegye-ro 5-ga' },
      { name: '퇴계로6가', nameEn: 'Toegye-ro 6-ga' },
      { name: '필동1가', nameEn: 'Pil-dong 1-ga' },
      { name: '필동2가', nameEn: 'Pil-dong 2-ga' },
      { name: '필동3가', nameEn: 'Pil-dong 3-ga' },
      { name: '황학동', nameEn: 'Hwanghak-dong' },
      { name: '회현동1가', nameEn: 'Hoehyeon-dong 1-ga' },
      { name: '회현동2가', nameEn: 'Hoehyeon-dong 2-ga' },
      { name: '회현동3가', nameEn: 'Hoehyeon-dong 3-ga' },
      { name: '흥인동', nameEn: 'Heungin-dong' }
    ]
  },
  {
    name: '중랑구',
    nameEn: 'Jungnang-gu',
    code: '11260',
    dongs: [
      { name: '망우동', nameEn: 'Mangu-dong' },
      { name: '면목동', nameEn: 'Myeonmok-dong' },
      { name: '묵동', nameEn: 'Muk-dong' },
      { name: '상봉동', nameEn: 'Sangbong-dong' },
      { name: '신내동', nameEn: 'Sinnae-dong' },
      { name: '중화동', nameEn: 'Junghwa-dong' }
    ]
  }
];

// Load comprehensive apartment database from MOLIT data
let APARTMENT_DATABASE: Apartment[] | null = null;

/**
 * Load comprehensive apartment database from generated JSON file
 * This contains ALL apartments in Seoul with recent transactions
 */
function loadApartmentDatabase(): Apartment[] {
  if (APARTMENT_DATABASE) {
    return APARTMENT_DATABASE;
  }

  try {
    // In production, this would be loaded from the JSON file
    // For now, we'll use dynamic import or fs.readFileSync in Node.js context
    if (typeof window === 'undefined') {
      // Server-side
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'scripts', 'apartment-database.json');

      if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        APARTMENT_DATABASE = data.apartments;
        console.log(`✅ Loaded ${APARTMENT_DATABASE?.length || 0} apartments from database`);
        return APARTMENT_DATABASE || [];
      }
    }
  } catch (error) {
    console.warn('Failed to load apartment database, falling back to hardcoded list:', error);
  }

  // Fallback to hardcoded list if database file not found
  return SEOUL_APARTMENTS_FALLBACK;
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
 * Get comprehensive apartment list
 * Loads from database file if available, otherwise uses fallback
 */
export const SEOUL_APARTMENTS: Apartment[] = loadApartmentDatabase();

export function getDistrictByCode(code: string): District | undefined {
  return SEOUL_DISTRICTS.find(d => d.code === code);
}

export function getDistrictByName(name: string): District | undefined {
  return SEOUL_DISTRICTS.find(d => d.name === name);
}

export function searchApartments(query: string, dong?: string, district?: string): Apartment[] {
  const lowerQuery = query.toLowerCase();
  return SEOUL_APARTMENTS.filter(apt => {
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
  const apartment = SEOUL_APARTMENTS.find(apt => apt.name === buildingName);

  if (apartment?.molitNames) {
    // Return original name + MOLIT variants
    return [buildingName, ...apartment.molitNames];
  }

  // If no variants found, just return the original name
  return [buildingName];
}
