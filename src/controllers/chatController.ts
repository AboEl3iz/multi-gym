import { Request, Response } from 'express';
import { ChatMessage } from '../entities/ChatMessage';
import { User } from '../entities/User';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getDirectMessages = async (req: AuthRequest, res: Response) => {
  const userId = Number(req.user?.id);
  const otherUserId = Number(req.params.userId);
  const messages = await ChatMessage.createQueryBuilder('msg')
    .leftJoinAndSelect('msg.sender', 'sender')
    .leftJoinAndSelect('msg.receiver', 'receiver')
    .where('(msg.senderId = :userId AND msg.receiverId = :otherUserId) OR (msg.senderId = :otherUserId AND msg.receiverId = :userId)', { userId, otherUserId })
    .orderBy('msg.createdAt', 'ASC')
    .getMany();
  res.json(messages);
};

export const getBroadcastMessages = async (_req: Request, res: Response) => {
  const messages = await ChatMessage.find({ where: { type: 'broadcast' }, relations: ['sender'], order: { createdAt: 'ASC' } });
  res.json(messages);
};

export const getUserMessages = async (req: AuthRequest, res: Response) => {
  const userId = Number(req.user?.id);
  const messages = await ChatMessage.createQueryBuilder('msg')
    .leftJoinAndSelect('msg.sender', 'sender')
    .leftJoinAndSelect('msg.receiver', 'receiver')
    .where('msg.senderId = :userId OR msg.receiverId = :userId', { userId })
    .orderBy('msg.createdAt', 'ASC')
    .getMany();
  res.json(messages);
}; 