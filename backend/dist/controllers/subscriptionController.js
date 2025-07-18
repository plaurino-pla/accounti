"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionController = void 0;
const stripe_1 = __importDefault(require("stripe"));
const logger_1 = require("../utils/logger");
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
});
exports.subscriptionController = {
    getPlans: async (req, res) => {
        try {
            const plans = [
                {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    currency: 'USD',
                    billingCycle: 'monthly',
                    features: [
                        '20 invoices per month',
                        'Daily sync',
                        'Basic OCR'
                    ],
                    limits: {
                        monthlyInvoices: 20,
                        syncFrequency: 'daily'
                    }
                },
                {
                    id: 'pro',
                    name: 'Pro',
                    price: 29,
                    currency: 'USD',
                    billingCycle: 'monthly',
                    features: [
                        '1,000 invoices per month',
                        'Every 6 hours sync',
                        'Advanced OCR',
                        'CSV Export'
                    ],
                    limits: {
                        monthlyInvoices: 1000,
                        syncFrequency: '6h'
                    }
                },
                {
                    id: 'premium',
                    name: 'Premium',
                    price: 99,
                    currency: 'USD',
                    billingCycle: 'monthly',
                    features: [
                        'Unlimited invoices',
                        'Hourly sync',
                        'Priority OCR',
                        'Priority support',
                        'API access'
                    ],
                    limits: {
                        monthlyInvoices: -1,
                        syncFrequency: 'hourly'
                    }
                }
            ];
            res.json({ plans });
        }
        catch (error) {
            logger_1.logger.error('Error getting plans:', error);
            res.status(500).json({ error: 'Failed to get plans' });
        }
    },
    createCheckoutSession: async (req, res) => {
        try {
            const { planId, successUrl, cancelUrl } = req.body;
            if (planId === 'free') {
                return res.status(400).json({ error: 'Free plan does not require checkout' });
            }
            const priceId = process.env[`STRIPE_PRICE_ID_${planId.toUpperCase()}`];
            if (!priceId) {
                return res.status(400).json({ error: 'Invalid plan' });
            }
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: req.user.email,
                metadata: {
                    userId: req.user.id,
                    planId
                }
            });
            res.json({
                sessionId: session.id,
                url: session.url
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Failed to create checkout session' });
        }
    },
    createPortalSession: async (req, res) => {
        try {
            res.json({
                url: 'https://billing.stripe.com/session/mock'
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating portal session:', error);
            res.status(500).json({ error: 'Failed to create portal session' });
        }
    },
    getCurrentSubscription: async (req, res) => {
        try {
            const user = req.user;
            res.json({
                planId: user.subscription,
                status: 'active',
                currentPeriodStart: new Date().toISOString(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                cancelAtPeriodEnd: false,
                usage: {
                    invoicesThisMonth: 0,
                    monthlyLimit: user.subscription === 'free' ? 20 : user.subscription === 'pro' ? 1000 : -1
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting current subscription:', error);
            res.status(500).json({ error: 'Failed to get subscription' });
        }
    },
    handleWebhook: async (req, res) => {
        try {
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            let event;
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            }
            catch (err) {
                logger_1.logger.error('Webhook signature verification failed:', err);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    logger_1.logger.info('Subscription updated:', event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    logger_1.logger.info('Subscription cancelled:', event.data.object);
                    break;
                default:
                    logger_1.logger.info(`Unhandled event type: ${event.type}`);
            }
            res.json({ received: true });
        }
        catch (error) {
            logger_1.logger.error('Error handling webhook:', error);
            res.status(500).json({ error: 'Webhook handling failed' });
        }
    }
};
//# sourceMappingURL=subscriptionController.js.map