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
