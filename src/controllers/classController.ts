import { Request, Response } from 'express';
import { Class } from '../entities/Class';

export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const gymClass = Class.create({ name, description });
    await gymClass.save();
    res.status(201).json(gymClass);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create class', error: err.message });
  }
};

export const getClasses = async (_req: Request, res: Response) => {
  const classes = await Class.find();
  res.json(classes);
};

export const getClass = async (req: Request, res: Response) => {
  const gymClass = await Class.findOne({ where: { id: Number(req.params.id) } });
  if (!gymClass) return res.status(404).json({ message: 'Class not found' });
  res.json(gymClass);
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const gymClass = await Class.findOne({ where: { id: Number(req.params.id) } });
    if (!gymClass) return res.status(404).json({ message: 'Class not found' });
    const { name, description } = req.body;
    gymClass.name = name ?? gymClass.name;
    gymClass.description = description ?? gymClass.description;
    await gymClass.save();
    res.json(gymClass);
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update class', error: err.message });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const gymClass = await Class.findOne({ where: { id: Number(req.params.id) } });
    if (!gymClass) return res.status(404).json({ message: 'Class not found' });
    await gymClass.remove();
    res.json({ message: 'Class deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete class', error: err.message });
  }
}; 