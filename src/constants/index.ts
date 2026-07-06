/** 폰트 패밀리 헬퍼 */
export const FONTS = {
  light:  'GmarketSans-Light',
  medium: 'GmarketSans-Medium',
  bold:   'GmarketSans-Bold',
} as const;

export const COLORS = {
  // ── 기본 ──
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textMuted: '#5F5A58',
  border: '#B7B8B9',
  // ── 네이비 포인트 ──
  navy: '#2A5480',
  navyDark: '#1A3A52',
  navyLight: '#E8EEF4',
  // ── 회색 ──
  gray: '#B7B8B9',
  grayDark: '#5F5A58',
  // ── 하위 호환 별칭 (기존 스크린 참조 유지) ──
  green: '#2A5480',
  greenLight: '#E8EEF4',
  heartRed: '#2A5480',
  sweat: '#2A5480',
  yellow: '#F5F5F5',
  lavender: '#2A5480',
  lavenderBg: '#E8EEF4',
};

/** Design-system shadow — 0 2px 8px rgba(0,0,0,0.06) */
export const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
} as const;

export type MoodId =
  | 'good' | 'calm' | 'tired' | 'anxious'
  | 'lonely' | 'angry' | 'lethargic' | 'complex'
  | 'excited' | 'unknown';

export interface Mood {
  id: MoodId;
  label: string;
  emoji: string;
  weather: string;
  iconName: string;
  iconColor: string;
  selectedBg: string;
}

export const MOODS: Mood[] = [
  { id: 'good',      label: '행복해',   emoji: '😊', weather: '맑음',     iconName: 'sunny',        iconColor: '#FFB800', selectedBg: '#FFF9E0' },
  { id: 'calm',      label: '편안해',   emoji: '😌', weather: '구름 조금', iconName: 'partly-sunny', iconColor: '#4DA8D8', selectedBg: '#E0F2FF' },
  { id: 'lethargic', label: '우울해',   emoji: '😶', weather: '비',       iconName: 'rainy',        iconColor: '#8B7EC8', selectedBg: '#EDEAF8' },
  { id: 'anxious',   label: '불안해',   emoji: '😰', weather: '천둥',     iconName: 'thunderstorm', iconColor: '#6670BB', selectedBg: '#EAECFA' },
  { id: 'tired',     label: '피곤나',   emoji: '😮‍💨', weather: '흐림',     iconName: 'cloudy',       iconColor: '#9E9E9E', selectedBg: '#F0F0F0' },
  { id: 'lonely',    label: '외로워',   emoji: '🥺', weather: '안개',     iconName: 'moon',         iconColor: '#7E57C2', selectedBg: '#EDE7F6' },
  { id: 'angry',     label: '화났어',   emoji: '😤', weather: '폭풍',     iconName: 'flame',        iconColor: '#EF6C00', selectedBg: '#FFF3E0' },
  { id: 'complex',   label: '복잡해',   emoji: '🌀', weather: '소나기',   iconName: 'cloud',        iconColor: '#78909C', selectedBg: '#ECEFF1' },
  { id: 'excited',   label: '기대돼',   emoji: '🌟', weather: '맑고 바람', iconName: 'star',         iconColor: '#FFA000', selectedBg: '#FFF8E1' },
  { id: 'unknown',   label: '모르겠어', emoji: '❓', weather: '예측 불가', iconName: 'help-circle',  iconColor: '#90A4AE', selectedBg: '#ECEFF1' },
];

export const MOOD_RESPONSES: Record<MoodId, [string, string]> = {
  good:      ['햇살처럼 빛나는 하루구나! 그 에너지 나눠줘 🌞', '오늘 정말 좋아 보여! 덩달아 나도 기분 좋다!'],
  calm:      ['잔잔한 물결 같은 하루네 🌊 그대로 흘려보내봐.', '평온한 마음이 최고의 힘이야, 천천히 가도 돼.'],
  lethargic: ['그런 날도 있지! 네 마음을 천천히 들려줘도 좋아. 💜', '우울할 때는 그냥 있어도 괜찮아, 내가 여기 있어.'],
  anxious:   ['불안할 땐 내가 여기 있어, 괜찮을 거야 🤝', '숨을 한 번 크게 쉬어봐. 같이 있을게.'],
  tired:     ['오늘 많이 피곤했구나. 쉬어도 정말 괜찮아 🌙', '피곤한 것도 열심히 살았다는 증거야.'],
  lonely:    ['혼자라고 느낄 때 내가 옆에 있을게 🫂', '외로워도 괜찮아, 우리 여기 있잖아.'],
  angry:     ['화가 날 만한 일이 있었구나 😤 충분히 화내도 돼.', '감정은 틀리지 않아. 잠깐 바람 쐬어볼까?'],
  complex:   ['머릿속이 복잡하구나. 천천히 풀어가자 🌀', '모든 감정이 뒤섞일 때 숨 한 번 쉬어봐.'],
  excited:   ['뭔가 기대되는 게 있어? 나도 설레! ✨', '두근두근! 좋은 일이 기다리고 있을 거야.'],
  unknown:   ['지금 어떤지 몰라도 괜찮아, 그게 진짜야 💭', '감정에 이름이 없어도 느끼는 것 자체가 소중해.'],
};

export interface Friend {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  description: string;
  personality: string;
}

