import * as scheduleController from '../controllers/scheduleController';

describe('scheduleController', () => {
  it('should export expected functions', () => {
    expect(typeof scheduleController.createSchedule).toBe('function');
    expect(typeof scheduleController.getSchedules).toBe('function');
    expect(typeof scheduleController.getSchedule).toBe('function');
    expect(typeof scheduleController.updateSchedule).toBe('function');
    expect(typeof scheduleController.deleteSchedule).toBe('function');
    expect(typeof scheduleController.overlaps).toBe('function');
  });
  // To test handlers: mock req, res, and database calls
});

describe('overlaps', () => {
  it('detects overlapping intervals', () => {
    const aStart = new Date('2024-06-01T10:00:00');
    const aEnd = new Date('2024-06-01T11:00:00');
    const bStart = new Date('2024-06-01T10:30:00');
    const bEnd = new Date('2024-06-01T11:30:00');
    expect(scheduleController.overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it('detects non-overlapping intervals', () => {
    const aStart = new Date('2024-06-01T10:00:00');
    const aEnd = new Date('2024-06-01T11:00:00');
    const bStart = new Date('2024-06-01T11:00:00');
    const bEnd = new Date('2024-06-01T12:00:00');
    expect(scheduleController.overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
  });

  it('detects fully contained intervals', () => {
    const aStart = new Date('2024-06-01T10:00:00');
    const aEnd = new Date('2024-06-01T12:00:00');
    const bStart = new Date('2024-06-01T10:30:00');
    const bEnd = new Date('2024-06-01T11:00:00');
    expect(scheduleController.overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it('detects identical intervals', () => {
    const aStart = new Date('2024-06-01T10:00:00');
    const aEnd = new Date('2024-06-01T11:00:00');
    const bStart = new Date('2024-06-01T10:00:00');
    const bEnd = new Date('2024-06-01T11:00:00');
    expect(scheduleController.overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
  });
}); 