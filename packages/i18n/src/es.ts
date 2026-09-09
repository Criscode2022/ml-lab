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
};
