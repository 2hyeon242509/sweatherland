import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodId, StatKey, MISSIONS } from '../constants';

// 고유 ID 생성 (#0000 형식)
function generateUniqueId(): string {
  return '#' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

export interface FriendEntry {
  uniqueId:     string;
  nickname:     string;
  charId:       string;
  profileEmoji: string;
  statusMsg:    string;
  addedAt:      string; // ISO string
}

// KST 기준 오늘 날짜 문자열 (YYYY-MM-DD)
const kstToday = () => {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
};

const ENERGY_RESET_DATE_KEY = '@energy_reset_date';
const DAILY_ENERGY_START    = 50;

interface Stats {
  vitality: number;
  calm: number;
  connect: number;
  creative: number;
  care: number;
}

interface GameState {
  energy: number;
  sweatPoints: number;
  sparkleShards: number;
  stats: Stats;
  currentMood: MoodId | null;
  streak: number;
  completedMissions: string[];
  characterName: string;
  selectedFriendIds: string[];
  energy100Dates: string[];    // KST 날짜 목록 (에너지 100 달성일)
  allMissionDates: string[];  // KST 날짜 목록 (미션 9개 모두 완료일)
  uniqueId:     string;        // 고유 친구코드 (#0000)
  statusMsg:    string;        // 상태메시지
  profileEmoji: string;        // 프로필 이모지
  friendList:   FriendEntry[]; // 내 친구 목록
}

interface GameContextValue extends GameState {
  addEnergy: (amount: number) => void;
  addSweat: (amount: number) => void;
  setMood: (mood: MoodId) => void;
  completeMission: (missionId: string, points: number, stat: StatKey) => void;
  resetMissions: () => void;
  setCharacterName: (name: string) => void;
  exchangeSweatToEnergy: () => void;
  setSelectedFriends: (ids: string[]) => void;
  recordEnergy100Today: () => void;
  setStatusMsg:    (msg: string) => void;
  setProfileEmoji: (emoji: string) => void;
  addFriend:       (friend: FriendEntry) => void;
  removeFriend:    (uniqueId: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>({
    energy: 50,
    sweatPoints: 0,
    sparkleShards: 0,
    stats: { vitality: 0, calm: 0, connect: 0, creative: 0, care: 0 },
    currentMood: null,
    streak: 3,
    completedMissions: [],
    characterName: '스웨더',
    selectedFriendIds: ['momo'],
    energy100Dates: [],
    allMissionDates: [],
    uniqueId:     '',
    statusMsg:    '',
    profileEmoji: '🐱',
    friendList:   [],
  });

  // 앱 시작 시 저장된 데이터 불러오기 + 에너지 일일 초기화
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@selected_friend_ids'),
      AsyncStorage.getItem('@sweat_points'),
      AsyncStorage.getItem('@character_name'),
      AsyncStorage.getItem(ENERGY_RESET_DATE_KEY),
      AsyncStorage.getItem('@energy_100_dates'),
      AsyncStorage.getItem('@all_mission_dates'),
      AsyncStorage.getItem('@user_unique_id'),
      AsyncStorage.getItem('@user_status_msg'),
      AsyncStorage.getItem('@user_profile_emoji'),
      AsyncStorage.getItem('@friend_list'),
    ]).then(([friendsVal, sweatVal, nameVal, energyDateVal, e100Val,
              missionDatesVal, uniqueIdVal, statusMsgVal, profileEmojiVal, friendListVal]) => {
      const today = kstToday();
      const isNewDay = energyDateVal !== today;

      // 고유 ID가 없으면 새로 생성
      let resolvedUniqueId = uniqueIdVal;
      if (!resolvedUniqueId) {
        resolvedUniqueId = generateUniqueId();
        AsyncStorage.setItem('@user_unique_id', resolvedUniqueId).catch(() => {});
      }

      setState(prev => ({
        ...prev,
        ...(friendsVal      ? { selectedFriendIds: JSON.parse(friendsVal) as string[] } : {}),
        ...(sweatVal        ? { sweatPoints: parseInt(sweatVal, 10) } : {}),
        ...(nameVal         ? { characterName: nameVal } : {}),
        ...(e100Val         ? { energy100Dates:  JSON.parse(e100Val)  as string[] } : {}),
        ...(missionDatesVal ? { allMissionDates: JSON.parse(missionDatesVal) as string[] } : {}),
        ...(isNewDay        ? { energy: DAILY_ENERGY_START } : {}),
        uniqueId:     resolvedUniqueId,
        ...(statusMsgVal    ? { statusMsg:    statusMsgVal } : {}),
        ...(profileEmojiVal ? { profileEmoji: profileEmojiVal } : {}),
        ...(friendListVal   ? { friendList:   JSON.parse(friendListVal) as FriendEntry[] } : {}),
      }));

      if (isNewDay) {
        AsyncStorage.setItem(ENERGY_RESET_DATE_KEY, today).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // 땀방울 변경 시 즉시 저장
  useEffect(() => {
    AsyncStorage.setItem('@sweat_points', String(state.sweatPoints)).catch(() => {});
  }, [state.sweatPoints]);

  const addEnergy = (amount: number) => {
    setState(prev => ({
      ...prev,
      energy: Math.min(100, prev.energy + amount),
    }));
  };

  const addSweat = (amount: number) => {
    setState(prev => ({ ...prev, sweatPoints: prev.sweatPoints + amount }));
  };

  const setMood = (mood: MoodId) => {
    setState(prev => ({ ...prev, currentMood: mood }));
  };

  const completeMission = (missionId: string, points: number, stat: StatKey) => {
    setState(prev => {
      if (prev.completedMissions.includes(missionId)) return prev;
      const newCompleted = [...prev.completedMissions, missionId];

      // 오늘 9개 미션 모두 완료됐는지 확인
      const allDone = MISSIONS.every(m => newCompleted.includes(m.id));
      const today   = kstToday();
      const alreadyRecorded = prev.allMissionDates.includes(today);
      const newAllMissionDates = allDone && !alreadyRecorded
        ? [...prev.allMissionDates, today]
        : prev.allMissionDates;

      if (allDone && !alreadyRecorded) {
        AsyncStorage.setItem('@all_mission_dates', JSON.stringify(newAllMissionDates)).catch(() => {});
      }

      return {
        ...prev,
        sweatPoints: prev.sweatPoints + points,
        completedMissions: newCompleted,
        stats: { ...prev.stats, [stat]: prev.stats[stat] + points },
        allMissionDates: newAllMissionDates,
      };
    });
  };

  const resetMissions = () => {
    setState(prev => ({ ...prev, completedMissions: [] }));
  };

  const setCharacterName = (name: string) => {
    setState(prev => ({ ...prev, characterName: name }));
    AsyncStorage.setItem('@character_name', name).catch(() => {});
  };

  const setSelectedFriends = (ids: string[]) => {
    setState(prev => ({ ...prev, selectedFriendIds: ids }));
    AsyncStorage.setItem('@selected_friend_ids', JSON.stringify(ids)).catch(() => {});
  };

  const exchangeSweatToEnergy = () => {
    setState(prev => {
      if (prev.sweatPoints < 100) return prev;
      return {
        ...prev,
        sweatPoints: prev.sweatPoints - 100,
        energy: Math.min(100, prev.energy + 10),
      };
    });
  };

  const setStatusMsg = (msg: string) => {
    setState(prev => ({ ...prev, statusMsg: msg }));
    AsyncStorage.setItem('@user_status_msg', msg).catch(() => {});
  };

  const setProfileEmoji = (emoji: string) => {
    setState(prev => ({ ...prev, profileEmoji: emoji }));
    AsyncStorage.setItem('@user_profile_emoji', emoji).catch(() => {});
  };

  const addFriend = (friend: FriendEntry) => {
    setState(prev => {
      if (prev.friendList.some(f => f.uniqueId === friend.uniqueId)) return prev;
      const newList = [...prev.friendList, friend];
      AsyncStorage.setItem('@friend_list', JSON.stringify(newList)).catch(() => {});
      return { ...prev, friendList: newList };
    });
  };

  const removeFriend = (uniqueId: string) => {
    setState(prev => {
      const newList = prev.friendList.filter(f => f.uniqueId !== uniqueId);
      AsyncStorage.setItem('@friend_list', JSON.stringify(newList)).catch(() => {});
      return { ...prev, friendList: newList };
    });
  };

  const recordEnergy100Today = () => {
    const today = kstToday();
    setState(prev => {
      if (prev.energy100Dates.includes(today)) return prev;
      const newDates = [...prev.energy100Dates, today];
      AsyncStorage.setItem('@energy_100_dates', JSON.stringify(newDates)).catch(() => {});
      return { ...prev, energy100Dates: newDates };
    });
  };

  return (
    <GameContext.Provider
      value={{ ...state, addEnergy, addSweat, setMood, completeMission, resetMissions, setCharacterName, exchangeSweatToEnergy, setSelectedFriends, recordEnergy100Today, setStatusMsg, setProfileEmoji, addFriend, removeFriend }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
