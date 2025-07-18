import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { getDb } from '../services/firebase';

const router = Router();

// Subscription plans
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
      invoicesPerMonth: -1, // unlimited
      storageGB: 100
    }
  }
};

// Get available plans
router.get('/plans', (req, res) => {
  res.json({ plans: SUBSCRIPTION_PLANS });
});

// Get user's current subscription
router.get('/current', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data();

    const currentPlan = userData?.subscription || 'free';
    const planDetails = SUBSCRIPTION_PLANS[currentPlan as keyof typeof SUBSCRIPTION_PLANS];

    // Get usage statistics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const invoicesSnapshot = await db.collection('invoices').get();
    const invoicesThisMonth = invoicesSnapshot.docs.filter((doc: any) => 
      doc.data()?.userId === req.user!.uid && 
      new Date(doc.data()?.createdAt) >= currentMonth
    ).length;

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
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Upgrade subscription
router.post('/upgrade', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const { plan } = req.body;

    if (!plan || !SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      res.status(400).json({ error: 'Invalid plan' });
      return;
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data();
    const currentPlan = userData?.subscription || 'free';

    // Check if upgrade is valid
    const planOrder = ['free', 'pro', 'premium'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const newIndex = planOrder.indexOf(plan);

    if (newIndex <= currentIndex) {
      res.status(400).json({ error: 'Can only upgrade to higher tier' });
      return;
    }

    // In production, you would integrate with Stripe or similar payment processor
    // For now, we'll just update the subscription
    await db.collection('users').doc(req.user!.uid).update({
      subscription: plan,
      subscriptionUpdatedAt: new Date()
    });

    // Create subscription record
    await db.collection('subscriptions').add({
      userId: req.user!.uid,
      plan,
      status: 'active',
      startedAt: new Date(),
      price: SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS].price
    });

    res.json({ 
      message: 'Subscription upgraded successfully',
      newPlan: plan
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user!.uid).get();
    const userData = userDoc.data();
    const currentPlan = userData?.subscription || 'free';

    if (currentPlan === 'free') {
      res.status(400).json({ error: 'No active subscription to cancel' });
      return;
    }

    // In production, you would cancel the subscription with your payment processor
    await db.collection('users').doc(req.user!.uid).update({
      subscription: 'free',
      subscriptionCancelledAt: new Date()
    });

    // Update subscription record
    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    const activeSubscription = subscriptionsSnapshot.docs.find((doc: any) => 
      doc.data()?.userId === req.user!.uid && doc.data()?.status === 'active'
    );

    if (activeSubscription) {
      await db.collection('subscriptions').doc(activeSubscription.id).update({
        status: 'cancelled',
        cancelledAt: new Date()
      });
    }

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get subscription history
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const subscriptionsSnapshot = await db.collection('subscriptions').get();

    const history = subscriptionsSnapshot.docs
      .filter((doc: any) => doc.data()?.userId === req.user!.uid)
      .sort((a: any, b: any) => new Date(b.data()?.startedAt).getTime() - new Date(a.data()?.startedAt).getTime())
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

    res.json({ history });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ error: 'Failed to get subscription history' });
  }
});

export default router; 