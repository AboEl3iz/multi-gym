import { ConnectionOptions } from 'typeorm';
import { User } from '../entities/User';
import { Branch } from '../entities/Branch';
import { Class } from '../entities/Class';
import { Room } from '../entities/Room';
import { Schedule } from '../entities/Schedule';
import { SessionBooking } from '../entities/SessionBooking';
import { Report } from '../entities/Report';
import { Offer } from '../entities/Offer';
import { ChatMessage } from '../entities/ChatMessage';
import { Notification } from '../entities/Notification';
import dotenv from 'dotenv';

dotenv.config();

const config: ConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'gym',
  entities: [User, Branch, Class, Room, Schedule, SessionBooking, Report, Offer, ChatMessage, Notification],
  synchronize: true, // Set to false in production
};

export default config; 