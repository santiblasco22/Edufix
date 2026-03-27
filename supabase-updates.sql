-- =============================================
-- EduFix - Políticas RLS adicionales
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

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
