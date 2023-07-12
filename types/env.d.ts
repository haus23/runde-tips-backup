declare namespace NodeJS {
  export interface ProcessEnv {
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
    RESEND_API_KEY: string;
    SESSION_SECRET: string;
  }
}
