import express from 'express';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
      console.warn('[FitWolf] STRIPE_SECRET_KEY is missing. Add it to your .env file. Payments will not work.');
      return null;
    }
    if (key.startsWith('pk_')) {
      console.error('[FitWolf] STRIPE_SECRET_KEY starts with pk_ (publishable key). Use the secret key (sk_...) instead.');
      return null;
    }

    stripeClient = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }
  return stripeClient;
}

let transporter: nodemailer.Transporter | null = null;
function getMailer() {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      console.warn('SMTP_USER or SMTP_PASS missing. Emails will not be sent.');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user, pass },
    });
  }
  return transporter;
}

// Webhook endpoint needs raw body
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(500).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Fallback for testing without webhook secret
      event = JSON.parse(req.body.toString());
      console.warn('Warning: Webhook signature verification bypassed because STRIPE_WEBHOOK_SECRET is not set.');
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve line items to know what was bought
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const purchasedItems = lineItems.data.map(item => `${item.quantity}x ${item.description}`).join('\n');

    let paymentMethodDetails = 'Niet beschikbaar';
    if (session.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        if (paymentIntent.latest_charge) {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          if (charge.payment_method_details) {
            const pmd = charge.payment_method_details;
            if (pmd.type === 'card' && pmd.card) {
              paymentMethodDetails = `Creditcard eindigend op ${pmd.card.last4} (${pmd.card.brand})`;
            } else if (pmd.type === 'ideal' && pmd.ideal) {
              paymentMethodDetails = `iDEAL (${pmd.ideal.bank || 'Onbekende bank'})`;
            } else if (pmd.type === 'bancontact' && pmd.bancontact) {
              paymentMethodDetails = `Bancontact`;
            } else if (pmd.type === 'paypal') {
              paymentMethodDetails = `PayPal (${pmd.paypal?.payer_email || ''})`;
            } else {
              paymentMethodDetails = pmd.type;
            }
          }
        }
      } catch (e) {
        console.error('Could not retrieve payment method details', e);
      }
    }

    const mailer = getMailer();
    if (mailer) {
      try {
        await mailer.sendMail({
          from: process.env.SMTP_USER || 'noreply@fitwolf.com',
          to: 'info@metzworks.nl',
          subject: `Nieuwe Bestelling van ${session.customer_details?.name}`,
          text: `
Nieuwe betaling ontvangen via FitWolf Armory!

Klant: ${session.customer_details?.name}
Email: ${session.customer_details?.email}
Telefoon: ${session.customer_details?.phone || 'Niet opgegeven'}
Bedrag: ${(session.amount_total! / 100).toFixed(2)} ${session.currency?.toUpperCase()}

Betaalmethode / Rekening:
${paymentMethodDetails}

Adres:
${session.customer_details?.address?.line1 || ''} ${session.customer_details?.address?.line2 || ''}
${session.customer_details?.address?.postal_code || ''} ${session.customer_details?.address?.city || ''}
${session.customer_details?.address?.state || ''} ${session.customer_details?.address?.country || ''}

Gekochte Producten:
${purchasedItems}

Bekijk het Stripe Dashboard voor meer details.
          `
        });
        console.log('Email sent to info@metzworks.nl');
      } catch (error) {
        console.error('Error sending email:', error);
      }
    } else {
      console.log('Payment successful, but email not sent because SMTP is not configured.');
      console.log('Purchased:', purchasedItems);
    }
  }

  res.json({received: true});
});

