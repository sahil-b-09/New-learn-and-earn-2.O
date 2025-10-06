import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import coursesRouter from './routes/courses.js';
import paymentsRouter from './routes/payments.js';
import walletRouter from './routes/wallet.js';
import influencerRouter from './routes/influencer.js';
import supportRouter from './routes/support.js';
import uploadRouter from './routes/upload.js';
import referralsRouter from './routes/referrals.js';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Trust proxy for rate limiting and proper IP detection
app.set('trust proxy', true);

// Security and logging middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow Vite dev assets
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));
app.use(compression());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/influencer', influencerRouter);
app.use('/api/support', supportRouter);
// TODO: Fix upload router wildcard routes and re-enable
// app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/referrals', referralsRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Create supabaseAdmin client for health check
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test Supabase connectivity and schema cache
    const start = Date.now();
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('id')
      .limit(1);
    
    const latency = Date.now() - start;
    
    if (error) {
      console.error('Health check failed:', error);
      return res.status(503).json({
        status: 'down',
        database: 'disconnected',
        error: error.message,
        latency
      });
    }
    
    res.json({
      status: 'up',
      database: 'connected',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'down',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Warm up Supabase schema cache on startup
async function warmupDatabase() {
  console.log('🔥 Warming up database schema cache...');
  const maxRetries = 3;
  let retryCount = 0;
  
  // Create supabaseAdmin client for warmup
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  while (retryCount < maxRetries) {
    try {
      // Test basic connectivity
      const { data, error } = await supabaseAdmin
        .from('courses')
        .select('id')
        .limit(1);
      
      if (error) {
        throw new Error(`Schema cache warmup failed: ${error.message}`);
      }
      
      console.log('✅ Database schema cache warmed up successfully');
      return true;
    } catch (error) {
      retryCount++;
      console.warn(`⚠️ Database warmup attempt ${retryCount}/${maxRetries} failed:`, error instanceof Error ? error.message : error);
      
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${retryCount * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
      } else {
        console.error('❌ Database warmup failed after all retries');
        return false;
      }
    }
  }
  return false;
}

async function startServer() {
  try {
    // Warm up database before starting server
    await warmupDatabase();
    if (process.env.NODE_ENV !== 'production') {
      // Development: Use Vite middleware mode
      console.log('🔧 Starting development server with Vite middleware...');
      
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
        root: process.cwd()
      });
      
      // Use Vite's connect instance as middleware
      app.use(vite.middlewares);
      
      console.log('✅ Vite middleware attached');
    } else {
      // Production: Serve static files
      console.log('📦 Starting production server...');
      
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      
      // SPA fallback - serve index.html for all non-API routes
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile(path.join(distPath, 'index.html'));
        } else {
          res.status(404).json({ error: 'API endpoint not found' });
        }
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Admin API: http://0.0.0.0:${PORT}/api/admin`);
      console.log(`🌐 External access: Available through Replit proxy`);
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

startServer();