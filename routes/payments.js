const express = require('express');
const { body, validationResult } = require('express-validator');
let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}
const Order = require('../models/Order');
const { authenticate } = require('../middleware/auth');
const { sendPaymentConfirmationEmail } = require('../utils/email');

const router = express.Router();

// Validation middleware
const validatePayment = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('paymentMethod').isIn(['stripe', 'momo', 'zalo_pay', 'bank_transfer']).withMessage('Valid payment method is required')
];

const validateStripePayment = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('paymentMethodId').isString().withMessage('Payment method ID is required')
];

// Create payment intent for Stripe
router.post('/create-payment-intent', authenticate, validateStripePayment, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({
        success: false,
        message: 'Stripe payment is not configured'
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderId, paymentMethodId } = req.body;
    const user = req.user;

    // Find order
    const order = await Order.findById(orderId).populate('user', 'email firstName lastName');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot pay for cancelled order'
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Convert to cents
      currency: 'vnd',
      customer: user.stripeCustomerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      metadata: {
        orderId: orderId.toString(),
        userId: user._id.toString()
      }
    });

    // Update order with payment intent ID
    order.paymentIntentId = paymentIntent.id;
    order.paymentMethod = 'stripe';
    await order.save();

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action'
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm Stripe payment
router.post('/confirm-stripe-payment', authenticate, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({
        success: false,
        message: 'Stripe payment is not configured'
      });
    }
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      // Find and update order
      const order = await Order.findOne({ paymentIntentId }).populate('user', 'email');
      if (order) {
        order.paymentStatus = 'paid';
        order.paymentDate = new Date();
        order.timeline.push({
          status: 'paid',
          note: 'Payment confirmed successfully',
          timestamp: new Date()
        });
        await order.save();

        // Send confirmation email
        try {
          await sendPaymentConfirmationEmail(order.user.email, order);
        } catch (emailError) {
          console.error('Payment confirmation email failed:', emailError);
        }
      }

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          status: 'succeeded',
          paymentIntentId
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Payment not completed',
        data: {
          status: paymentIntent.status
        }
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Process MoMo payment
router.post('/momo-payment', authenticate, validatePayment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderId } = req.body;
    const user = req.user;

    // Find order
    const order = await Order.findById(orderId).populate('user', 'email firstName lastName');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    // Generate MoMo payment URL (simplified implementation)
    // In production, you would integrate with MoMo's actual API
    const momoOrderId = `MOMO${Date.now()}`;
    const amount = Math.round(order.total);
    const orderInfo = `Thanh toan don hang ${order.orderNumber}`;
    
    // Update order with MoMo reference
    order.paymentMethod = 'momo';
    order.paymentReference = momoOrderId;
    await order.save();

    // Mock MoMo payment URL (in production, this would be generated by MoMo API)
    const momoPaymentUrl = `${process.env.FRONTEND_URL}/payment/momo-redirect?orderId=${orderId}&momoOrderId=${momoOrderId}`;

    res.json({
      success: true,
      data: {
        paymentUrl: momoPaymentUrl,
        orderId: momoOrderId,
        amount,
        orderInfo
      }
    });
  } catch (error) {
    console.error('MoMo payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing MoMo payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Process ZaloPay payment
router.post('/zalo-payment', authenticate, validatePayment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderId } = req.body;
    const user = req.user;

    // Find order
    const order = await Order.findById(orderId).populate('user', 'email firstName lastName');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    // Generate ZaloPay payment URL (simplified implementation)
    // In production, you would integrate with ZaloPay's actual API
    const zaloOrderId = `ZALO${Date.now()}`;
    const amount = Math.round(order.total);
    const orderInfo = `Thanh toan don hang ${order.orderNumber}`;
    
    // Update order with ZaloPay reference
    order.paymentMethod = 'zalo_pay';
    order.paymentReference = zaloOrderId;
    await order.save();

    // Mock ZaloPay payment URL (in production, this would be generated by ZaloPay API)
    const zaloPaymentUrl = `${process.env.FRONTEND_URL}/payment/zalo-redirect?orderId=${orderId}&zaloOrderId=${zaloOrderId}`;

    res.json({
      success: true,
      data: {
        paymentUrl: zaloPaymentUrl,
        orderId: zaloOrderId,
        amount,
        orderInfo
      }
    });
  } catch (error) {
    console.error('ZaloPay payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing ZaloPay payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Process bank transfer payment
router.post('/bank-transfer', authenticate, validatePayment, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderId, bankName, accountNumber, accountName } = req.body;
    const user = req.user;

    // Find order
    const order = await Order.findById(orderId).populate('user', 'email firstName lastName');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if order can be paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    // Update order with bank transfer information
    order.paymentMethod = 'bank_transfer';
    order.paymentStatus = 'pending';
    order.bankTransferInfo = {
      bankName,
      accountNumber,
      accountName,
      transferDate: new Date()
    };
    order.timeline.push({
      status: 'pending_payment',
      note: 'Chờ xác nhận chuyển khoản ngân hàng',
      timestamp: new Date()
    });
    await order.save();

    res.json({
      success: true,
      message: 'Bank transfer payment initiated. Please complete the transfer and wait for confirmation.',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        bankInfo: {
          bankName: process.env.BANK_NAME,
          accountNumber: process.env.BANK_ACCOUNT_NUMBER,
          accountName: process.env.BANK_ACCOUNT_NAME
        }
      }
    });
  } catch (error) {
    console.error('Bank transfer payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing bank transfer payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm bank transfer payment (admin only)
router.post('/confirm-bank-transfer/:orderId', authenticate, async (req, res) => {
  try {
    // Check if user is admin (simplified check)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { orderId } = req.params;
    const { note } = req.body;

    const order = await Order.findById(orderId).populate('user', 'email');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentMethod !== 'bank_transfer') {
      return res.status(400).json({
        success: false,
        message: 'Order is not a bank transfer payment'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been paid'
      });
    }

    // Confirm payment
    order.paymentStatus = 'paid';
    order.paymentDate = new Date();
    order.timeline.push({
      status: 'paid',
      note: note || 'Bank transfer payment confirmed',
      timestamp: new Date()
    });
    await order.save();

    // Send confirmation email
    try {
      await sendPaymentConfirmationEmail(order.user.email, order);
    } catch (emailError) {
      console.error('Payment confirmation email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Bank transfer payment confirmed successfully',
      data: order
    });
  } catch (error) {
    console.error('Confirm bank transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming bank transfer payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get payment methods configuration
router.get('/methods', (req, res) => {
  try {
    const paymentMethods = {
      stripe: {
        enabled: !!process.env.STRIPE_PUBLISHABLE_KEY,
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or other cards',
        icon: '💳'
      },
      momo: {
        enabled: !!process.env.MOMO_ENABLED,
        name: 'MoMo Wallet',
        description: 'Pay with MoMo e-wallet',
        icon: '📱'
      },
      zalo_pay: {
        enabled: !!process.env.ZALO_PAY_ENABLED,
        name: 'ZaloPay',
        description: 'Pay with ZaloPay e-wallet',
        icon: '💰'
      },
      bank_transfer: {
        enabled: !!process.env.BANK_TRANSFER_ENABLED,
        name: 'Bank Transfer',
        description: 'Transfer to our bank account',
        icon: '🏦',
        bankInfo: {
          bankName: process.env.BANK_NAME,
          accountNumber: process.env.BANK_ACCOUNT_NUMBER,
          accountName: process.env.BANK_ACCOUNT_NAME
        }
      },
      cod: {
        enabled: !!process.env.COD_ENABLED,
        name: 'Cash on Delivery',
        description: 'Pay when you receive the order',
        icon: '💵'
      }
    };

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Webhook for Stripe events
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(501).json({
      error: 'Stripe is not configured'
    });
  }
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Find and update order
      const order = await Order.findOne({ paymentIntentId: paymentIntent.id }).populate('user', 'email');
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.paymentDate = new Date();
        order.timeline.push({
          status: 'paid',
          note: 'Payment confirmed via Stripe webhook',
          timestamp: new Date()
        });
        await order.save();

        // Send confirmation email
        try {
          await sendPaymentConfirmationEmail(order.user.email, order);
        } catch (emailError) {
          console.error('Webhook payment confirmation email failed:', emailError);
        }
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      // Find and update order
      const failedOrder = await Order.findOne({ paymentIntentId: failedPayment.id });
      if (failedOrder && failedOrder.paymentStatus !== 'failed') {
        failedOrder.paymentStatus = 'failed';
        failedOrder.timeline.push({
          status: 'payment_failed',
          note: 'Payment failed via Stripe',
          timestamp: new Date()
        });
        await failedOrder.save();
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;