import { Request, Response } from 'express';
import { User } from '../entities/User';
import { Branch } from '../entities/Branch';
import { Class } from '../entities/Class';
import { Schedule } from '../entities/Schedule';
import { SessionBooking } from '../entities/SessionBooking';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Between } from 'typeorm';

export const branchAdminDashboard = async (req: AuthRequest, res: Response) => {
  // Assume BranchAdmin is assigned to one branch
  const adminId = req.user?.id;
  const admin = await User.findOne({ where: { id: adminId }, relations: ['branch'] });
  if (!admin || !admin.branch) return res.status(403).json({ message: 'No branch assigned' });
  const branchId = admin.branch.id;
  const [members, trainers, classes, bookings, schedules] = await Promise.all([
    User.count({ where: { branch: { id: branchId }, role: 'Member' } }),
    User.count({ where: { branch: { id: branchId }, role: 'Trainer' } }),
    Class.count(),
    SessionBooking.createQueryBuilder('booking')
      .leftJoin('booking.schedule', 'schedule')
      .where('schedule.branchId = :branchId', { branchId })
      .getCount(),
    Schedule.count({ where: { branch: { id: branchId } } })
  ]);
  // Attendance summary
  const attendance = await SessionBooking.createQueryBuilder('booking')
    .leftJoin('booking.schedule', 'schedule')
    .where('schedule.branchId = :branchId', { branchId })
    .andWhere('booking.status = :status', { status: 'attended' })
    .getCount();
  // Top classes (by bookings in last month)
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const topClasses = await SessionBooking.createQueryBuilder('booking')
    .leftJoin('booking.schedule', 'schedule')
    .leftJoin('schedule.class', 'class')
    .where('schedule.branchId = :branchId', { branchId })
    .andWhere('booking.createdAt >= :lastMonth', { lastMonth })
    .select('class.name', 'className')
    .addSelect('COUNT(*)', 'count')
    .groupBy('class.name')
    .orderBy('count', 'DESC')
    .limit(3)
    .getRawMany();
  // Top trainers (by attended bookings in last month)
  const topTrainers = await SessionBooking.createQueryBuilder('booking')
    .leftJoin('booking.schedule', 'schedule')
    .leftJoin('schedule.trainer', 'trainer')
    .where('schedule.branchId = :branchId', { branchId })
    .andWhere('booking.createdAt >= :lastMonth', { lastMonth })
    .andWhere('booking.status = :status', { status: 'attended' })
    .select('trainer.name', 'trainerName')
    .addSelect('COUNT(*)', 'count')
    .groupBy('trainer.name')
    .orderBy('count', 'DESC')
    .limit(3)
    .getRawMany();
  // Member growth
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const newMembersThisMonth = await User.createQueryBuilder('user')
    .where('user.branchId = :branchId', { branchId })
    .andWhere('user.role = :role', { role: 'Member' })
    .andWhere('user.createdAt >= :start AND user.createdAt < :end', { start: startOfThisMonth, end: now })
    .getCount();
  const newMembersLastMonth = await User.createQueryBuilder('user')
    .where('user.branchId = :branchId', { branchId })
    .andWhere('user.role = :role', { role: 'Member' })
    .andWhere('user.createdAt >= :start AND user.createdAt < :end', { start: startOfLastMonth, end: startOfThisMonth })
    .getCount();
  // Churn rate: not available (no active/inactive flag), so set to 0
  const churnRate = 0;
  // Financial summary: revenue from attended bookings
  const attendedBookings = await SessionBooking.createQueryBuilder('booking')
    .leftJoin('booking.schedule', 'schedule')
    .where('schedule.branchId = :branchId', { branchId })
    .andWhere('booking.status = :status', { status: 'attended' })
    .getCount();
  const financialSummary = attendedBookings * 20;
  // Average attendance per class (last month)
  const avgAttendance = await SessionBooking.createQueryBuilder('booking')
    .leftJoin('booking.schedule', 'schedule')
    .where('schedule.branchId = :branchId', { branchId })
    .andWhere('booking.createdAt >= :lastMonth', { lastMonth })
    .andWhere('booking.status = :status', { status: 'attended' })
    .select('AVG(1)', 'avg')
    .getRawOne();
  res.json({
    branchId,
    members,
    trainers,
    classes,
    bookings,
    schedules,
    attendance,
    financialSummary,
    topClasses,
    topTrainers,
    memberGrowth: { thisMonth: newMembersThisMonth, lastMonth: newMembersLastMonth },
    churnRate,
    avgAttendance: avgAttendance?.avg || 0,
  });
};

