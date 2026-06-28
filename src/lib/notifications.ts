import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  category: '응원' | '정신건강' | '활동';
  emoji: string;
  title: string;
  body: string;
  scheduledTime: string; // "오전 9:00" | "오후 1:00" | "오후 7:00"
}

interface MessageEntry {
  emoji: string;
  title: string;
  body: string;
}

const ENCOURAGEMENT: MessageEntry[] = [
  { emoji: '🌟', title: '오늘도 나를 챙겨줘서 고마워', body: '하루를 시작하는 것만으로도 대단해요. 오늘도 응원해요! 🌟' },
  { emoji: '💙', title: '작은 것도 괜찮아', body: '오늘 작은 것 하나만 해도 충분해요. 당신은 잘 하고 있어요 💙' },
  { emoji: '🌿', title: '잠깐 멈춰도 괜찮아', body: '쉬어가는 것도 앞으로 나아가는 방법이에요 🌿' },
  { emoji: '💭', title: '오늘 기분은 어때?', body: '지금 내 감정을 한번 들여다봐요. 감정을 알아채는 것도 용기예요 💭' },
  { emoji: '🤍', title: '무사히 여기까지 왔어', body: '오늘 하루도 버텨준 나에게 고맙다고 말해줘요 🤍' },
  { emoji: '✨', title: '완벽하지 않아도 돼', body: '완벽하지 않아도 괜찮아요. 그냥 오늘의 나로 충분해요 ✨' },
  { emoji: '🫂', title: '넌 혼자가 아니야', body: '힘들 때는 주변에 도움을 요청해도 괜찮아요 🫂' },
  { emoji: '🔍', title: '오늘 뭐가 좋았어?', body: '오늘 딱 한 가지, 좋았던 순간을 찾아봐요 🔍' },
  { emoji: '🐢', title: '천천히 가도 괜찮아', body: '남들과 비교하지 말고, 나만의 속도로 가요 🐢' },
  { emoji: '🌸', title: '네가 있어서 다행이야', body: '오늘도 세상에 존재해줘서 고마워요 🌸' },
  { emoji: '🏅', title: '오늘의 나에게', body: '어제보다 조금 더 나아진 오늘의 나를 칭찬해요 🏅' },
  { emoji: '😴', title: '잘 자고 일어났어?', body: '충분한 휴식이 최고의 자기관리예요 😴' },
  { emoji: '🍚', title: '밥은 먹었어?', body: '오늘 한 끼라도 따뜻하게 먹었으면 해요 🍚' },
  { emoji: '💪', title: '오늘의 한마디', body: '어떤 날이든 그 날을 살아낸 당신은 강한 사람이에요 💪' },
  { emoji: '🌻', title: '나를 사랑하는 연습', body: '나에게 친절한 한마디를 건네보는 건 어떨까요? 🌻' },
  { emoji: '🌈', title: '괜찮아, 괜찮아', body: '잘 안 되는 날도 있어요. 그래도 내일은 달라질 수 있어요 🌈' },
  { emoji: '🎯', title: '오늘의 도전', body: '오늘 하루 딱 한 가지 두려운 것을 해봐요. 작은 것도 OK! 🎯' },
  { emoji: '🙏', title: '감사한 것 찾기', body: '오늘 감사한 것 세 가지를 떠올려봐요. 기분이 달라져요 🙏' },
  { emoji: '🎵', title: '나만의 페이스', body: '서두르지 않아도 돼요. 나만의 리듬으로 가요 🎵' },
  { emoji: '🔥', title: '오늘도 파이팅', body: '오늘 하루도 최선을 다한 당신을 응원해요! 🔥' },
];

