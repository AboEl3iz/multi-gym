import { Request, Response } from 'express';
import { Offer } from '../entities/Offer';
import { Branch } from '../entities/Branch';

export const createOffer = async (req: Request, res: Response) => {
  try {
    const { title, description, discount, type, branchId, validFrom, validTo, isActive } = req.body;
    const branch = branchId ? await Branch.findOne({ where: { id: branchId } }) : undefined;
    if (branchId && !branch) return res.status(404).json({ message: 'Branch not found' });
    const offer = Offer.create({ title, description, discount, type, branch: branch || undefined, validFrom, validTo, isActive });
    await offer.save();
    res.status(201).json(offer);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create offer', error: err.message });
  }
};

export const getOffers = async (req: Request, res: Response) => {
  const now = new Date();
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  const where: any = { isActive: true, validFrom: { $lte: now }, validTo: { $gte: now } };
  if (branchId) where.branch = { id: branchId };
  // TypeORM does not support $lte/$gte, so use queryBuilder
  let query = Offer.createQueryBuilder('offer').where('offer.isActive = true').andWhere('offer.validFrom <= :now AND offer.validTo >= :now', { now });
  if (branchId) query = query.andWhere('offer.branchId = :branchId', { branchId });
  const offers = await query.getMany();
  res.json(offers);
};

export const getOffer = async (req: Request, res: Response) => {
  const offer = await Offer.findOne({ where: { id: Number(req.params.id) }, relations: ['branch'] });
  if (!offer) return res.status(404).json({ message: 'Offer not found' });
  res.json(offer);
};

export const updateOffer = async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findOne({ where: { id: Number(req.params.id) } });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    const { title, description, discount, type, branchId, validFrom, validTo, isActive } = req.body;
    if (branchId) {
      const branch = await Branch.findOne({ where: { id: branchId } });
      if (!branch) return res.status(404).json({ message: 'Branch not found' });
      offer.branch = branch;
    }
    offer.title = title ?? offer.title;
    offer.description = description ?? offer.description;
    offer.discount = discount ?? offer.discount;
    offer.type = type ?? offer.type;
    offer.validFrom = validFrom ?? offer.validFrom;
    offer.validTo = validTo ?? offer.validTo;
    offer.isActive = isActive ?? offer.isActive;
    await offer.save();
    res.json(offer);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update offer', error: err.message });
  }
};

export const deleteOffer = async (req: Request, res: Response) => {
  try {
    const offer = await Offer.findOne({ where: { id: Number(req.params.id) } });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    await offer.remove();
    res.json({ message: 'Offer deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete offer', error: err.message });
  }
}; 