export const superAdminDashboard = async (_req: Request, res: Response) => {
  const branches = await Branch.find();
  const stats = await Promise.all(branches.map(async (branch) => {
    const members = await User.count({ where: { branch: { id: branch.id }, role: 'Member' } });
    const trainers = await User.count({ where: { branch: { id: branch.id }, role: 'Trainer' } });
    const bookings = await SessionBooking.createQueryBuilder('booking')
      .leftJoin('booking.schedule', 'schedule')
      .where('schedule.branchId = :branchId', { branchId: branch.id })
      .getCount();
    // Revenue for branch
    const attendedBookings = await SessionBooking.createQueryBuilder('booking')
      .leftJoin('booking.schedule', 'schedule')
      .where('schedule.branchId = :branchId', { branchId: branch.id })
      .andWhere('booking.status = :status', { status: 'attended' })
      .getCount();
    const revenue = attendedBookings * 20;
    // Top trainers for branch
    const topTrainers = await SessionBooking.createQueryBuilder('booking')
      .leftJoin('booking.schedule', 'schedule')
      .leftJoin('schedule.trainer', 'trainer')
      .where('schedule.branchId = :branchId', { branchId: branch.id })
      .andWhere('booking.status = :status', { status: 'attended' })
      .select('trainer.name', 'trainerName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('trainer.name')
      .orderBy('count', 'DESC')
      .limit(3)
      .getRawMany();
    return {
      branchId: branch.id,
      branchName: branch.name,
      members,
      trainers,
      bookings,
      revenue,
      topTrainers,
      trainerPerformance: topTrainers,
      satisfaction: 'stub',
    };
  }));
  // Branch comparison
  // Global trends
  // Global revenue
  const globalRevenue = stats.reduce((sum, b) => sum + b.revenue, 0);
  // Global churn rate: not available, set to 0
  const churnRate = 0;
  // Global growth: new members this month
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const growth = await User.createQueryBuilder('user')
    .where('user.role = :role', { role: 'Member' })
    .andWhere('user.createdAt >= :start AND user.createdAt < :end', { start: startOfThisMonth, end: now })
    .getCount();
  // Monthly growth: new members per month for last 6 months
  const monthlyGrowth = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const count = await User.createQueryBuilder('user')
      .where('user.role = :role', { role: 'Member' })
      .andWhere('user.createdAt >= :start AND user.createdAt < :end', { start: monthStart, end: monthEnd })
      .getCount();
    monthlyGrowth.push({ month: monthStart.toISOString().slice(0, 7), newMembers: count });
  }
  // Churn trend: not available, set to 0 for each month
  const churnTrend = monthlyGrowth.map(mg => ({ month: mg.month, churned: 0 }));
  // Predictive: stub
  const predictive = 'stub';
  res.json({
    branches: stats,
    global: {
      totalMembers: stats.reduce((sum, b) => sum + b.members, 0),
      totalTrainers: stats.reduce((sum, b) => sum + b.trainers, 0),
      totalBookings: stats.reduce((sum, b) => sum + b.bookings, 0),
      globalRevenue,
      churnRate,
      growth,
      predictive,
      monthlyGrowth,
      churnTrend,
    }
  });
}; 