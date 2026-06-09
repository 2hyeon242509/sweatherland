import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

export default function ExchangeScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>환전소</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.center}>
        <Text style={styles.emoji}>🔄</Text>
        <Text style={styles.label}>환전소 준비 중</Text>
        <Text style={styles.sub}>곧 오픈될 예정이에요!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emoji: { fontSize: 64 },
  label: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 14, color: '#888' },
});
