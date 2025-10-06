import { pgTable, varchar, text, boolean, integer, decimal, timestamp, uuid, serial, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table with role-based access
export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email').notNull().unique(),
  name: varchar('name'),
  phone: varchar('phone'),
  referral_code: varchar('referral_code'),
  referred_by: varchar('referred_by'),
  role: varchar('role').default('user'), // 'admin', 'moderator', 'user'
  is_suspended: boolean('is_suspended').default(false),
  user_id: varchar('user_id'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  joined_at: timestamp('joined_at').defaultNow(),
  last_login: timestamp('last_login'),
});

// Courses table
export const courses = pgTable('courses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  referral_reward: decimal('referral_reward', { precision: 10, scale: 2 }).default('0'),
  pdf_url: varchar('pdf_url'),
  thumbnail_url: varchar('thumbnail_url'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Wallet table
export const wallet = pgTable('wallet', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  balance: decimal('balance', { precision: 10, scale: 2 }).default('0'),
  total_earned: decimal('total_earned', { precision: 10, scale: 2 }).default('0'),
  total_withdrawn: decimal('total_withdrawn', { precision: 10, scale: 2 }).default('0'),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Purchases table
export const purchases = pgTable('purchases', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  course_id: varchar('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  payment_id: varchar('payment_id'),
  payment_status: varchar('payment_status').default('pending'),
  used_referral_code: varchar('used_referral_code'),
  has_used_referral_code: boolean('has_used_referral_code').default(false),
  purchased_at: timestamp('purchased_at').defaultNow(),
});

// Payout Methods table
export const payout_methods = pgTable('payout_methods', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  method_type: varchar('method_type').notNull(), // 'UPI' or 'BANK'
  upi_id: varchar('upi_id'),
  account_number: varchar('account_number'),
  ifsc_code: varchar('ifsc_code'),
  account_holder_name: varchar('account_holder_name'),
  is_default: boolean('is_default').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Payouts table
export const payouts = pgTable('payouts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  payout_method_id: varchar('payout_method_id').references(() => payout_methods.id),
  status: varchar('status').default('pending'), // 'pending', 'success', 'failed'
  razorpay_payout_id: varchar('razorpay_payout_id'),
  failure_reason: text('failure_reason'),
  created_at: timestamp('created_at').defaultNow(),
  processed_at: timestamp('processed_at'),
});

// Referrals table
export const referrals = pgTable('referrals', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referred_user_id: varchar('referred_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  course_id: varchar('course_id').references(() => courses.id),
  purchase_id: varchar('purchase_id').references(() => purchases.id),
  referral_code: varchar('referral_code'),
  commission_amount: decimal('commission_amount', { precision: 10, scale: 2 }),
  status: varchar('status').default('pending'), // 'pending', 'completed', 'cancelled'
  successful_referrals: integer('successful_referrals').default(0),
  total_earned: decimal('total_earned', { precision: 10, scale: 2 }).default('0'),
  course_referral_code_id: varchar('course_referral_code_id'),
  created_at: timestamp('created_at').defaultNow(),
});

// Course Referral Codes table
export const course_referral_codes = pgTable('course_referral_codes', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  course_id: varchar('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  referral_code: varchar('referral_code').notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
});

// Course Modules table
export const course_modules = pgTable('course_modules', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  course_id: varchar('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title').notNull(),
  description: text('description'),
  content: text('content'),
  module_order: integer('module_order').notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Lessons table
export const lessons = pgTable('lessons', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  module_id: varchar('module_id').notNull().references(() => course_modules.id, { onDelete: 'cascade' }),
  title: varchar('title').notNull(),
  content: text('content'),
  video_url: varchar('video_url'),
  lesson_order: integer('lesson_order').notNull(),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// User Progress table
export const user_progress = pgTable('user_progress', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  module_id: varchar('module_id').references(() => course_modules.id),
  lesson_id: varchar('lesson_id').references(() => lessons.id),
  completed: boolean('completed').default(false),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow(),
});

// Support Tickets table
export const support_tickets = pgTable('support_tickets', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: varchar('subject').notNull(),
  message: text('message').notNull(),
  status: varchar('status').default('open'), // 'open', 'pending', 'in_progress', 'closed'
  priority: varchar('priority').default('medium'), // 'low', 'medium', 'high', 'urgent'
  admin_response: text('admin_response'),
  assigned_to: varchar('assigned_to').references(() => users.id), // Admin/Moderator handling the ticket
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// User Activity Logs table
export const user_activity_logs = pgTable('user_activity_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activity_type: varchar('activity_type').notNull(),
  details: jsonb('details'),
  ip_address: varchar('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow(),
});

// Content Management Logs table
export const content_management_logs = pgTable('content_management_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  admin_id: varchar('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resource_type: varchar('resource_type').notNull(),
  resource_id: varchar('resource_id'),
  operation_type: varchar('operation_type').notNull(),
  details: jsonb('details'),
  created_at: timestamp('created_at').defaultNow(),
});

// Admin Logs table (for Telegram operations)
export const admin_logs = pgTable('admin_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  action_type: varchar('action_type').notNull(),
  admin_telegram_id: varchar('admin_telegram_id').notNull(),
  payout_id: varchar('payout_id').references(() => payouts.id),
  details: jsonb('details'),
  created_at: timestamp('created_at').defaultNow(),
});

// Wallet Transactions table
export const wallet_transactions = pgTable('wallet_transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type').notNull(), // 'credit', 'debit'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status').default('completed'), // 'pending', 'completed', 'failed'
  description: text('description'),
  reference_id: varchar('reference_id'), // Links to payout, purchase, etc.
  created_at: timestamp('created_at').defaultNow(),
});

// Payout Requests table - Enhanced for real payout flow
export const payout_requests = pgTable('payout_requests', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  payout_method_id: varchar('payout_method_id').references(() => payout_methods.id),
  status: varchar('status').default('pending'), // 'pending', 'approved', 'completed', 'cancelled'
  admin_notes: text('admin_notes'),
  telegram_notified: boolean('telegram_notified').default(false),
  processed_by: varchar('processed_by').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
  processed_at: timestamp('processed_at'),
});

// Notifications table - Simple in-app alerts
export const notifications = pgTable('notifications', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title').notNull(),
  message: text('message').notNull(),
  type: varchar('type').default('info'), // 'info', 'success', 'warning', 'error'
  is_read: boolean('is_read').default(false),
  action_url: varchar('action_url'), // Optional link for the notification
  created_at: timestamp('created_at').defaultNow(),
});

// Marketing Display Data - Admin-editable display stats (separate from real data)
export const marketing_display_data = pgTable('marketing_display_data', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  display_earnings: decimal('display_earnings', { precision: 10, scale: 2 }).default('0'),
  display_referrals: integer('display_referrals').default(0),
  display_title: varchar('display_title'), // e.g., "Top Performer", "Rising Star"
  is_featured: boolean('is_featured').default(false),
  show_on_landing: boolean('show_on_landing').default(false),
  updated_by_admin: varchar('updated_by_admin').notNull().references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});