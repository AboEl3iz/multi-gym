import { Request, Response } from 'express';
import { Notification } from '../entities/Notification';
import { User } from '../entities/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendNotificationEmail } from '../config/emailService';

export const listNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const notifications = await Notification.find({ where: { user: { id: userId } }, order: { createdAt: 'DESC' } });
  res.json(notifications);
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const notification = await Notification.findOne({ where: { id: Number(req.params.id), user: { id: userId } } });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  notification.read = true;
  await notification.save();
  res.json(notification);
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, message, type } = req.body;
    const user = await User.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const notification = Notification.create({ user, message, type });
    await notification.save();
    
    // Send email notification
    if (user.email) {
      const emailSent = await sendNotificationEmail(user.email, message, type);
      if (emailSent) {
        console.log(`Email notification sent to ${user.email}`);
      } else {
        console.log(`Failed to send email notification to ${user.email}`);
      }
    }
    
    res.status(201).json(notification);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create notification', error: err.message });
  }
}; 