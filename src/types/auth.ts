export interface UserProfile {
  username: string;   // 로그인 아이디 (= 닉네임)
  pin: string;        // 4자리 PIN
  emoji: string;      // 프로필 이모지
  createdAt: string;  // ISO 날짜
}
