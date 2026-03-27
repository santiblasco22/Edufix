export const COLORS = {
  primary: '#1E3A5F',
  primaryLight: '#2D5A8E',
  primaryDark: '#122440',
  accent: '#3B82F6',
  accentLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  critical: '#7C3AED',
  criticalLight: '#F5F3FF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  resolved: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  cancelled: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  cancelled: 'Cancelado',
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#D1FAE5', text: '#065F46' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  high: { bg: '#FEE2E2', text: '#991B1B' },
  critical: { bg: '#EDE9FE', text: '#5B21B6' },
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: 'Infraestructura',
  equipment: 'Equipamiento',
  cleaning: 'Limpieza',
  electrical: 'Eléctrico',
  plumbing: 'Plomería',
  security: 'Seguridad',
  other: 'Otro',
};

export const CATEGORY_ICONS: Record<string, string> = {
  infrastructure: 'business',
  equipment: 'computer',
  cleaning: 'cleaning-services',
  electrical: 'electrical-services',
  plumbing: 'plumbing',
  security: 'security',
  other: 'help-outline',
};
