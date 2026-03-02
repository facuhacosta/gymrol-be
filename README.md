# GymRol Backend - Documentación Técnica y Guía de Integración

Este documento proporciona una referencia completa para el backend de **GymRol**, una plataforma que gamifica el ejercicio físico convirtiéndolo en progresión de estilo RPG. El backend está construido sobre la infraestructura de **Cloudflare Workers** y **Cloudflare D1**.

---

## 🏗 Arquitectura del Sistema

El backend sigue una arquitectura serverless desacoplada, diseñada para baja latencia y escalabilidad global:

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) (V8 isolate).
- **Base de Datos**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite distribuido).
- **Framework**: [Hono](https://hono.dev/) (Lightweight, multi-runtime).
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) (Type-safe, diseñado para edge).
- **Validación**: [Zod](https://zod.dev/) (Esquemas estrictos).
- **Autenticación**: JWT (HS256) via [Jose](https://github.com/panva/jose).
- **Email**: [Resend API](https://resend.com/).

### Estructura del Proyecto

```text
src/
├── db/              # Esquema de D1 y configuración de Drizzle
├── middleware/      # Auth, Rate Limiting y validación personalizada
├── routes/          # Controladores de la API (Auth, User, Mission, Exercise)
├── utils/           # Helpers de hashing, JWT y utilidades generales
├── types.ts         # Definiciones globales de Bindings y Variables
└── index.ts         # Punto de entrada y orquestación de middleware
```

---

## 🚀 Guía de Instalación y Configuración

### Requisitos Previos

1.  **Node.js** (v18 o superior).
2.  **Cloudflare Wrangler CLI**: `npm install -g wrangler`.
3.  **Cuenta en Cloudflare** (para deployment).

### Configuración Local

1.  **Clonar e instalar**:
    ```bash
    npm install
    ```

2.  **Configuración de D1 Local**:
    Asegúrate de que `wrangler.toml` tenga el binding `DB` configurado. Luego ejecuta:
    ```bash
    npm run db:migrate
    ```

    ```mermaid
    erDiagram
    direction LR
    USERS }|--o{ USER_ITEMS : has
    USER_ITEMS }|--o{ ITEMS : has
    USERS ||--|| WEIGHT_LOSS : traks
    USERS ||--|{ USER_MISSIONS : completes
    USER_MISSIONS }|--|{ MISSIONS : are
    MISSIONS }|--|{ MISSION_EXERCISES : have
    MISSION_EXERCISES }|--|{ EXERCISES : are
    MISSIONS }o--o{ ITEMS : "can have"
    USERS {
        string id PK
        string email
        string username
        hash password
        string google_id "Cuando inicia session con goolge"
        number level
        number xp
        number strength "STR"
        number dexterity "DEX"
        number vitality "VIT"
        number stamina "STA"
        number intel "INT"
        number height
        number weight
        boolean is_premium
        string created_at
        string updated_at
    }
    WEIGHT_LOSS {
        number id
        string user_id FK
        number weight
        date logged_at
    }
    ITEMS {
        string id PK
        string name
        string description
        string category
        string rarity
        string scaling_stat
        number base_multiplier
        number stat_weight
    }
    USER_ITEMS {
        string user_id PK, FK
        string item_id PK, FK
        boolean equiped
    }
    USER_MISSIONS {
        string mission_id PK, FK
        string user_id PK, FK
    }
    MISSIONS {
        number id PK
        string title
        string description
        string type "short / daily / weekly / monthly"
        string focus "strength, dexterity, vitality, stamina, balanced"
        number progress "fraction of the total exercises compleated times 100"
        string created_at "usualy when the user logs in for the first time in the day"
        string expiration_date "used to calculate when the streak is lost"
        number xp_reward "can be null"
        string item_reward "from items table but not a foreign key, also can be null"
    }
    MISSION_EXERCISES {
        string mission_id PK, FK
        string exercise_id PK, FK
        number repetitions
        number series
    }
    EXERCISES {
        string id
        string type "basic / voley / gym"
        string category
        string description
        string intensity
        string example "Url to gif media"
    }
    ```

3.  **Variables de Entorno**:
    Crea un archivo `.dev.vars` para desarrollo local:
    ```env
    JWT_SECRET="tu_secreto_para_desarrollo"
    GOOGLE_CLIENT_ID="tu_google_id"
    RESEND_API_KEY="re_123..."
    RESEND_EMAIL_FROM="no-reply@tudominio.com"
    ```

4.  **Ejecutar Servidor**:
    ```bash
    npm run dev
    ```
    El servidor estará disponible en `http://localhost:8787`.

---

## 🔐 Autenticación y Autorización

La mayoría de los endpoints requieren un **JSON Web Token (JWT)**.

- **Header**: `Authorization: Bearer <TU_TOKEN>`
- **Expiración**: 7 días (configurable en `utils/auth.ts`).

---

## 📡 API Reference

### 1. Sistema de Autenticación (`/auth`)

#### **POST `/auth/authenticate`**
Endpoint unificado para Login y Registro. Si el email no existe, crea una cuenta nueva; si existe, verifica la contraseña e inicia sesión.
- **Request Body**:
  ```json
  { "email": "user@example.com", "password": "securepassword123" }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "token": "JWT_TOKEN",
      "userId": "uuid",
      "isNewUser": true
    }
  }
  ```

#### **POST `/auth/google-login`**
Autenticación vía Google Play Games.
- **Request Body**: `{ "idToken": "..." }`.
- **Nota**: Crea un usuario automáticamente si no existe.

#### **POST `/auth/recover-password`**
Genera y envía un código de 6 dígitos.
- **Request Body**: `{ "email": "user@example.com" }`.

#### **PATCH `/auth/update-password`**
Actualiza la contraseña después de validar el código.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "newPassword": "newpassword123"
  }
  ```

---

### 2. Gestión de Usuarios (`/user`)
*Requiere Auth Token*

#### **GET `/user/me`**
Obtiene el perfil completo.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "email": "...",
      "level": 5,
      "xp": 4500,
      "equipment": ["sword_v1", "shield_v1"],
      "isPremium": false
    }
  }
  ```

#### **PATCH `/user/me`**
Actualiza estadísticas o equipamiento.
- **Request Body**: `{ "equipment": ["item1"], "xp": 5000 }`.

---

### 3. Sistema de Misiones (`/missions`)
*Requiere Auth Token*

#### **GET `/missions`**
Lista misiones disponibles.
- **Query Params**: `type` (opcional: `daily`, `weekly`, `monthly`).
- **Lógica**: Filtra misiones `premium` si el usuario no tiene suscripción.

#### **PATCH `/missions/:id/complete`**
Marca una misión como completada.
- **Efectos**: Otorga la recompensa de XP y recalcula el nivel automáticamente.

#### **POST `/missions/custom` (Premium Only)**
Crea una misión personalizada.
- **Request Body**:
  ```json
  {
    "title": "Entrenamiento de Core",
    "type": "daily",
    "exercises": ["ex-1", "ex-4"],
    "durationMinutes": 15,
    "xpReward": 150
  }
  ```

---

## 🛠 Ejemplos de Consumo

### JavaScript (Fetch)
```javascript
const response = await fetch('https://gymrol-be.workers.dev/user/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const result = await response.json();
```

### cURL
```bash
curl -X GET https://gymrol-be.workers.dev/missions?type=daily \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🛡 Seguridad y Límites

1.  **Rate Limiting**:
    - Límite actual: **100 peticiones por minuto por IP**.
    - Retorna `429 Too Many Requests` al excederlo.
2.  **Hashing**: Contraseñas procesadas con `bcryptjs` (salt rounds: 10).
3.  **CORS**: Configurado para permitir integración con aplicaciones móviles y web.
4.  **Error Handling**:
    - Todos los errores retornan un objeto estructurado: `{ "success": false, "message": "..." }`.
    - Códigos HTTP: `400` (Validación), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `500` (Server Error).

---

## 🧪 Pruebas Unitarias

Ejecuta el set de pruebas para validar la integridad de la autenticación:
```bash
npm test
```

---

## 📝 Buenas Prácticas para Integración

- **Almacenamiento de Token**: En aplicaciones móviles, guarda el JWT de forma segura (EncryptedSharedPreferences en Android o Keychain en iOS).
- **Manejo de Expiración**: Si el servidor responde con `401`, redirige al usuario al flujo de Login.
- **Optimización de Carga**: Utiliza el endpoint `GET /user/me` al inicio de la app para hidratar el estado global del personaje.
- **Sincronización de XP**: Al completar misiones, el backend recalcula el nivel. Se recomienda volver a consultar `/user/me` después de completar misiones críticas.
