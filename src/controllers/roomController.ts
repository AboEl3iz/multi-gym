import { Request, Response } from 'express';
import { Room } from '../entities/Room';
import { Branch } from '../entities/Branch';

export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, branchId } = req.body;
    const branch = await Branch.findOne({ where: { id: branchId } });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    const room = Room.create({ name, branch });
    await room.save();
    res.status(201).json(room);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create room', error: err.message });
  }
};

export const getRooms = async (req: Request, res: Response) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const where: any = {};
  if (branchId) where.branch = { id: branchId };
  const rooms = await Room.find({ where, relations: ['branch'] });
  res.json(rooms);
};

export const getRoom = async (req: Request, res: Response) => {
  const room = await Room.findOne({ where: { id: Number(req.params.id) }, relations: ['branch'] });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json(room);
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ where: { id: Number(req.params.id) }, relations: ['branch'] });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const { name, branchId } = req.body;
    if (branchId) {
      const branch = await Branch.findOne({ where: { id: branchId } });
      if (!branch) return res.status(404).json({ message: 'Branch not found' });
      room.branch = branch;
    }
    room.name = name ?? room.name;
    await room.save();
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update room', error: err.message });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ where: { id: Number(req.params.id) } });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    await room.remove();
    res.json({ message: 'Room deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete room', error: err.message });
  }
}; 