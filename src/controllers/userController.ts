import { Request, Response } from 'express';
import { User } from '../entities/User';

export const listTrainers = async (req: Request, res: Response) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const where: any = { role: 'Trainer' };
  if (branchId) where.branch = { id: branchId };
  const trainers = await User.find({ where, relations: ['branch'] });
  res.json(trainers);
};

export const listMembers = async (req: Request, res: Response) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const where: any = { role: 'Member' };
  if (branchId) where.branch = { id: branchId };
  const members = await User.find({ where, relations: ['branch'] });
  res.json(members);
};

export const getUserProfile = async (req: Request, res: Response) => {
  const user = await User.findOne({ where: { id: Number(req.params.id) }, relations: ['branch'] });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { name, email } = req.body;
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    await user.save();
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.remove();
    res.json({ message: 'User deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
}; 