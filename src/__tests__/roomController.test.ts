import * as roomController from '../controllers/roomController';

describe('roomController', () => {
  it('should export expected functions', () => {
    expect(typeof roomController.createRoom).toBe('function');
    expect(typeof roomController.getRooms).toBe('function');
    expect(typeof roomController.getRoom).toBe('function');
    expect(typeof roomController.updateRoom).toBe('function');
    expect(typeof roomController.deleteRoom).toBe('function');
  });
  // To test handlers: mock req, res, and database calls
}); 