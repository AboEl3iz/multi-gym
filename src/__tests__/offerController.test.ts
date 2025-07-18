import * as offerController from '../controllers/offerController';

describe('offerController', () => {
  it('should export expected functions', () => {
    expect(typeof offerController.createOffer).toBe('function');
    expect(typeof offerController.getOffers).toBe('function');
    expect(typeof offerController.getOffer).toBe('function');
    expect(typeof offerController.updateOffer).toBe('function');
    expect(typeof offerController.deleteOffer).toBe('function');
  });
  // To test handlers: mock req, res, and database calls
}); 