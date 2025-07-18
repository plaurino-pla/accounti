"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const mockProcessInvoices = async (userId) => {
    console.log('Mock processing invoices for user:', userId);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return [
        {
            id: Date.now().toString(),
            fileName: 'Invoice-001.pdf',
            vendor: 'Office Supplies Co',
            amount: 1500.00,
            status: 'processed',
            createdAt: new Date().toISOString(),
            emailSubject: 'Invoice from Office Supplies Co',
            emailDate: new Date().toISOString()
        },
        {
            id: (Date.now() + 1).toString(),
            fileName: 'Invoice-002.pdf',
            vendor: 'Tech Solutions Inc',
            amount: 2500.00,
            status: 'processed',
            createdAt: new Date().toISOString(),
            emailSubject: 'Invoice from Tech Solutions Inc',
            emailDate: new Date(Date.now() - 86400000).toISOString()
        }
    ];
};
router.post('/scan-gmail', async (req, res) => {
    try {
        const { userId, accessToken } = req.body;
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock Gmail scanning for user:', userId);
            const processedInvoices = await mockProcessInvoices(userId);
            return res.json({
                success: true,
                message: 'Gmail scanned successfully',
                invoices: processedInvoices,
                totalFound: processedInvoices.length
            });
        }
        return res.json({ error: 'Gmail scanning not implemented in production yet' });
    }
    catch (error) {
        console.error('Gmail scanning error:', error);
        return res.status(500).json({ error: 'Failed to scan Gmail' });
    }
});
router.post('/create-spreadsheet', async (req, res) => {
    try {
        const { userId, invoices, accessToken } = req.body;
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock Google Sheets creation for user:', userId);
            const spreadsheetId = 'mock-spreadsheet-' + Date.now();
            const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
            return res.json({
                success: true,
                message: 'Spreadsheet created successfully',
                spreadsheetId,
                spreadsheetUrl,
                rowsAdded: invoices.length
            });
        }
        return res.json({ error: 'Google Sheets creation not implemented in production yet' });
    }
    catch (error) {
        console.error('Google Sheets creation error:', error);
        return res.status(500).json({ error: 'Failed to create spreadsheet' });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (process.env.NODE_ENV === 'development') {
            const mockInvoices = [
                {
                    id: '1',
                    fileName: 'Invoice-001.pdf',
                    vendor: 'Office Supplies Co',
                    amount: 1500.00,
                    status: 'processed',
                    createdAt: new Date().toISOString(),
                    emailSubject: 'Invoice from Office Supplies Co',
                    emailDate: new Date().toISOString()
                },
                {
                    id: '2',
                    fileName: 'Invoice-002.pdf',
                    vendor: 'Tech Solutions Inc',
                    amount: 2500.00,
                    status: 'processing',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    emailSubject: 'Invoice from Tech Solutions Inc',
                    emailDate: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: '3',
                    fileName: 'Invoice-003.pdf',
                    vendor: 'Marketing Agency',
                    amount: 800.00,
                    status: 'processed',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    emailSubject: 'Invoice from Marketing Agency',
                    emailDate: new Date(Date.now() - 172800000).toISOString()
                }
            ];
            return res.json(mockInvoices);
        }
        return res.json({ error: 'Get invoices not implemented in production yet' });
    }
    catch (error) {
        console.error('Get invoices error:', error);
        return res.status(500).json({ error: 'Failed to get invoices' });
    }
});
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (process.env.NODE_ENV === 'development') {
            const mockStats = {
                totalAmount: 4800.00,
                totalCount: 3,
                avgAmount: 1600.00,
                vendorStats: {
                    'Office Supplies Co': 1500.00,
                    'Tech Solutions Inc': 2500.00,
                    'Marketing Agency': 800.00
                },
                statusStats: {
                    processed: 2,
                    processing: 1,
                    failed: 0
                }
            };
            return res.json(mockStats);
        }
        return res.json({ error: 'Get stats not implemented in production yet' });
    }
    catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({ error: 'Failed to get statistics' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (process.env.NODE_ENV === 'development') {
            const mockInvoice = {
                id,
                fileName: `Invoice-${id}.pdf`,
                vendor: 'Mock Vendor',
                amount: 1500.00,
                status: 'processed',
                createdAt: new Date().toISOString(),
                emailSubject: 'Invoice from Mock Vendor',
                emailDate: new Date().toISOString(),
                extractedData: {
                    invoiceNumber: 'INV-001',
                    date: '2024-01-15',
                    dueDate: '2024-02-15',
                    items: [
                        { description: 'Office Supplies', quantity: 1, unitPrice: 1500.00, total: 1500.00 }
                    ]
                }
            };
            return res.json(mockInvoice);
        }
        return res.json({ error: 'Get invoice not implemented in production yet' });
    }
    catch (error) {
        console.error('Get invoice error:', error);
        return res.status(500).json({ error: 'Failed to get invoice' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.uid;
        const updates = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock invoice update:', { id, userId, updates });
            return res.json({
                success: true,
                message: 'Invoice updated successfully'
            });
        }
        return res.json({ error: 'Update invoice not implemented in production yet' });
    }
    catch (error) {
        console.error('Update invoice error:', error);
        return res.status(500).json({ error: 'Failed to update invoice' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        if (process.env.NODE_ENV === 'development') {
            console.log('Mock invoice deletion:', { id, userId });
            return res.json({
                success: true,
                message: 'Invoice deleted successfully'
            });
        }
        return res.json({ error: 'Delete invoice not implemented in production yet' });
    }
    catch (error) {
        console.error('Delete invoice error:', error);
        return res.status(500).json({ error: 'Failed to delete invoice' });
    }
});
exports.default = router;
//# sourceMappingURL=invoices.js.map