export interface UserProfile {
  username:    string;   // 로그인 아이디 (= 앱 닉네임)
  pin:         string;   // 4자리 PIN
  emoji:       string;   // 프로필 이모지
  realName:    string;   // 본명
  studentId:   string;   // 학번
  phone:       string;   // 전화번호
  consentDate: string;   // 동의 일시 (ISO)
  createdAt:   string;   // 계정 생성 일시 (ISO)
}
