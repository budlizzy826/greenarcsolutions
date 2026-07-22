// Same-origin lead relay → email.
// The browser posts here (no CORS); this forwards the lead to FormSubmit
// server-side, which emails the full lead to Adam. No database, no n8n,
// no account/API key. The destination email stays server-side (not in page source).
//
// One-time setup: the first submission triggers a FormSubmit "Activate Form"
// email to adam@greenarcsolutions.com — click that link once to enable delivery.

const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/adam@greenarcsolutions.com';

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

    try {
        const upstream = await fetch(FORMSUBMIT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': 'https://greenarcsolutions.com',
                'Referer': 'https://greenarcsolutions.com/'
            },
            body: JSON.stringify({
                _subject: 'New lead: ' + body.name + (body.company ? ' (' + body.company + ')' : ''),
                _template: 'table',
                _captcha: 'false',
                _replyto: body.email,
                Name: body.name,
                Email: body.email,
                Phone: body.phone,
                Company: body.company || 'Not provided',
                Interest: body.service_interest || 'Not specified',
                Message: body.message || '(none)',
                'SMS consent': body.sms_consent === true ? 'YES' : 'no',
                'Consent timestamp': body.consent_timestamp || 'n/a',
                'Source page': body.source_page || 'n/a'
            })
        });

        const result = await upstream.json().catch(() => ({}));
        const ok = result.success === true || result.success === 'true';
        if (!upstream.ok || !ok) {
            return res.status(502).json({ ok: false, error: result.message || 'Email send failed' });
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(502).json({ ok: false, error: 'Email send failed' });
    }
}