const MENTAL_HEALTH: MessageEntry[] = [
  { emoji: '🌬️', title: '3분 호흡', body: '지금 3분만 눈을 감고 천천히 호흡해봐요. 들숨 4초, 날숨 6초 🌬️' },
  { emoji: '💚', title: '감정은 자연스러워', body: '슬프거나 불안한 감정은 나쁜 게 아니에요. 자연스러운 반응이에요 💚' },
  { emoji: '🤸', title: '오늘의 스트레칭', body: '지금 어깨를 한번 돌려봐요. 몸이 풀리면 마음도 풀려요 🤸' },
  { emoji: '👀', title: '스마트폰 잠깐 내려놓기', body: '5분만 화면에서 눈을 떼고 주변을 둘러봐요 👀' },
  { emoji: '💧', title: '물 한 잔의 마법', body: '지금 물 한 잔 마셔봐요. 작은 돌봄이 큰 차이를 만들어요 💧' },
  { emoji: '📝', title: '감사 일기', body: '오늘 감사한 것을 하나만 기록해봐요. 긍정적인 뇌를 만들어요 📝' },
  { emoji: '🔎', title: '나쁜 생각 패턴 알아채기', body: '나는 별로야 같은 생각이 들면 정말 그럴까? 라고 물어봐요 🔎' },
  { emoji: '🫶', title: '자기 자신에게 친절하게', body: '친구에게 하듯 나 자신에게도 따뜻하게 대해봐요 🫶' },
  { emoji: '😊', title: '마음의 날씨', body: '지금 내 마음의 날씨는 어떤가요? 맑음, 흐림, 비? 😊' },
  { emoji: '🌳', title: '잠깐 산책', body: '5분만 바깥 공기를 마셔봐요. 자연은 최고의 치유제예요 🌳' },
  { emoji: '📵', title: '디지털 디톡스', body: '오늘 저녁 한 시간만 SNS를 쉬어봐요. 마음이 가벼워져요 📵' },
  { emoji: '✅', title: '완벽주의 내려놓기', body: '완벽하지 않아도 충분히 가치 있어요. 60점도 ok! ✅' },
  { emoji: '🤝', title: '도움 요청하기', body: '힘들 때 도움을 청하는 건 약함이 아니라 지혜예요 🤝' },
  { emoji: '🌙', title: '잠의 중요성', body: '오늘 일찍 자봐요. 수면은 정신건강의 기초예요 🌙' },
  { emoji: '🏡', title: '나만의 안전지대', body: '나를 편안하게 해주는 공간이나 활동을 매일 조금씩 챙겨요 🏡' },
  { emoji: '📰', title: '부정적 뉴스 줄이기', body: '오늘은 걱정되는 뉴스 대신 좋은 이야기를 찾아봐요 📰' },
  { emoji: '⏱️', title: '마음챙김 1분', body: '지금 이 순간에 집중해봐요. 과거도 미래도 아닌 지금! ⏱️' },
  { emoji: '🧘', title: '몸과 마음의 연결', body: '지금 몸 어딘가 긴장된 곳이 있나요? 의식적으로 풀어봐요 🧘' },
  { emoji: '🛡️', title: '경계 설정하기', body: '싫은 것에 싫다고 말하는 연습. 나를 지키는 첫걸음이에요 🛡️' },
  { emoji: '🌟', title: '자기 칭찬 시간', body: '오늘 잘 한 것 한 가지를 스스로 칭찬해봐요 🌟' },
];

