import { z } from 'zod';

// USER REGISTRATION SCHEMA
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one digit'
    ),
  username: z
    .string()
    .min(1)
    .max(39)
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
      'Username must be 1-39 characters, start and end with alphanumeric, and can contain hyphens'
    ),
  firstName: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z\s\-'.]+$/,
      'First name can only contain letters, spaces, hyphens, apostrophes, and dots'
    ),
  lastName: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z\s\-'.]+$/,
      'Last name can only contain letters, spaces, hyphens, apostrophes, and dots'
    ),
});

// USER PROFILE UPDATE SCHEMA
export const userProfileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s\-'.]+$/)
    .optional(),
  lastName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s\-'.]+$/)
    .optional(),
  displayName: z.string().min(1).max(200).nullable().optional(),
});

// API RESPONSE SCHEMAS (shaped by controllers)
export const userRegistrationResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean(),
    accountCreationMethod: z.string(),
    createdAt: z.string(),
    lastLoginAt: z.string().nullable(),
  }),
});

export const usernameValidationResponseSchema = z.object({
  available: z.boolean(),
  message: z.string(),
  suggestions: z.array(z.string()).optional(), // only if available = false
});

export const userProfileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    displayName: z.string().nullable(),
    emailVerified: z.boolean(),
    accountCreationMethod: z.string(),
    createdAt: z.string(),
    lastLoginAt: z.string().nullable(),
  }),
});

export type UserRegistrationRequest = z.infer<typeof userRegistrationSchema>;
export type UserProfileUpdateRequest = z.infer<typeof userProfileUpdateSchema>;
export type UserRegistrationResponse = z.infer<
  typeof userRegistrationResponseSchema
>;
export type UsernameValidationResponse = z.infer<
  typeof usernameValidationResponseSchema
>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
