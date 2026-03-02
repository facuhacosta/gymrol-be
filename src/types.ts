export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  RESEND_API_KEY: string;
  RESEND_EMAIL_FROM: string;
};

export type Variables = {
  userId: string;
};
