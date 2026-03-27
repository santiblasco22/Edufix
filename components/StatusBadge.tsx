import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IncidentStatus, IncidentPriority } from '@/types';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants';

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
}

interface PriorityBadgeProps {
  priority: IncidentPriority;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg, borderColor: colors.border },
      isSmall && styles.badgeSm,
    ]}>
      <Text style={[styles.badgeText, { color: colors.text }, isSmall && styles.badgeTextSm]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  const colors = PRIORITY_COLORS[priority];
  const isSmall = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: colors.bg },
      isSmall && styles.badgeSm,
    ]}>
      <Text style={[styles.badgeText, { color: colors.text }, isSmall && styles.badgeTextSm]}>
        {PRIORITY_LABELS[priority]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeTextSm: {
    fontSize: 11,
  },
});
