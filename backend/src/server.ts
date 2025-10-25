import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import stockRoutes from './routes/stockRoutes';
import authRoutes from './routes/authRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stock', stockRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Stock Advisor API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Stock Advisor backend running on http://localhost:${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/stock`);
  console.log(`🔐 Auth endpoint: http://localhost:${PORT}/api/auth`);
});
