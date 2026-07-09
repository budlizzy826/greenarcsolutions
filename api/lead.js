// Same-origin lead relay.
// The browser posts here (no CORS), and this forwards the lead to the n8n
// webhook server-side (no browser CORS, secret never exposed to the client).
// n8n then texts the lead back within 60s and emails the full lead to Adam.

const N8N_WEBHOOK_URL = 'https://n8n.greenarcsolutions.com/webhook/lead-intake';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const body = req.body || {};

    // Honeypot — pretend success without forwarding, to fool bots.
    if (body._gotcha) {
        return res.status(200).json({ ok: true });
    }

    // Minimal validation — name, email, and phone are required by the form.
    if (!body.name || !body.email || !body.phone) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // Secret stays server-side. Prefer an env var; falls back to the existing
    // value so the form keeps working. Rotate this and set N8N_WEBHOOK_SECRET.
    const secret = process.env.N8N_WEBHOOK_SECRET
        || 'a2d08b11e0f45be255becfc4e93af8056202b1b38bbc67a5411ad1d41094d1e8';

    try {
        const upstream = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': secret
            },
            body: JSON.stringify({
                name: body.name,
                email: body.email,
                phone: body.phone,
                company: body.company || null,
                service: body.service_interest || null,
                message: body.message || null,
                source: 'greenarcsolutions.com',
                source_page: body.source_page || null,
                sms_consent: body.sms_consent === true,
                consent_timestamp: body.consent_timestamp || null
            })
        });

        if (!upstream.ok) {
            return res.status(502).json({ ok: false, error: 'Upstream ' + upstream.status });
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(502).json({ ok: false, error: 'Forward failed' });
    }
}
