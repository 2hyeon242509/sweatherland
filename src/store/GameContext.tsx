import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodId, StatKey } from '../constants';

function generateUniqueId(): string {
  return '#' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

export interface FriendEntry {
  uniqueId:     string;
  nickname:     string;
  charId:       string;
  profileEmoji: string;
  statusMsg:    string;
  addedAt:      string;
}

const kstToday = () => {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
};

const ENERGY_RESET_DATE_KEY = '@energy_reset_date';
const DAILY_ENERGY_START    = 50;

interface Stats {
  vitality: number;
  calm:     number;
  connect:  number;
  creative: number;
  care:     number;
}

interface GameState {
  energy:             number;
  sweatPoints:        number;
  sparkleShards:      number;
  stats:              Stats;
  currentMood:        MoodId | null;
  streak:             number;
  completedMissions:  string[];
  characterName:      string;
  selectedFriendIds:  string[];
  energy100Dates:     string[];
  allMissionDates:    string[];
  uniqueId:           string;
  statusMsg:          string;
  profileEmoji:       string;
  friendList:         FriendEntry[];
  currentUsername:    string;
}

interface InitUserDataInput {
  username:           string;
  sweatPoints:        number;
  statusMsg:          string;
  friendCode:         string;
}

interface GameContextValue extends GameState {
  addEnergy:            (amount: number) => void;
  addSweat:             (amount: number) => void;
  setMood:              (mood: MoodId) => void;
  completeMission:      (missionId: string, points: number, stat: StatKey) => void;
  resetMissions:        () => void;
  setCharacterName:     (name: string) => void;
  exchangeSweatToEnergy: () => void;
  setSelectedFriends:    (ids: string[]) => void;
  recordEnergy100Today:  () => void;
  recordAllMissionsToday: () => void;
  setStatusMsg:          (msg: string) => void;
  setProfileEmoji:       (emoji: string) => void;
  addFriend:             (friend: FriendEntry) => void;
  removeFriend:          (uniqueId: string) => void;
  initUserData:          (data: InitUserDataInput) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

function calculateStreak(records: Array<{ record_date: string; all_missions_done: boolean }>): number {
  const doneDates = new Set(records.filter(r => r.all_missions_done).map(r => r.record_date));
  const todayKST  = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  let check = new Date(Date.now() + 9 * 3600 * 1000);
  if (!doneDates.has(todayKST)) check = new Date(check.getTime() - 24 * 3600 * 1000);
  let streak = 0;
  while (streak < 365) {
    if (!doneDates.has(check.toISOString().slice(0, 10))) break;
    streak++;
    check = new Date(check.getTime() - 24 * 3600 * 1000);
  }
  return streak;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const currentUsernameRef = useRef('');

  const [state, setState] = useState<GameState>({
    energy:            50,
    sweatPoints:       0,
    sparkleShards:     0,
    stats:             { vitality: 0, calm: 0, connect: 0, creative: 0, care: 0 },
    currentMood:       null,
    streak:            3,
    completedMissions: [],
    characterName:     '스웨더',
    selectedFriendIds: ['momo'],
    energy100Dates:    [],
    allMissionDates:   [],
    uniqueId:          '',
    statusMsg:         '',
    profileEmoji:      '🐱',
    friendList:        [],
    currentUsername:   '',
  });

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

  useEffect(() => {
    AsyncStorage.setItem('@sweat_points', String(state.sweatPoints)).catch(() => {});
  }, [state.sweatPoints]);

  /** 로그인 후 Supabase에서 불러온 유저 데이터로 초기화 */
  const initUserData = (data: InitUserDataInput) => {
    currentUsernameRef.current = data.username;
    setState(prev => ({
      ...prev,
      currentUsername: data.username,
      sweatPoints:     data.sweatPoints,
      statusMsg:       data.statusMsg || prev.statusMsg,
      uniqueId:        data.friendCode ? '#' + data.friendCode : prev.uniqueId,
    }));
    // 해당 유저의 오늘 완료 미션 복원 (새로고침 후 초기화 방지)
    AsyncStorage.getItem(`@completed_missions_${data.username}`)
      .then(raw => {
        if (raw) setState(prev => ({ ...prev, completedMissions: JSON.parse(raw) as string[] }));
      })
      .catch(() => {});
    // daily_records에서 실제 연속 완료일(streak) 계산
    import('../lib/supabase').then(({ fetchDailyRecords }) => {
      fetchDailyRecords(data.username)
        .then(records => {
          const streak = calculateStreak(records);
          setState(prev => ({ ...prev, streak }));
        })
        .catch(() => {});
    });
  };

  const saveSweatToSupabase = (points: number) => {
    const username = currentUsernameRef.current;
    if (!username) return;
    import('../lib/supabase').then(({ saveSweatPoints }) => {
      saveSweatPoints(username, points).catch(() => {});
    });
  };

  const addEnergy = (amount: number) => {
    setState(prev => ({ ...prev, energy: Math.min(100, prev.energy + amount) }));
  };

  const addSweat = (amount: number) => {
    setState(prev => {
      const next = prev.sweatPoints + amount;
      saveSweatToSupabase(next);
      return { ...prev, sweatPoints: next };
    });
  };

  const setMood = (mood: MoodId) => {
    setState(prev => ({ ...prev, currentMood: mood }));
  };

  const completeMission = (missionId: string, points: number, stat: StatKey) => {
    const username = currentUsernameRef.current;
    setState(prev => {
      if (prev.completedMissions.includes(missionId)) return prev;
      const newCompleted = [...prev.completedMissions, missionId];
      const nextSweat = prev.sweatPoints + points;
      saveSweatToSupabase(nextSweat);
      if (username) {
        AsyncStorage.setItem(`@completed_missions_${username}`, JSON.stringify(newCompleted)).catch(() => {});
      }
      return {
        ...prev,
        sweatPoints:       nextSweat,
        completedMissions: newCompleted,
        stats:             { ...prev.stats, [stat]: prev.stats[stat] + points },
      };
    });
  };

  const recordAllMissionsToday = () => {
    const today = kstToday();
    setState(prev => {
      if (prev.allMissionDates.includes(today)) return prev;
      const newDates = [...prev.allMissionDates, today];
      AsyncStorage.setItem('@all_mission_dates', JSON.stringify(newDates)).catch(() => {});
      const username = currentUsernameRef.current;
      if (username) {
        import('../lib/supabase').then(({ upsertDailyRecord }) => {
          upsertDailyRecord({
            username,
            record_date:        today,
            all_missions_done:  true,
            energy_100:         prev.energy100Dates.includes(today),
            missions_completed: 8,
          }).catch(() => {});
        });
      }
      return { ...prev, allMissionDates: newDates, streak: prev.streak + 1 };
    });
  };

  const resetMissions = () => {
    const username = currentUsernameRef.current;
    if (username) {
      AsyncStorage.removeItem(`@completed_missions_${username}`).catch(() => {});
    }
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
      const next = prev.sweatPoints - 100;
      saveSweatToSupabase(next);
      return { ...prev, sweatPoints: next, energy: Math.min(100, prev.energy + 10) };
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
      const username = currentUsernameRef.current;
      if (username) {
        import('../lib/supabase').then(({ upsertDailyRecord }) => {
          upsertDailyRecord({
            username,
            record_date:        today,
            all_missions_done:  prev.allMissionDates.includes(today),
            energy_100:         true,
            missions_completed: prev.completedMissions.length,
          }).catch(() => {});
        });
      }
      return { ...prev, energy100Dates: newDates };
    });
  };

  return (
    <GameContext.Provider
      value={{
        ...state,
        addEnergy, addSweat, setMood, completeMission, resetMissions,
        setCharacterName, exchangeSweatToEnergy, setSelectedFriends,
        recordEnergy100Today, recordAllMissionsToday, setStatusMsg, setProfileEmoji,
        addFriend, removeFriend, initUserData,
      }}
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
