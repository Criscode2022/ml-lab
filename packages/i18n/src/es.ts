import { en, type MessageKey } from './en';

/** Spanish overlay — missing keys fall back to English. */
export const es: Partial<Record<MessageKey, string>> = {
  product: 'ML Lab',
  tagline: 'Aprende machine learning haciendo, rompiendo y preguntando por qué.',
  landingCta: 'Entrar al laboratorio',
  createAccount: 'Crear cuenta',
  signIn: 'Entrar',
  startLab: 'Empezar regresión lineal',
  why: '¿Por qué?',
  breakIt: 'Rómpelo',
  labs: 'Laboratorios',
  inspect: 'Inspeccionar',
  happening: 'Qué está pasando',
  math: 'Matemáticas',
  code: 'Código',
  ask: 'Preguntar',
  olsFit: 'Mínimos cuadrados',
  labNotReady: 'Este laboratorio aún no está listo. Regresión lineal y descenso por gradiente sí lo están.',
};
