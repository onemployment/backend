import { z } from 'zod';

// LOGIN REQUEST/RESPONSE SCHEMAS (email-based, not username-based)
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

// API Response Schema (shaped by controller)
export const loginResponseSchema = z.object({
  message: z.string(),
  token: z.string(), // JWT token
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean(),
    createdAt: z.string(), // ISO 8601 string
    lastLoginAt: z.string().nullable(),
  }),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const errorResponseSchema = z.object({
  message: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
