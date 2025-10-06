import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  referral_code: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const courseCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  referral_reward: z.number().min(0, 'Referral reward must be positive').optional()
});

export const payoutRequestSchema = z.object({
  amount: z.number().min(10, 'Minimum payout amount is ₹10'),
  payout_method_id: z.string().uuid('Invalid payout method ID')
});

export const influencerDataSchema = z.object({
  display_earnings: z.number().min(0).max(999999.99),
  display_referrals: z.number().int().min(0).max(10000),
  display_title: z.string().max(100).trim(),
  is_featured: z.boolean(),
  show_on_landing: z.boolean()
});

// Validation middleware factory
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

// Input sanitization
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// Rate limiting configuration
export const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later'
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later'
  },
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 admin operations per window
    message: 'Too many admin operations, please try again later'
  }
};