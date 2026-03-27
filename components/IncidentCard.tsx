import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Incident } from '@/types';
import { COLORS, CATEGORY_LABELS, CATEGORY_ICONS } from '@/constants';
import { StatusBadge, PriorityBadge } from './StatusBadge';

interface IncidentCardProps {
  incident: Incident;
  onPress: () => void;
  showAssignee?: boolean;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

export function IncidentCard({ incident, onPress, showAssignee = false }: IncidentCardProps) {
  const iconName = CATEGORY_ICONS[incident.category] as keyof typeof MaterialIcons.glyphMap;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <MaterialIcons name={iconName} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{incident.title}</Text>
          <Text style={styles.meta}>{CATEGORY_LABELS[incident.category]} · {timeAgo(incident.created_at)}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={COLORS.textMuted} />
      </View>

      <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>

      <View style={styles.footer}>
        <View style={styles.badges}>
          <StatusBadge status={incident.status} size="sm" />
          <PriorityBadge priority={incident.priority} size="sm" />
        </View>
        {incident.location && (
          <View style={styles.location}>
            <MaterialIcons name="place" size={12} color={COLORS.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{incident.location}</Text>
          </View>
        )}
      </View>

      {showAssignee && incident.assignee && (
        <View style={styles.assignee}>
          <MaterialIcons name="person" size={13} color={COLORS.textMuted} />
          <Text style={styles.assigneeText}>{incident.assignee.full_name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: 120,
  },
  locationText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  assignee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  assigneeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
