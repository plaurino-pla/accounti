"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
exports.default = router;
//# sourceMappingURL=user.js.map