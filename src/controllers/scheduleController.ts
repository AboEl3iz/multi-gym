import { Request, Response } from 'express';
import { Schedule } from '../entities/Schedule';
import { Class } from '../entities/Class';
import { Room } from '../entities/Room';
import { User } from '../entities/User';
import { Branch } from '../entities/Branch';
import { Between, Not } from 'typeorm';

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const { classId, roomId, trainerId, branchId, startTime, endTime } = req.body;
    const [gymClass, room, trainer, branch] = await Promise.all([
      Class.findOne({ where: { id: classId } }),
      Room.findOne({ where: { id: roomId } }),
      User.findOne({ where: { id: trainerId, role: 'Trainer' } }),
      Branch.findOne({ where: { id: branchId } })
    ]);
    if (!gymClass || !room || !trainer || !branch) return res.status(400).json({ message: 'Invalid class, room, trainer, or branch' });
    const start = new Date(startTime);
    const end = new Date(endTime);
    // Improved conflict detection
    const roomSchedules = await Schedule.find({ where: { room } });
    const trainerSchedules = await Schedule.find({ where: { trainer } });
    const hasConflict = [...roomSchedules, ...trainerSchedules].some(sch =>
      overlaps(start, end, sch.startTime, sch.endTime)
    );
    if (hasConflict) return res.status(409).json({ message: 'Schedule conflict detected' });
    const schedule = Schedule.create({ class: gymClass, room, trainer, branch, startTime: start, endTime: end });
    await schedule.save();
    res.status(201).json(schedule);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create schedule', error: err.message });
  }
};

export const getSchedules = async (req: Request, res: Response) => {
  const { branchId, trainerId, roomId, classId } = req.query;
  const where: any = {};
  if (branchId) where.branch = { id: Number(branchId) };
  if (trainerId) where.trainer = { id: Number(trainerId) };
  if (roomId) where.room = { id: Number(roomId) };
  if (classId) where.class = { id: Number(classId) };
  const schedules = await Schedule.find({ where, relations: ['class', 'room', 'trainer', 'branch'] });
  res.json(schedules);
};

export const getSchedule = async (req: Request, res: Response) => {
  const schedule = await Schedule.findOne({ where: { id: Number(req.params.id) }, relations: ['class', 'room', 'trainer', 'branch'] });
  if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
  res.json(schedule);
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const schedule = await Schedule.findOne({ where: { id: Number(req.params.id) } });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    const { classId, roomId, trainerId, branchId, startTime, endTime } = req.body;
    if (classId) {
      const gymClass = await Class.findOne({ where: { id: classId } });
      if (!gymClass) return res.status(400).json({ message: 'Invalid class' });
      schedule.class = gymClass;
    }
    if (roomId) {
      const room = await Room.findOne({ where: { id: roomId } });
      if (!room) return res.status(400).json({ message: 'Invalid room' });
      schedule.room = room;
    }
    if (trainerId) {
      const trainer = await User.findOne({ where: { id: trainerId, role: 'Trainer' } });
      if (!trainer) return res.status(400).json({ message: 'Invalid trainer' });
      schedule.trainer = trainer;
    }
    if (branchId) {
      const branch = await Branch.findOne({ where: { id: branchId } });
      if (!branch) return res.status(400).json({ message: 'Invalid branch' });
      schedule.branch = branch;
    }
    if (startTime) schedule.startTime = new Date(startTime);
    if (endTime) schedule.endTime = new Date(endTime);
    const start = schedule.startTime;
    const end = schedule.endTime;
    // Improved conflict detection (exclude current schedule)
    const roomSchedules = await Schedule.find({ where: { room: schedule.room } });
    const trainerSchedules = await Schedule.find({ where: { trainer: schedule.trainer } });
    const hasConflict = [...roomSchedules, ...trainerSchedules].some(sch =>
      sch.id !== schedule.id && overlaps(start, end, sch.startTime, sch.endTime)
    );
    if (hasConflict) return res.status(409).json({ message: 'Schedule conflict detected' });
    await schedule.save();
    res.json(schedule);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update schedule', error: err.message });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const schedule = await Schedule.findOne({ where: { id: Number(req.params.id) } });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    await schedule.remove();
    res.json({ message: 'Schedule deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete schedule', error: err.message });
  }
}; 