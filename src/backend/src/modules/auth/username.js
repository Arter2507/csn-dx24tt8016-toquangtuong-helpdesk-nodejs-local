import { z } from 'zod';

export const usernameInput = z.string().trim()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,31}$/)
  .transform(value => value.toLowerCase());
