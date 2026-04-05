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
