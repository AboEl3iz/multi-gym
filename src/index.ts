import 'reflect-metadata';
import express from 'express';
import { createConnection } from 'typeorm';
import dotenv from 'dotenv';
import ormconfig from './config/ormconfig';
import routes from './routes';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from './entities/User';
import { ChatMessage } from './entities/ChatMessage';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use('/', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey') as any;
    const user = await User.findOne({ where: { id: payload.id } });
    if (!user) return next(new Error('User not found'));
    (socket as any).user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = (socket as any).user as User;
  socket.join(`user:${user.id}`);
  if (user.role === 'SuperAdmin' || user.role === 'BranchAdmin') {
    socket.join('admins');
  }

  socket.on('direct_message', async ({ toUserId, message }) => {
    const receiver = await User.findOne({ where: { id: toUserId } });
    if (!receiver) return;
    const chat = ChatMessage.create({ sender: user, receiver, message, type: 'direct' });
    await chat.save();
    io.to(`user:${toUserId}`).emit('direct_message', { from: user.id, message, createdAt: chat.createdAt });
    socket.emit('direct_message', { from: user.id, message, createdAt: chat.createdAt });
  });

  socket.on('broadcast', async ({ message }) => {
    if (user.role !== 'SuperAdmin' && user.role !== 'BranchAdmin') return;
    const chat = ChatMessage.create({ sender: user, message, type: 'broadcast' });
    await chat.save();
    io.emit('broadcast', { from: user.id, message, createdAt: chat.createdAt });
  });
});

// Start server after DB connection
createConnection(ormconfig)
  .then(() => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error);
  }); 