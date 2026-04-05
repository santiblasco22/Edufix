import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants';

// Pantalla inicial neutral mientras el routing de _layout.tsx determina
// a dónde redirigir según el rol del usuario.
export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
