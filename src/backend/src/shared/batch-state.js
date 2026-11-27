import { z } from 'zod';

export const batchStateSchema = z.object({
  ids: z.array(z.number().int().positive().safe()).min(1).max(100)
    .refine(ids => new Set(ids).size === ids.length),
  isActive: z.boolean(),
}).strict();
