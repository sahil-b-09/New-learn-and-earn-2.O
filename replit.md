# Learn & Earn - E-Learning Platform

## Overview

Learn & Earn is a modern e-learning platform focused on skill development and referral-based earning. The platform enables users to purchase PDF-based courses and earn 50% commission by referring friends. It features a comprehensive admin panel for content management, user analytics, and financial operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: React Router v6 for client-side navigation and protected routes
- **Styling**: Tailwind CSS with custom design system and responsive breakpoints

### Backend Architecture
- **Database**: PostgreSQL with Supabase as Backend-as-a-Service
- **ORM**: Drizzle ORM with Neon Database serverless connection pooling
- **Authentication**: Supabase Auth with JWT tokens and row-level security
- **API Layer**: Supabase client-side SDK with edge functions for complex operations
- **Real-time**: WebSocket connections for live updates and notifications

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon with connection pooling
- **Schema Design**: Normalized relational structure with:
  - Users table with referral tracking
  - Courses with modular content structure
  - Purchases with payment status tracking
  - Wallet system for commission management
  - Analytics tables for business intelligence
- **File Storage**: Supabase Storage for PDF content and user uploads
- **Caching Strategy**: Client-side query caching with 5-10 minute stale times

### Authentication and Authorization
- **Authentication Provider**: Supabase Auth with email/password flow
- **Authorization Model**: Role-based access control (RBAC) with admin/user roles
- **Security Features**: Row-level security policies, protected routes, and session management
- **Admin Access**: Database-driven admin verification with RLS policies

### Content Management System
- **Course Structure**: Hierarchical design with courses → modules → lessons
- **Content Types**: PDF downloads, structured text content, and multimedia support
- **Admin Tools**: Full CRUD operations for courses, user management, and analytics
- **Content Delivery**: Direct download links with access control verification

### Payment Integration
- **Payment Gateway**: Razorpay integration for Indian market
- **Payment Flow**: Order creation → payment verification → course access grant
- **Commission System**: Automated 50% referral commission calculation and distribution
- **Wallet Management**: Real-time balance tracking and withdrawal request system

### Referral System Architecture
- **Code Generation**: Unique referral codes per user/course combination
- **Tracking Mechanism**: Purchase attribution to referrer with commission calculation
- **Earning Distribution**: Automated wallet credit system with transaction logging
- **Analytics**: Comprehensive referral performance tracking and reporting

## External Dependencies

### Core Services
- **Supabase**: Primary backend service providing database, authentication, and real-time features
- **Neon Database**: Serverless PostgreSQL with connection pooling and edge optimization
- **Razorpay**: Payment processing for course purchases with Indian payment methods

### Development Tools
- **Vercel/Netlify**: Deployment platform for static site hosting
- **Lovable**: Development platform integration for collaborative coding
- **ESLint + TypeScript**: Code quality and type checking tools

### UI/UX Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Modern icon library with consistent design
- **React Hook Form**: Form handling with validation and performance optimization

### Analytics and Monitoring
- **TanStack Query**: Data fetching and caching with background updates
- **React Helmet**: SEO optimization and meta tag management
- **Sonner**: Toast notification system for user feedback

### Communication
- **Telegram Bot API**: Admin notifications for payout requests and system alerts
- **Email Service**: Transactional emails through Supabase (future integration)

### Performance Optimization
- **Vite**: Fast bundling with Hot Module Replacement (HMR)
- **React Query**: Intelligent caching and background sync
- **Code Splitting**: Dynamic imports for route-based code splitting
- **Image Optimization**: Lazy loading and responsive image delivery