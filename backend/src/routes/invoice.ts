import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Get invoices endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get invoice endpoint' });
});

router.post('/process', (req, res) => {
  res.json({ message: 'Process invoices endpoint' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete invoice endpoint' });
});

router.get('/stats/summary', (req, res) => {
  res.json({ message: 'Get stats endpoint' });
});

export default router; 