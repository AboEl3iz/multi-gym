import { Request, Response } from 'express';
import { Report } from '../entities/Report';
import { Branch } from '../entities/Branch';
import { SessionBooking } from '../entities/SessionBooking';
import PDFDocument from 'pdfkit';

export const generateReport = async (req: Request, res: Response) => {
  try {
    const { branchId, type, period } = req.body; // period: 'YYYY-MM' or 'YYYY-MM-DD'
    const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : undefined;
    if (branchId && !branch) return res.status(404).json({ message: 'Branch not found' });
    let data = {};
    if (type === 'attendance') {
      // Example: attendance report for a branch and month
      const [year, month] = period.split('-');
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      const bookings = await SessionBooking.createQueryBuilder('booking')
        .leftJoinAndSelect('booking.schedule', 'schedule')
        .where('schedule.branchId = :branchId', { branchId })
        .andWhere('booking.createdAt >= :start AND booking.createdAt < :end', { start, end })
        .getMany();
      data = {
        totalBookings: bookings.length,
        attended: bookings.filter(b => b.status === 'attended').length,
        missed: bookings.filter(b => b.status === 'missed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
      };
    }
    // Add more report types as needed
    const report = Report.create({ type, branch: branch || undefined, period, data });
    await report.save();
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to generate report', error: err.message });
  }
};

export const getReport = async (req: Request, res: Response) => {
  const report = await Report.findOne({ where: { id: Number(req.params.id) }, relations: ['branch'] });
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
};

export const listReports = async (req: Request, res: Response) => {
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const where: any = {};
  if (branchId) where.branch = { id: branchId };
  const reports = await Report.find({ where, relations: ['branch'] });
  res.json(reports);
};

export const exportReportPDF = async (req: Request, res: Response) => {
  const report = await Report.findOne({ where: { id: Number(req.params.id) }, relations: ['branch'] });
  if (!report) return res.status(404).json({ message: 'Report not found' });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report_${report.id}.pdf`);

  doc.pipe(res);
  doc.fontSize(20).text('Gym Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Type: ${report.type}`);
  doc.text(`Period: ${report.period}`);
  if (report.branch) doc.text(`Branch: ${report.branch.name}`);
  doc.moveDown();
  doc.fontSize(16).text('Data:', { underline: true });
  doc.fontSize(12);
  const data = report.data || {};
  Object.entries(data).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`);
  });
  doc.end();
}; 