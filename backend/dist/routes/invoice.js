"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
exports.default = router;
//# sourceMappingURL=invoice.js.map