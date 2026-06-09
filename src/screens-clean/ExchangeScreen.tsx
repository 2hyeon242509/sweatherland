import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ExchangeScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>환전소</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.center}>
        <Text style={s.emoji}>🔄</Text>
        <Text style={s.label}>환전소 준비 중</Text>
        <Text style={s.sub}>곧 오픈될 예정이에요!</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FEFAE6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 22, color: '#3D3224' },
  title: { fontSize: 18, fontWeight: '700', color: '#3D3224' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 64 },
  label: { fontSize: 20, fontWeight: '700', color: '#3D3224' },
  sub:   { fontSize: 14, color: '#888888' },
});
