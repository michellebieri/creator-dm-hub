import { z } from 'zod';

// Auth validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  displayName: z.string().trim().min(1, 'Display name is required').max(100),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Profile validation schemas
export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required').max(100),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  username: z.string().trim().min(3).max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

// Message validation schemas
export const messageSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
});

// Content upload validation schemas
export const contentUploadSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(1000, 'Description is too long').optional(),
  price: z.number().min(0.01, 'Price must be at least $0.01').max(10000, 'Price cannot exceed $10,000'),
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
});

// File validation
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 20 * 1024 * 1024, // 20MB
};

export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export function validateFile(
  file: File,
  mediaType: 'image' | 'video' | 'audio' | 'document'
): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = FILE_SIZE_LIMITS[mediaType];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    };
  }

  // Check file type
  const allowedTypes = ALLOWED_FILE_TYPES[mediaType];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.jar'];
  const fileName = file.name.toLowerCase();
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: 'This file type is not allowed for security reasons',
    };
  }

  return { valid: true };
}

// Payment validation schemas
export const createPaymentSchema = z.object({
  packId: z.string().uuid('Invalid pack ID'),
  creatorId: z.string().uuid('Invalid creator ID'),
});

// Bundle validation schemas
export const createBundleSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  price: z.number().min(1, 'Price must be at least $1').max(10000),
  discountPercentage: z.number().min(0).max(100).optional(),
});

// Promo code validation schemas
export const promoCodeSchema = z.object({
  code: z.string().trim().min(3, 'Code must be at least 3 characters').max(50)
    .regex(/^[A-Z0-9_]+$/, 'Code can only contain uppercase letters, numbers, and underscores'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0.01),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

// Email validation
export const emailSchema = z.string().email('Invalid email address').max(255);

// URL validation with sanitization
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

// HTML sanitization (basic - for production use DOMPurify)
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

// SQL injection prevention (basic - Supabase client handles this)
export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 10000); // Limit length
}
