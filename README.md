# Learn & Earn - E-Learning Platform

A modern e-learning platform focused on skill development with a comprehensive referral system. Users can purchase PDF-based courses and earn 50% commission by referring friends through unique referral codes.

## 🌟 Features

### Core Functionality
- **Course Management**: Browse and purchase PDF-based learning materials
- **Referral System**: Generate unique codes and earn 50% commission on referred purchases
- **Wallet System**: Track earnings, request payouts, and view transaction history
- **User Authentication**: Secure signup/login with Supabase Auth
- **Admin Panel**: Comprehensive management dashboard for courses, users, and analytics

### User Experience
- **Responsive Design**: Mobile-first approach with shadcn/ui components
- **Progress Tracking**: Monitor learning journey and referral performance
- **Support System**: Built-in ticketing system for user assistance
- **Intuitive Navigation**: Clean, organized interface for easy course discovery

## 🛠 Technology Stack

**Frontend:**
- React 18 with TypeScript for type safety
- Vite for fast development and optimized builds
- shadcn/ui + Tailwind CSS for modern, accessible UI
- TanStack React Query for efficient data fetching
- React Router for client-side navigation

**Backend:**
- Express.js server with Vite middleware integration
- Supabase for database and authentication
- Drizzle ORM for type-safe database operations
- JWT-based authentication with role-based access control

**Database:**
- PostgreSQL (hosted on Supabase)
- Drizzle ORM for type-safe database operations
- Schema synchronization with drizzle-kit

**Payment & Communication:**
- Razorpay integration (ready for Indian market)
- Telegram Bot API for admin notifications

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- PostgreSQL database (provided by Supabase)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/learn-and-earn.git
cd learn-and-earn
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Setup:**
Copy the `.env.example` file to `.env` and update the values:

**Server-side Variables (DO NOT expose to client!):**
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://username:password@host:port/database
```

**Client-side Variables (safe for frontend):**
```env
VITE_SUPABASE_URL=your_supabase_project_url  
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Optional Variables:**
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
PORT=5000
NODE_ENV=development
```

**⚠️ Security Warning**: Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. Never expose it to the client as it provides admin-level database access.

4. **Database Setup:**
```bash
npm run db:push
```

5. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

**Note**: The development server runs Express with Vite middleware, providing both frontend and backend API functionality.

### Production Setup
1. **Environment Variables**: Set all required server and client variables
2. **Database**: Ensure PostgreSQL database is properly configured
3. **Build Process**: Run `npm run build` to create production assets
4. **Server Start**: Set production environment and start server:
   ```bash
   NODE_ENV=production npm start
   ```
   This serves built static assets and API endpoints from the Express server.

## 📝 API Documentation

### Currently Implemented API Endpoints

**Admin Endpoints (Protected - Requires Authentication)**
```
GET    /api/admin/users                      # List all users
GET    /api/admin/marketing-display-data     # Get marketing display data
POST   /api/admin/marketing-display-data     # Create marketing display entry
PUT    /api/admin/marketing-display-data/:id # Update marketing display entry
DELETE /api/admin/marketing-display-data/:id # Delete marketing display entry
POST   /api/admin/initialize-test-data       # Initialize test courses
GET    /api/admin/initialization-status      # Check initialization status
POST   /api/admin/create-test-data           # Create additional test data
```

**Frontend Data Access**
The frontend uses Supabase client-side SDK for:
- User authentication (signup, login, profile management)
- Direct database queries for courses, purchases, wallet data
- Row-level security for data access control

**Authentication**
- User authentication: Supabase Auth with JWT tokens
- Admin API access: Requires valid Bearer token in Authorization header
- Role verification: Server validates user role for admin endpoints

## 🏗 Project Structure

```
learn-and-earn/
├── src/                  # Frontend React application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route components  
│   ├── context/         # React context providers
│   └── lib/            # Utilities and configurations
├── server/
│   ├── index.ts         # Express server with Vite middleware
│   ├── routes/          # API route handlers
│   └── middleware/      # Authentication middleware
├── shared/
│   └── schema.ts        # Database schema definitions
└── attached_assets/     # Static assets and uploads
```

## 🔒 Security Features

- JWT-based authentication with Supabase Auth
- Role-based access control (admin/user roles)
- Protected admin API routes with middleware authentication
- Separation of client/server environment variables
- Input validation and error handling

## 📊 Database Schema

The platform uses a normalized PostgreSQL schema with the following core tables:
- **users**: User profiles, authentication, and role management
- **courses**: Course information, pricing, and content references
- **purchases**: Purchase records and payment status tracking
- **referral_codes**: Unique referral codes per user/course combination
- **wallet_transactions**: Commission payments and balance tracking
- **marketing_display_data**: Public success stories and testimonials

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server with Express + Vite
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run db:push      # Sync database schema with Drizzle
npm run lint         # Run ESLint checks
```

### Database Management
```bash
npm run db:generate  # Generate migration files
npm run db:push      # Push schema changes to database
```

## 📈 Analytics Foundation

- Database schema supports comprehensive analytics
- Admin panel includes analytics dashboard components
- User action logging infrastructure in place
- Ready for integration with analytics services
- Course and user management reporting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Roadmap

### Planned Features
- Advanced course content types (video, interactive modules)
- Real-time notifications with WebSocket integration
- Enhanced analytics dashboard with detailed reporting
- Multi-payment gateway support (Stripe, PayPal)
- Advanced referral tracking and leaderboards
- Mobile app development
- Bulk course management tools
- Email marketing automation

### Integration Opportunities  
- Email marketing automation
- Social media sharing features
- Third-party learning management systems
- Advanced payment processing features
- Customer relationship management tools

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.io/) for backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations
- [TanStack Query](https://tanstack.com/query) for efficient data management

---

**Built with ❤️ for the learning community**