export const ALL_FRIENDS: Friend[] = [
  { id: 'jejupi', name: 'JEJUPI', emoji: '🐬', bg: '#D4EFF8', description: '제주 바다에서 온 돌고래예요', personality: '활발하고 에너지 넘쳐요 ✨' },
  { id: 'dori',   name: 'DORI',   emoji: '🦌', bg: '#E4F5D0', description: '고요한 숲에서 온 사슴이에요',  personality: '차분하고 따뜻해요 🌿' },
  { id: 'kkama',  name: 'KKAMA',  emoji: '🐻', bg: '#EAE0F0', description: '산 속에서 온 곰이에요',        personality: '포근하고 든든해요 💜' },
  { id: 'mochi',  name: 'MOCHI',  emoji: '🐰', bg: '#FFE8E8', description: '들판에서 뛰어다니는 토끼예요', personality: '호기심 많고 귀여워요 🌸' },
  { id: 'sunny',  name: 'SUNNY',  emoji: '🌞', bg: '#FFF4D4', description: '하늘에서 온 햇님이에요',        personality: '늘 밝고 긍정적이에요 ☀️' },
  { id: 'momo',   name: 'MOMO',   emoji: '🐱', bg: '#F5E8FF', description: '골목에서 온 고양이예요',        personality: '신비롭고 독립적이에요 🌙' },
];

export type StatKey = 'vitality' | 'calm' | 'connect' | 'creative' | 'care';

export interface Mission {
  id: string;
  label: string;
  emoji: string;
  points: number;
  stat: StatKey;
}

export const MISSIONS: Mission[] = [
  { id: 'm1', label: '물 한 잔 마시기',      emoji: '💧', points: 5,  stat: 'vitality' },
  { id: 'm2', label: '창밖 1분 보기',        emoji: '🪟', points: 5,  stat: 'calm' },
  { id: 'm3', label: '집 앞 3분 걷기',       emoji: '🚶', points: 10, stat: 'vitality' },
  { id: 'm4', label: '좋아하는 노래 듣기',   emoji: '🎵', points: 5,  stat: 'creative' },
  { id: 'm5', label: '친구에게 안부 보내기', emoji: '💌', points: 10, stat: 'connect' },
  { id: 'm6', label: '스트레칭 5분',         emoji: '🧘', points: 10, stat: 'vitality' },
  { id: 'm7', label: '따뜻한 차 한 잔',      emoji: '☕', points: 5,  stat: 'care' },
  { id: 'm8', label: '오늘 감사한 것 1가지', emoji: '🙏', points: 5,  stat: 'calm' },
  { id: 'm9', label: '방 환기 시키기',       emoji: '🌬️', points: 5,  stat: 'care' },
];

/** 전체 미션 풀 — 기존 9개 + 신규 19개 = 28개 */
export const MISSION_POOL: Mission[] = [
  ...MISSIONS,
  // 사회적 교류
  { id: 'ms1', label: '가족에게 문자 보내기',     emoji: '📱', points: 10, stat: 'connect' },
  { id: 'ms2', label: '친구와 외출하기',          emoji: '👫', points: 15, stat: 'connect' },
  // 신체 활동
  { id: 'mb1', label: '짧은 산책하기',            emoji: '👟', points: 10, stat: 'vitality' },
  { id: 'mb2', label: '온라인 요가 수강하기',     emoji: '🧎', points: 10, stat: 'vitality' },
  { id: 'mb3', label: '헬스장 가기',              emoji: '🏋', points: 15, stat: 'vitality' },
  // 야외 활동
  { id: 'mo1', label: '공원 벤치에서 꽃구경하기', emoji: '🌸', points: 10, stat: 'calm' },
  { id: 'mo2', label: '낚시하기',                 emoji: '🎣', points: 10, stat: 'calm' },
  { id: 'mo3', label: '자전거 타기',              emoji: '🚴', points: 10, stat: 'vitality' },
  { id: 'mo4', label: '축구하기',                 emoji: '⚽', points: 10, stat: 'vitality' },
  // 동물과 함께
  { id: 'ma1', label: '강아지와 산책하기',        emoji: '🐕', points: 10, stat: 'connect' },
  { id: 'ma2', label: '고양이와 놀기',            emoji: '🐈', points: 5,  stat: 'care' },
  { id: 'ma3', label: '공원에서 새 관찰하기',     emoji: '🐦', points: 5,  stat: 'calm' },
  // 예술·창의
  { id: 'mc1', label: '새로운 레시피로 요리하기', emoji: '🍳', points: 10, stat: 'creative' },
  { id: 'mc2', label: '집 꾸미기',               emoji: '🏠', points: 5,  stat: 'creative' },
  { id: 'mc3', label: '그림 그리기',             emoji: '🎨', points: 10, stat: 'creative' },
  { id: 'mc4', label: '노래 부르기',             emoji: '🎤', points: 5,  stat: 'creative' },
  { id: 'mc5', label: '기타 연주하기',           emoji: '🎸', points: 10, stat: 'creative' },
  // 자기 돌봄
  { id: 'msc1', label: '음악 듣기',              emoji: '🎧', points: 5,  stat: 'care' },
  { id: 'msc2', label: '좋아하는 책 읽기',       emoji: '📚', points: 10, stat: 'care' },
];

/** 날짜 시드 기반으로 오늘의 서버 미션 5개 뽑기 */
export function getDailyServerMissions(dateStr: string, count = 5): Mission[] {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed * 31 + dateStr.charCodeAt(i)) & 0xffffffff) >>> 0;
  }
  const pool = [...MISSION_POOL];
  const result: Mission[] = [];
  while (result.length < count && pool.length > 0) {
    seed = ((seed * 1664525 + 1013904223) & 0xffffffff) >>> 0;
    const idx = seed % pool.length;
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
