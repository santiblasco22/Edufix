import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants';

interface StatsCardProps {
  label: string;
  value: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bgColor: string;
}

export function StatsCard({ label, value, icon, color, bgColor }: StatsCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
