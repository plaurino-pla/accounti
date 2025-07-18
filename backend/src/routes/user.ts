import { Router } from 'express';

const router = Router();

router.get('/profile', (req, res) => {
  res.json({ message: 'User profile endpoint' });
});

router.put('/profile', (req, res) => {
  res.json({ message: 'Update profile endpoint' });
});

router.get('/configuration', (req, res) => {
  res.json({ message: 'Get configuration endpoint' });
});

router.put('/configuration', (req, res) => {
  res.json({ message: 'Update configuration endpoint' });
});

export default router; 