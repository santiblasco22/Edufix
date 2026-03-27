# EduFix 📋

Aplicación móvil para la gestión de incidentes físicos en instituciones educativas, desarrollada en **React Native + Expo**.

## Stack tecnológico

- **React Native** + **Expo SDK 55** (Expo Router v3)
- **Supabase** — Auth, PostgreSQL, Storage, Realtime
- **TypeScript** estricto
- **@expo/vector-icons** (MaterialIcons)

---

## Configuración del proyecto

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd EduFix
npm install
```

### 2. Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. Ejecutá el schema en **SQL Editor** (`supabase-schema.sql`)
3. Creá un bucket de Storage llamado `incident-photos` (público)
4. Copiá las claves del proyecto

### 3. Variables de entorno

```bash
cp .env.example .env
```

Editá `.env` con tus credenciales de Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

### 4. Correr la app

```bash
npx expo start
```

---

## Roles y permisos

| Rol | Descripción | Capacidades |
|-----|-------------|-------------|
| `admin` | Administrador de la institución | Ver todos los incidentes, cancelar incidentes, gestionar usuarios y roles |
| `staff` | Personal de gestión/soporte | Tomar incidentes pendientes, marcar como resuelto, agregar notas |
| `user` | Alumno o docente | Reportar incidentes (foto + prioridad + categoría), hacer seguimiento |

---

## Estados de un incidente

```
Pendiente → En progreso → Resuelto
                        ↘ Cancelado (solo admin)
```

---

## Estructura del proyecto

```
app/
├── _layout.tsx              # Root layout con redirección por rol
├── (auth)/
│   ├── login.tsx            # Pantalla de inicio de sesión
│   └── register.tsx         # Registro con selección de rol
├── (admin)/
│   ├── index.tsx            # Dashboard con estadísticas
│   ├── incidents.tsx        # Lista + filtros de todos los incidentes
│   ├── users.tsx            # Gestión de usuarios y roles
│   └── incident/[id].tsx    # Detalle + cancelar incidente
├── (staff)/
│   ├── index.tsx            # Mis incidentes activos + alerta de pendientes
│   ├── incidents.tsx        # Lista de incidentes por estado
│   └── incident/[id].tsx    # Detalle + tomar + resolver incidente
└── (user)/
    ├── index.tsx            # Mis reportes con estadísticas
    ├── report.tsx           # Formulario de reporte (foto, prioridad, categoría)
    └── incident/[id].tsx    # Detalle con timeline de estado

components/
├── IncidentCard.tsx         # Tarjeta reutilizable de incidente
├── StatusBadge.tsx          # Badge de estado y prioridad
├── StatsCard.tsx            # Tarjeta de estadísticas
└── EmptyState.tsx           # Estado vacío

lib/
└── supabase.ts              # Cliente Supabase con SecureStore

hooks/
└── useAuth.ts               # Hook de autenticación y perfil

types/
└── index.ts                 # Tipos TypeScript de toda la app

constants/
└── index.ts                 # Colores, labels, configuraciones
```

---

## Base de datos (Supabase)

### Tablas principales

- **`institutions`** — Instituciones educativas
- **`profiles`** — Perfiles de usuario con rol y institución
- **`incidents`** — Incidentes con estado, prioridad, foto, asignación
- **`notifications`** — Notificaciones por usuario

### RLS activado en todas las tablas

- Los usuarios solo ven incidentes de su institución
- Solo staff/admin pueden actualizar incidentes
- El admin puede cambiar roles de usuarios
