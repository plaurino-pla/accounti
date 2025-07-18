"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post('/gmail', (req, res) => {
    res.json({ message: 'Gmail webhook endpoint' });
});
router.post('/stripe', (req, res) => {
    res.json({ message: 'Stripe webhook endpoint' });
});
exports.default = router;
//# sourceMappingURL=webhook.js.map