const ACTIVITY: MessageEntry[] = [
  { emoji: '👟', title: '오늘 걸음 수는?', body: '만 걸음이 목표! 스크린샷 찍어서 마일리지로 환전해요 👟' },
  { emoji: '📔', title: '오늘 감정 기록했어?', body: '달력에 오늘 감정을 기록하면 내 마음 패턴을 알 수 있어요 📔' },
  { emoji: '✅', title: '미션 확인!', body: '오늘의 미션을 완료했나요? 작은 실천이 큰 변화를 만들어요 ✅' },
  { emoji: '🤸', title: '스트레칭 타임', body: '자기 전 5분 스트레칭으로 하루의 피로를 풀어봐요 🤸' },
  { emoji: '📋', title: '내일을 위한 준비', body: '내일 할 일 하나만 미리 정해봐요. 아침이 가벼워져요 📋' },
  { emoji: '💧', title: '오늘 수분 섭취는?', body: '하루 물 8잔! 건강한 몸이 건강한 마음을 만들어요 💧' },
  { emoji: '📚', title: '독서 30분', body: '오늘 30분만 책을 읽어봐요. 스마트폰 대신 책 한 페이지 📚' },
  { emoji: '💌', title: '친구에게 연락하기', body: '오랫동안 연락 못한 친구에게 안부를 물어봐요 💌' },
  { emoji: '✍️', title: '내일의 나에게', body: '오늘 하루 어땠는지 일기로 남겨봐요. 나중에 보면 큰 위안이 돼요 ✍️' },
  { emoji: '🌙', title: '취침 루틴', body: '오늘은 일찍 자봐요. 규칙적인 수면이 기분을 좋게 해요 🌙' },
  { emoji: '👟', title: '오늘의 마일리지', body: '마일리지를 모아서 마음에너지로 환전해봤어요? 👟➡️💙' },
  { emoji: '🎨', title: '좋아하는 것 하기', body: '오늘 내가 좋아하는 것을 딱 10분만 해봐요 🎨' },
  { emoji: '🌅', title: '하루 돌아보기', body: '오늘 가장 기억에 남는 순간은 무엇이었나요? 🌅' },
  { emoji: '🛁', title: '내 몸 돌보기', body: '오늘 몸이 보내는 신호에 귀 기울여봤나요? 피곤하면 쉬어요 🛁' },
  { emoji: '🙏', title: '감사 인사', body: '오늘 도움 받은 사람에게 감사 인사를 전해봐요 🙏' },
  { emoji: '⏰', title: '소셜 미디어 시간 체크', body: '오늘 SNS에 얼마나 시간을 썼나요? 의식적으로 줄여봐요 ⏰' },
  { emoji: '🌤️', title: '자연과 함께', body: '오늘 하늘을 올려다봤나요? 잠깐 멈추고 자연을 느껴봐요 🌤️' },
  { emoji: '🎵', title: '음악 치료', body: '지금 기분에 맞는 음악을 틀어봐요. 음악은 마음을 치유해요 🎵' },
  { emoji: '✨', title: '오늘의 성취', body: '오늘 이룬 것을 하나라도 적어봐요. 아무리 작아도 괜찮아요 ✨' },
  { emoji: '🌟', title: '내일을 기대하며', body: '내일 기대되는 것 하나를 떠올리며 하루를 마무리해봐요 🌟' },
];

const NOTIFICATIONS_READ_KEY = '@notifications_read';

function getTodayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function getTodayNotifications(): AppNotification[] {
  const today = getTodayKST();
  const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
  return [
    {
      id: `${today}-0`,
      category: '응원',
      emoji: ENCOURAGEMENT[seed % 20].emoji,
      title: ENCOURAGEMENT[seed % 20].title,
      body: ENCOURAGEMENT[seed % 20].body,
      scheduledTime: '오전 9:00',
    },
    {
      id: `${today}-1`,
      category: '정신건강',
      emoji: MENTAL_HEALTH[(seed + 7) % 20].emoji,
      title: MENTAL_HEALTH[(seed + 7) % 20].title,
      body: MENTAL_HEALTH[(seed + 7) % 20].body,
      scheduledTime: '오후 1:00',
    },
    {
      id: `${today}-2`,
      category: '활동',
      emoji: ACTIVITY[(seed + 13) % 20].emoji,
      title: ACTIVITY[(seed + 13) % 20].title,
      body: ACTIVITY[(seed + 13) % 20].body,
      scheduledTime: '오후 7:00',
    },
  ];
}

export async function getUnreadCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_READ_KEY);
    const readIds: string[] = raw ? JSON.parse(raw) : [];
    const todayNotifs = getTodayNotifications();
    return todayNotifs.filter(n => !readIds.includes(n.id)).length;
  } catch {
    return 0;
  }
}

export async function markAllRead(ids: string[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_READ_KEY);
    const readIds: string[] = raw ? JSON.parse(raw) : [];
    const merged = Array.from(new Set([...readIds, ...ids]));
    await AsyncStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(merged));
  } catch {}
}
