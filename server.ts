import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environmental variables
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Construct clean Supabase URL from possible simple reference
const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = supabaseUrlRaw.includes('.') ? supabaseUrlRaw : (supabaseUrlRaw ? `https://${supabaseUrlRaw}.supabase.co` : '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Instantiate a secure administrative Supabase client
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// API: Health probe
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// API: Server-side Paystack Payment Verification
app.post('/api/paystack/verify', async (req, res) => {
  try {
    const { reference, orderDetails, type } = req.body;
    
    if (!reference) {
      return res.status(400).json({ error: 'Missing payment reference' });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(500).json({ error: 'Paystack configuration error on server' });
    }

    // Call Paystack verification API securely
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return res.status(400).json({ 
        error: 'Payment verification failed', 
        details: data.message || 'Transaction is pending or failed' 
      });
    }

    // Amount is in pesewas (100 pesewas = 1 GHS)
    const paidAmount = data.data.amount / 100;

    // Secure database update using service-role administrative bypass
    if (supabaseAdmin) {
      if (type === 'add_funds') {
        const { userId, userPhone } = orderDetails;
        
        // 1. Log transaction
        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          amount: paidAmount,
          type: 'deposit',
          status: 'completed',
          reference: reference,
          timestamp: new Date().toISOString()
        });

        // 2. Load user's current record
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id, earned_ghs, completed_jobs_count')
          .eq('phone', userPhone)
          .single();

        if (userData) {
          // Increment wallet/earnedGHS
          const newBalance = (userData.earned_ghs || 0) + paidAmount;
          await supabaseAdmin
            .from('users')
            .update({ earned_ghs: newBalance })
            .eq('phone', userPhone);
        }
        
        return res.json({ 
          success: true, 
          message: `Wallet successfully funded with GHS ${paidAmount.toFixed(2)}`,
          amount: paidAmount
        });

      } else {
        // Default Order Purchase
        const { 
          serviceId, 
          title, 
          price, 
          priceType, 
          sellerName, 
          buyerName, 
          imageUrl 
        } = orderDetails;

        // 1. Create Order in Escrow (holding status)
        const orderId = `o_pay_${Date.now()}`;
        const newOrder = {
          id: orderId,
          service_id: serviceId,
          title: title,
          price: price,
          price_type: priceType,
          seller_name: sellerName,
          buyer_name: buyerName,
          status: 'in_progress',
          escrow_status: 'holding',
          image_url: imageUrl,
          timestamp: new Date().toISOString()
        };

        const { error: orderError } = await supabaseAdmin.from('orders').insert(newOrder);
        if (orderError) throw orderError;

        // 2. Record transactional escrow ledger
        await supabaseAdmin.from('transactions').insert({
          user_id: buyerName, // Tracked with buyer name identifier/id
          amount: price,
          type: 'escrow',
          status: 'completed',
          reference: reference,
          timestamp: new Date().toISOString()
        });

        // 3. Create Automated transaction record for future reference
        return res.json({ 
          success: true, 
          message: 'Escrow funded successfully', 
          order: newOrder 
        });
      }
    } else {
      // In case Supabase credentials aren't deployed, fallback to success feedback
      return res.json({ 
        success: true, 
        message: 'Payment verified (Developer admin connection offline)', 
        amount: paidAmount 
      });
    }

  } catch (err: any) {
    console.error('Server side payment verification error:', err);
    res.status(500).json({ error: 'Server error during verification', details: err.message });
  }
});

// Configure Vite middleware or Static files build serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FULL-STACK BACKEND] Server running on port ${PORT}`);
  });
}

startServer();
