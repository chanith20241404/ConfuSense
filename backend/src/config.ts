import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  LIBSQL_URL: z.string().default('http://localhost:8080'),
  PORT: z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
