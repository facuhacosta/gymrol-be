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
    direction TB
    USERS ||--o{ USER_ITEMS : inventory
    USERS ||--|{ USER_MISSIONS : participates
    USERS ||--o{ WEIGHT_LOGS : tracks
    USER_ITEMS }|--|| ITEMS : "instance of"
    USER_MISSIONS }|--|| MISSIONS : "relates to"
    MISSIONS }|--|{ MISSION_EXERCISES : contains
    MISSION_EXERCISES }|--|| EXERCISES : "references"
    MISSIONS }o--o{ ITEMS : "reward"

    USERS {
        string id PK
        string email
        string username
        number level
        number xp
        number strength "STR"
        number dexterity "DEX"
        number vitality "VIT"
        number stamina "STA"
        number height "cm"
        number weight "kg * 10"
        boolean is_premium
        string created_at
    }

    WEIGHT_LOGS {
        number id PK
        string user_id FK
        number weight
        date logged_at
    }

    ITEMS {
        string id PK
        string name
        string description
        string category "weapon/armor/etc"
        string rarity "common/legendary"
        number base_multiplier
        string scaling_stat "STR/DEX/etc"
        number stat_weight "% scaling"
    }

    USER_ITEMS {
        string user_id PK, FK
        string item_id PK, FK
        boolean is_equipped
    }

    MISSIONS {
        string id PK
        string title
        string description
        string type "daily/weekly/monthly"
        string focus "strength/dexterity/etc"
        string difficulty "beginner/intermediate/advanced"
        string intensity "low/medium/high"
        number xp_reward
        string item_reward_id FK
        boolean is_custom
        string creator_id FK
    }

    EXERCISES {
        string id PK
        string name
        string category
        string stat_weights "JSON {str, dex...}"
        string example "Media URL"
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

---

### 2. Gestión de Usuarios (`/user`)
*Requiere Auth Token*

#### **GET `/user/me`**
Obtiene el perfil completo, incluyendo bonos activos de equipamiento.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "level": 5,
      "strength": 12,
      "activeBonuses": [{ "name": "Espada", "bonus": 5, "stat": "strength" }]
    }
  }
  ```

#### **GET `/user/weight-history`**
Obtiene el historial de peso para gráficas.

#### **POST `/user/weight-log`**
Registra un nuevo peso manualmente.

---

### 3. Sistema de Misiones (`/missions`)
*Requiere Auth Token*

#### **GET `/missions`**
Lista misiones disponibles. Las misiones que coincidan con la estadística más baja del usuario aparecen como **Recomendadas**.

#### **PATCH `/missions/:id/complete`**
Marca una misión como completada.
- **Efectos**: Otorga XP, incrementa atributos RPG (STR, DEX, etc.) y entrega ítems si aplica. Las misiones personalizadas se eliminan tras completarse.

#### **POST `/missions/custom` (Premium Only)**
Crea una misión personalizada. Solo se permite **una misión activa** a la vez.

---

## 🛡 Seguridad y Límites

1.  **Rate Limiting**: 100 peticiones por minuto por IP.
2.  **RPG Balance**: Las misiones personalizadas otorgan un 50% menos de XP para mantener el balance del juego.
3.  **Auto-limpieza**: Las misiones de usuario se borran automáticamente tras ser completadas para optimizar la base de datos.
