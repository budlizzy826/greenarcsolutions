// Same-origin lead relay → email.
// The browser posts here (no CORS); this emails the full lead to Adam via
// Web3Forms (https://web3forms.com) server-side. No database, no n8n needed.
//
// SETUP: create a free access key at https://web3forms.com (tied to
// adam@greenarcsolutions.com), then set WEB3FORMS_ACCESS_KEY in Vercel
// (or paste it into ACCESS_KEY_FALLBACK below). The key is not sensitive.

const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
const ACCESS_KEY_FALLBACK = '32fa8104-97c2-4fc8-92bc-2aadf1aa7605'; // Web3Forms key (not sensitive; prefer WEB3FORMS_ACCESS_KEY env var)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const body = req.body || {};

    // Honeypot — pretend success without sending, to fool bots.
    if (body._gotcha) {
        return res.status(200).json({ ok: true });
    }

    // Minimal validation — name, email, and phone are required by the form.
    if (!body.name || !body.email || !body.phone) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const accessKey = process.env.WEB3FORMS_ACCESS_KEY || ACCESS_KEY_FALLBACK;
    if (!accessKey) {
        return res.status(503).json({ ok: false, error: 'Email not configured' });
    }

    const service = body.service_interest || 'Not specified';
    const company = body.company || 'Not provided';

    const emailBody =
        `New lead from greenarcsolutions.com\n\n` +
        `Name:     ${body.name}\n` +
        `Email:    ${body.email}\n` +
        `Phone:    ${body.phone}\n` +
        `Company:  ${company}\n` +
        `Interest: ${service}\n\n` +
        `Message:\n${body.message || '(none)'}\n\n` +
        `— — —\n` +
        `SMS consent: ${body.sms_consent === true ? 'YES' : 'no'}\n` +
        `Consent timestamp: ${body.consent_timestamp || 'n/a'}\n` +
        `Source page: ${body.source_page || 'n/a'}`;

    try {
        const upstream = await fetch(WEB3FORMS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                access_key: accessKey,
                subject: `New lead: ${body.name}${body.company ? ' (' + body.company + ')' : ''}`,
                from_name: 'GreenArc Website',
                replyto: body.email,
                email: body.email,
                name: body.name,
                message: emailBody
            })
        });

        const result = await upstream.json().catch(() => ({}));
        if (!upstream.ok || result.success === false) {
            return res.status(502).json({ ok: false, error: result.message || 'Email send failed' });
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(502).json({ ok: false, error: 'Email send failed' });
    }
}
