import { Request, Response } from 'express';
import { Branch } from '../entities/Branch';
import { User } from '../entities/User';

export const getBranches = async (_req: Request, res: Response) => {
  const branches = await Branch.find();
  res.json(branches);
};

export const getBranch = async (req: Request, res: Response) => {
  const branch = await Branch.findOne({ where: { id: Number(req.params.id) } });
  if (!branch) return res.status(404).json({ message: 'Branch not found' });
  res.json(branch);
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;
    const branch = Branch.create({ name, address });
    await branch.save();
    res.status(201).json(branch);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create branch', error: err.message });
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;
    const branch = await Branch.findOne({ where: { id: Number(req.params.id) } });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    branch.name = name ?? branch.name;
    branch.address = address ?? branch.address;
    await branch.save();
    res.json(branch);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update branch', error: err.message });
  }
};

export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findOne({ where: { id: Number(req.params.id) } });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    await branch.remove();
    res.json({ message: 'Branch deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete branch', error: err.message });
  }
};

export const assignTrainer = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const branchId = Number(req.params.id);
    const user = await User.findOne({ where: { id: userId, role: 'Trainer' } });
    if (!user) return res.status(404).json({ message: 'Trainer not found' });
    user.branch = { id: branchId } as any;
    await user.save();
    res.json({ message: 'Trainer assigned to branch', user });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to assign trainer', error: err.message });
  }
};

export const assignMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const branchId = Number(req.params.id);
    const user = await User.findOne({ where: { id: userId, role: 'Member' } });
    if (!user) return res.status(404).json({ message: 'Member not found' });
    user.branch = { id: branchId } as any;
    await user.save();
    res.json({ message: 'Member assigned to branch', user });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to assign member', error: err.message });
  }
};

export const assignBranchAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const branchId = Number(req.params.id);
    const user = await User.findOne({ where: { id: userId, role: 'BranchAdmin' } });
    if (!user) return res.status(404).json({ message: 'BranchAdmin not found' });
    user.branch = { id: branchId } as any;
    await user.save();
    res.json({ message: 'BranchAdmin assigned to branch', user });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to assign BranchAdmin', error: err.message });
  }
};

export const getBranchAdmins = async (req: Request, res: Response) => {
  const branchId = Number(req.params.id);
  const admins = await User.find({ where: { branch: { id: branchId }, role: 'BranchAdmin' }, relations: ['branch'] });
  res.json(admins);
};

export const getBranchTrainers = async (req: Request, res: Response) => {
  const branchId = Number(req.params.id);
  const trainers = await User.find({ where: { branch: { id: branchId }, role: 'Trainer' }, relations: ['branch'] });
  res.json(trainers);
};

export const getBranchMembers = async (req: Request, res: Response) => {
  const branchId = Number(req.params.id);
  const members = await User.find({ where: { branch: { id: branchId }, role: 'Member' }, relations: ['branch'] });
  res.json(members);
}; 