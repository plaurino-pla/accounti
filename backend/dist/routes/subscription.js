"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const firebase_1 = require("../services/firebase");
const router = (0, express_1.Router)();
const SUBSCRIPTION_PLANS = {
    free: {
        name: 'Free',
        price: 0,
        features: [
            'Up to 10 invoices per month',
            'Basic OCR processing',
            'Email support'
        ],
        limits: {
            invoicesPerMonth: 10,
            storageGB: 1
        }
    },
    pro: {
        name: 'Pro',
        price: 29,
        features: [
            'Up to 100 invoices per month',
            'Advanced OCR processing',
            'Priority support',
            'Export to Excel/CSV',
            'Custom categories'
        ],
        limits: {
            invoicesPerMonth: 100,
            storageGB: 10
        }
    },
    premium: {
        name: 'Premium',
        price: 99,
        features: [
            'Unlimited invoices',
            'AI-powered processing',
            '24/7 support',
            'Advanced analytics',
            'API access',
            'Team collaboration'
        ],
        limits: {
            invoicesPerMonth: -1,
            storageGB: 100
        }
    }
};
router.get('/plans', (req, res) => {
    res.json({ plans: SUBSCRIPTION_PLANS });
});
router.get('/current', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = (0, firebase_1.getDb)();
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();
        const currentPlan = userData?.subscription || 'free';
        const planDetails = SUBSCRIPTION_PLANS[currentPlan];
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const invoicesSnapshot = await db.collection('invoices').get();
        const invoicesThisMonth = invoicesSnapshot.docs.filter((doc) => doc.data()?.userId === req.user.uid &&
            new Date(doc.data()?.createdAt) >= currentMonth).length;
        res.json({
            currentPlan,
            planDetails,
            usage: {
                invoicesThisMonth,
                invoicesLimit: planDetails.limits.invoicesPerMonth
            },
            canUpgrade: currentPlan !== 'premium',
            canDowngrade: currentPlan !== 'free'
        });
    }
    catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});
router.post('/upgrade', auth_1.authenticateToken, async (req, res) => {
    try {
        const { plan } = req.body;
        if (!plan || !SUBSCRIPTION_PLANS[plan]) {
            res.status(400).json({ error: 'Invalid plan' });
            return;
        }
        const db = (0, firebase_1.getDb)();
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();
        const currentPlan = userData?.subscription || 'free';
        const planOrder = ['free', 'pro', 'premium'];
        const currentIndex = planOrder.indexOf(currentPlan);
        const newIndex = planOrder.indexOf(plan);
        if (newIndex <= currentIndex) {
            res.status(400).json({ error: 'Can only upgrade to higher tier' });
            return;
        }
        await db.collection('users').doc(req.user.uid).update({
            subscription: plan,
            subscriptionUpdatedAt: new Date()
        });
        await db.collection('subscriptions').add({
            userId: req.user.uid,
            plan,
            status: 'active',
            startedAt: new Date(),
            price: SUBSCRIPTION_PLANS[plan].price
        });
        res.json({
            message: 'Subscription upgraded successfully',
            newPlan: plan
        });
    }
    catch (error) {
        console.error('Upgrade subscription error:', error);
        res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
});
router.post('/cancel', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = (0, firebase_1.getDb)();
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();
        const currentPlan = userData?.subscription || 'free';
        if (currentPlan === 'free') {
            res.status(400).json({ error: 'No active subscription to cancel' });
            return;
        }
        await db.collection('users').doc(req.user.uid).update({
            subscription: 'free',
            subscriptionCancelledAt: new Date()
        });
        const subscriptionsSnapshot = await db.collection('subscriptions').get();
        const activeSubscription = subscriptionsSnapshot.docs.find((doc) => doc.data()?.userId === req.user.uid && doc.data()?.status === 'active');
        if (activeSubscription) {
            await db.collection('subscriptions').doc(activeSubscription.id).update({
                status: 'cancelled',
                cancelledAt: new Date()
            });
        }
        res.json({ message: 'Subscription cancelled successfully' });
    }
    catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = (0, firebase_1.getDb)();
        const subscriptionsSnapshot = await db.collection('subscriptions').get();
        const history = subscriptionsSnapshot.docs
            .filter((doc) => doc.data()?.userId === req.user.uid)
            .sort((a, b) => new Date(b.data()?.startedAt).getTime() - new Date(a.data()?.startedAt).getTime())
            .map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json({ history });
    }
    catch (error) {
        console.error('Get subscription history error:', error);
        res.status(500).json({ error: 'Failed to get subscription history' });
    }
});
exports.default = router;
//# sourceMappingURL=subscription.js.map