import * as bookingController from '../controllers/bookingController';

describe('bookingController', () => {
  it('should export expected functions', () => {
    expect(typeof bookingController.bookSession).toBe('function');
    expect(typeof bookingController.getMemberBookings).toBe('function');
    expect(typeof bookingController.cancelBooking).toBe('function');
    expect(typeof bookingController.getScheduleBookings).toBe('function');
    expect(typeof bookingController.getBranchBookings).toBe('function');
    expect(typeof bookingController.getTrainerSchedules).toBe('function');
    expect(typeof bookingController.getBranchSchedules).toBe('function');
    expect(typeof bookingController.markAttendance).toBe('function');
  });
  // To test handlers: mock req, res, and database calls
}); 