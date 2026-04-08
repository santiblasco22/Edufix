-- =============================================
-- EduFix - Políticas RLS adicionales
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- Asegurarse que existe la institución por defecto
INSERT INTO institutions (id, name, address)
VALUES ('00000000-0000-0000-0000-000000000001', 'Universidad UADE', 'Lima 717, Buenos Aires, Argentina')
ON CONFLICT (id) DO NOTHING;

-- Corregir perfiles con institution_id nulo
UPDATE profiles
SET institution_id = '00000000-0000-0000-0000-000000000001'
WHERE institution_id IS NULL;

-- =============================================
-- FIX: Política SELECT de incidents
-- La política original falla cuando institution_id del perfil es NULL
-- (NULL = cualquier_valor siempre es FALSE en SQL → reportes invisibles).
-- La nueva política permite ver SIEMPRE los propios reportes.
-- =============================================
DROP POLICY IF EXISTS "Users can view incidents in their institution" ON incidents;
CREATE POLICY "Users can view incidents in their institution"
  ON incidents FOR SELECT TO authenticated
  USING (
    reported_by = auth.uid()
    OR institution_id = (
      SELECT institution_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- FIX: Trigger handle_new_user — asignar institution_id por defecto al crear cuenta
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role, institution_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    '00000000-0000-0000-0000-000000000001'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que admins eliminen perfiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Permitir que admins eliminen incidentes
CREATE POLICY "Admins can delete incidents"
  ON incidents FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Permitir que usuarios eliminen sus propios reportes si están pendientes
CREATE POLICY "Users can delete own pending incidents"
  ON incidents FOR DELETE TO authenticated
  USING (reported_by = auth.uid() AND status = 'pending');

-- =============================================
-- Notificaciones automáticas
-- =============================================

-- 1. Notificar al alumno cuando su incidente cambia a in_progress o resolved
CREATE OR REPLACE FUNCTION notify_reporter_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NEW.status = 'in_progress' AND NEW.reported_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, incident_id, message)
    VALUES (NEW.reported_by, NEW.id, 'Tu reporte "' || NEW.title || '" está siendo atendido por el personal.');
  END IF;

  IF NEW.status = 'resolved' AND NEW.reported_by IS NOT NULL THEN
    INSERT INTO notifications (user_id, incident_id, message)
    VALUES (NEW.reported_by, NEW.id, 'Tu reporte "' || NEW.title || '" fue resuelto exitosamente.');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_incident_status_change ON incidents;
CREATE TRIGGER on_incident_status_change
  AFTER UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION notify_reporter_on_status_change();

-- 2. Notificar a todo el personal cuando se crea un nuevo incidente
CREATE OR REPLACE FUNCTION notify_staff_on_new_incident()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, incident_id, message)
  SELECT p.user_id, NEW.id,
    'Nuevo incidente reportado: "' || NEW.title || '"'
  FROM profiles p
  WHERE p.institution_id = NEW.institution_id
    AND p.role = 'staff';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_incident ON incidents;
CREATE TRIGGER on_new_incident
  AFTER INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION notify_staff_on_new_incident();
