import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import { errorHandler } from './lib/errors';
import { configureCloudinary } from './lib/upload';
import { initSocket } from './lib/socket';

import authRoutes from './modules/auth/routes';
import workspaceRoutes from './modules/workspaces/routes';
import projectRoutes from './modules/projects/routes';
import taskRoutes from './modules/tasks/routes';
import commentRoutes from './modules/comments/routes';
import notificationRoutes from './modules/notifications/routes';
import calendarRoutes from './modules/calendar/routes';
import dashboardRoutes from './modules/dashboard/routes';
import searchRoutes from './modules/search/routes';
import aiRoutes from './modules/ai/routes';

configureCloudinary();

const app = express();
const server = http.createServer(app);
initSocket(server);

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'orbito-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai', aiRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`Orbito API running on http://localhost:${port}`);
});
