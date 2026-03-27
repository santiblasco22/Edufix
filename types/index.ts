export type UserRole = 'admin' | 'staff' | 'user';

export type IncidentStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export type IncidentCategory =
  | 'infrastructure'
  | 'equipment'
  | 'cleaning'
  | 'electrical'
  | 'plumbing'
  | 'security'
  | 'other';

export interface Institution {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  institution_id: string;
  institution?: Institution;
  avatar_url?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  location: string;
  photo_url?: string;
  reported_by: string;
  reporter?: Profile;
  assigned_to?: string;
  assignee?: Profile;
  institution_id: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  incident_id: string;
  incident?: Incident;
  message: string;
  read: boolean;
  created_at: string;
}
