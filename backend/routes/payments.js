const express = require('express');
const Stripe = require('stripe');
const Transaction = require('../models/Transaction');

const router = express.Router();

const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const isLikelyValidStripeSecret = (value) => typeof value === 'string' && /^sk_(live|test)_[A-Za-z0-9]+$/.test(value.trim());

router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    enabled: !!stripe,
    mode: process.env.NODE_ENV || 'development'
  });
});

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, donorName, email, description } = req.body || {};

    if (!stripeSecretKey) {
      return res.status(400).json({
        success: false,
        error: 'Stripe is not configured on this server. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.'
      });
    }

    if (!isLikelyValidStripeSecret(stripeSecretKey)) {
      return res.status(400).json({
        success: false,
        error: 'The Stripe secret key in backend/.env is invalid or incomplete. Copy the real secret key from the Stripe dashboard and restart the backend.'
      });
    }

    if (!stripe) {
      return res.status(400).json({
        success: false,
        error: 'Stripe client could not be initialised. Check the secret key and backend configuration.'
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid donation amount is required.'
      });
    }

    const amountInCents = Math.round(numericAmount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: amountInCents,
          product_data: {
            name: description || 'Church donation',
            description: donorName ? `Donation from ${donorName}` : 'Church donation'
          }
        }
      }],
      success_url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}?donation=success`,
      cancel_url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}?donation=cancelled`,
      customer_email: email || undefined,
      metadata: {
        donorName: donorName || '',
        description: description || 'Online card donation',
        paymentMethod: 'card'
      }
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to create Stripe checkout session.',
      details: error.message
    });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return res.status(400).json({ error: 'Stripe webhook is not configured.' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const amount = Number(session.amount_total || 0) / 100;
    const donorName = session.metadata?.donorName || 'Anonymous donor';
    const description = session.metadata?.description || 'Church donation';

    try {
      const existing = await Transaction.findOne({ reference: session.id });
      if (!existing) {
        await Transaction.create({
          type: 'income',
          description: `${description} (Stripe online card donation)`,
          category: 'donation',
          amount,
          payee: {
            type: 'external',
            name: donorName,
            email: session.customer_details?.email || '',
            phone: ''
          },
          paymentMethod: 'card',
          reference: session.id,
          notes: `Stripe checkout session completed on ${new Date().toISOString()}`,
          date: new Date()
        });
      }
    } catch (dbError) {
      console.error('Failed to save Stripe donation transaction:', dbError);
    }

    console.log('✅ Stripe donation completed:', { sessionId: session.id, amount, donorName });
  }

  res.json({ received: true });
});

module.exports = router;