app.use(express.json());
app.use(cors());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.' });
    }

    const { items, successUrl, cancelUrl } = req.body;

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      shipping_address_collection: {
        allowed_countries: ['NL', 'BE', 'DE', 'FR', 'GB', 'US'],
      },
      phone_number_collection: {
        enabled: true,
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────
function getOnboardingEmailHtml(day: string, username: string): { subject: string; html: string } {
  const templates: Record<string, { subject: string; html: string }> = {
    day0: {
      subject: `[SYSTEEM] Welkom, ${username}. Jouw jager-profiel is aangemaakt.`,
      html: `
        <div style="background:#030303;color:#fff;font-family:monospace;padding:40px;max-width:600px">
          <h1 style="color:#FF2A2A;letter-spacing:0.3em;text-transform:uppercase">SYSTEEM ONLINE</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.2em">Jager-ID: ${username}</p>
          <hr style="border-color:#222;margin:24px 0">
          <p style="color:#ccc">Je profiel is aangemaakt. De <strong style="color:#FF2A2A">FitWolf Daily Command</strong> wacht op je eerste rapport.</p>
          <p style="color:#ccc">Dag 1 begint nu. Log je eerste training en verdien je eerste XP.</p>
          <p style="color:#888;font-size:10px;margin-top:40px">🐺 De Systeemgod observeert.</p>
        </div>`
    },
    day3: {
      subject: `[FENRIR] Dag 3 — Je eerste week test begint.`,
      html: `
        <div style="background:#030303;color:#fff;font-family:monospace;padding:40px;max-width:600px">
          <h1 style="color:#FF2A2A;letter-spacing:0.3em;text-transform:uppercase">DAG 3 RAPPORT</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.2em">Jager: ${username}</p>
          <hr style="border-color:#222;margin:24px 0">
          <p style="color:#ccc">3 dagen. Elke E-Rank Hunter begint hier.</p>
          <p style="color:#ccc">Maar slechts <strong style="color:#00FF88">12% haalt week 2.</strong> Jij gaat dat halen.</p>
          <p style="color:#ccc">Open de app. Log je training. Verhoog je gewicht met 2.5kg.</p>
          <p style="color:#888;font-size:10px;margin-top:40px">🔥 Progressive overload of stagnatie — er is geen tussenweg.</p>
        </div>`
    },
    day7: {
      subject: `[SYSTEEM] Week 1 voltooid. Jouw stats wachten op analyse.`,
      html: `
        <div style="background:#030303;color:#fff;font-family:monospace;padding:40px;max-width:600px">
          <h1 style="color:#FFB800;letter-spacing:0.3em;text-transform:uppercase">WEEK 1: COMPLETE</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.2em">Jager: ${username}</p>
          <hr style="border-color:#222;margin:24px 0">
          <p style="color:#ccc">Één week geleden bestond jouw trainingssysteem niet.</p>
          <p style="color:#ccc">Nu heb je data. Nu heb je een baseline. Nu begint de echte progressie.</p>
          <p style="color:#ccc">Week 2 wordt <strong style="color:#FFB800">zwaarder</strong>. Dat is exact wat je wilt.</p>
          <p style="color:#888;font-size:10px;margin-top:40px">💪 D-Rank is binnen bereik.</p>
        </div>`
    },
    day14: {
      subject: `[UPGRADE] 14 dagen. Het is tijd voor Wolf Tier.`,
      html: `
        <div style="background:#030303;color:#fff;font-family:monospace;padding:40px;max-width:600px">
          <h1 style="color:#FF2A2A;letter-spacing:0.3em;text-transform:uppercase">14 DAGEN VOLTOOID</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.2em">Jager: ${username}</p>
          <hr style="border-color:#222;margin:24px 0">
          <p style="color:#ccc">Je hebt bewezen dat je terugkomt. Dat is alles wat de Wolf Pack van je vraagt.</p>
          <p style="color:#ccc">Upgrade naar <strong style="color:#FF2A2A">Wolf Tier (€47/maand)</strong> en ontgrendel:</p>
          <ul style="color:#aaa;line-height:2">
            <li>Alle Heavy Duty Advanced Protocollen</li>
            <li>Volledige Guild & Raid Boss toegang</li>
            <li>Custom Workout Builder</li>
            <li>Volledige Mentzer Codex</li>
          </ul>
          <p style="color:#888;font-size:10px;margin-top:40px">🐺 De Pack wacht op je.</p>
        </div>`
    }
  };
  return templates[day] || { subject: 'FitWolf Update', html: '<p>Update van FitWolf.</p>' };
}

// ─── API: Onboarding Emails ────────────────────────────────────────────────────
app.post('/api/send-onboarding-email', async (req, res) => {
  const { email, username, day } = req.body;
  if (!email || !username || !day) return res.status(400).json({ error: 'Missing fields' });

  const mailer = getMailer();
  if (!mailer) return res.status(503).json({ error: 'SMTP not configured' });

  const template = getOnboardingEmailHtml(day, username);
  try {
    await mailer.sendMail({
      from: `"FitWolf Systeem" <${process.env.SMTP_USER}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    });
    res.json({ success: true, day });
  } catch (err: any) {
    console.error('[FitWolf] Onboarding email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Referral Email ───────────────────────────────────────────────────────
app.post('/api/send-referral-email', async (req, res) => {
  const { toEmail, fromUsername, referralCode } = req.body;
  if (!toEmail || !fromUsername || !referralCode) return res.status(400).json({ error: 'Missing fields' });

  const mailer = getMailer();
  if (!mailer) return res.status(503).json({ error: 'SMTP not configured' });

  const appUrl = process.env.APP_URL || 'https://fitwolf.app';

  try {
    await mailer.sendMail({
      from: `"FitWolf" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${fromUsername} nodigt je uit voor FitWolf — Jager Systeem`,
      html: `
        <div style="background:#030303;color:#fff;font-family:monospace;padding:40px;max-width:600px">
          <h1 style="color:#FF2A2A;letter-spacing:0.3em;text-transform:uppercase">UITNODIGING ONTVANGEN</h1>
          <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.2em">Van: ${fromUsername}</p>
          <hr style="border-color:#222;margin:24px 0">
          <p style="color:#ccc"><strong style="color:#FF2A2A">${fromUsername}</strong> heeft je uitgenodigd om lid te worden van de FitWolf Wolf Pack.</p>
          <p style="color:#ccc">Gebruik onderstaande code bij registratie voor <strong style="color:#00FF88">7 dagen gratis Wolf Tier</strong>:</p>
          <div style="background:#111;border:1px solid #FF2A2A;padding:16px;text-align:center;margin:24px 0">
            <span style="color:#FF2A2A;font-size:24px;font-weight:900;letter-spacing:0.4em">${referralCode}</span>
          </div>
          <a href="${appUrl}?ref=${referralCode}" style="display:block;background:#FF2A2A;color:#000;text-align:center;padding:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;text-decoration:none">
            SYSTEEM INITIALISEREN →
          </a>
          <p style="color:#888;font-size:10px;margin-top:40px">🐺 ${fromUsername} krijgt ook 7 dagen gratis bij jouw aanmelding.</p>
        </div>`
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Subscription Cancel ─────────────────────────────────────────────────
app.post('/api/cancel-subscription', async (req, res) => {
  const { subscriptionId } = req.body;
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const cancelled = await stripe.subscriptions.cancel(subscriptionId);
    res.json({ success: true, status: cancelled.status });
  } catch (err: any) {
    console.error('[FitWolf] Cancel subscription error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Get Invoices ─────────────────────────────────────────────────────────
app.post('/api/get-invoices', async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: 'customerId required' });

  const stripe = getStripe();
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
    const mapped = invoices.data.map(inv => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toLocaleDateString('nl-NL'),
      amount: (inv.amount_paid / 100).toFixed(2),
      currency: inv.currency.toUpperCase(),
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
    }));
    res.json({ invoices: mapped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
