import { Request, Response } from 'express';
import { SessionBooking } from '../entities/SessionBooking';
import { Schedule } from '../entities/Schedule';
import { User } from '../entities/User';
import { AuthRequest } from '../middlewares/authMiddleware';

export const bookSession = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.user?.id;
    const { scheduleId } = req.body;
    const schedule = await Schedule.findOne({ where: { id: scheduleId } });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    const member = await User.findOne({ where: { id: memberId, role: 'Member' } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    // Prevent double booking
    const existing = await SessionBooking.findOne({ where: { member, schedule } });
    if (existing) return res.status(400).json({ message: 'Already booked' });
    const booking = SessionBooking.create({ member, schedule, status: 'booked' });
    await booking.save();
    res.status(201).json(booking);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to book session', error: err.message });
  }
};

export const getMemberBookings = async (req: AuthRequest, res: Response) => {
  const memberId = req.user?.id;
  const bookings = await SessionBooking.find({ where: { member: { id: memberId } }, relations: ['schedule', 'schedule.class', 'schedule.room', 'schedule.trainer', 'schedule.branch'] });
  res.json(bookings);
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const memberId = req.user?.id;
    const booking = await SessionBooking.findOne({ where: { id: Number(req.params.id) }, relations: ['member'] });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.member.id !== memberId) return res.status(403).json({ message: 'Forbidden' });
    booking.status = 'cancelled';
    await booking.save();
    res.json({ message: 'Booking cancelled', booking });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to cancel booking', error: err.message });
  }
};

export const getScheduleBookings = async (req: AuthRequest, res: Response) => {
  const scheduleId = Number(req.params.scheduleId);
  const bookings = await SessionBooking.find({ where: { schedule: { id: scheduleId } }, relations: ['member', 'schedule'] });
  res.json(bookings);
};

export const getBranchBookings = async (req: AuthRequest, res: Response) => {
  const branchId = Number(req.params.branchId);
  const bookings = await SessionBooking.createQueryBuilder('booking')
    .leftJoinAndSelect('booking.schedule', 'schedule')
    .leftJoinAndSelect('booking.member', 'member')
    .where('schedule.branchId = :branchId', { branchId })
    .getMany();
  res.json(bookings);
};

export const getTrainerSchedules = async (req: AuthRequest, res: Response) => {
  const trainerId = req.user?.id;
  const schedules = await Schedule.find({ where: { trainer: { id: trainerId } }, relations: ['class', 'room', 'branch'] });
  res.json(schedules);
};

export const getBranchSchedules = async (req: AuthRequest, res: Response) => {
  const branchId = Number(req.params.branchId);
  const schedules = await Schedule.find({ where: { branch: { id: branchId } }, relations: ['class', 'room', 'trainer'] });
  res.json(schedules);
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body; // 'attended' or 'missed'
    if (!['attended', 'missed'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const booking = await SessionBooking.findOne({ where: { id: Number(req.params.id) }, relations: ['schedule', 'schedule.trainer'] });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    // Only trainer assigned to the session or admin can mark attendance
    const user = req.user;
    if (user?.role === 'Trainer' && booking.schedule.trainer.id !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    booking.status = status;
    await booking.save();
    res.json({ message: 'Attendance marked', booking });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to mark attendance', error: err.message });
  }
}; 