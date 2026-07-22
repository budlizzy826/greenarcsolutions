// Same-origin lead relay → email.
// The browser posts here (no CORS); this forwards the lead to FormSubmit
// server-side, which emails the full lead to Adam. No database, no n8n,
// no account/API key. The destination email stays server-side (not in page source).
//
// NOTE: uses node:https (not fetch) because FormSubmit requires a Referer
// header, and Node's fetch/undici strips Referer/Origin as forbidden headers.

import https from 'node:https';

const FORMSUBMIT_HOST = 'formsubmit.co';
const FORMSUBMIT_PATH = '/ajax/adam@greenarcsolutions.com';

function postToFormSubmit(payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = https.request(
            {
                host: FORMSUBMIT_HOST,
                path: FORMSUBMIT_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'Origin': 'https://greenarcsolutions.com',
                    'Referer': 'https://greenarcsolutions.com/'
                }
            },
            (resp) => {
                let raw = '';
                resp.on('data', (chunk) => { raw += chunk; });
                resp.on('end', () => {
                    let parsed = {};
                    try { parsed = JSON.parse(raw); } catch (_) {}
                    resolve({ status: resp.statusCode, body: parsed });
                });
            }
        );
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

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

    const payload = {
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
    };

    try {
        const result = await postToFormSubmit(payload);
        const ok = result.body && (result.body.success === true || result.body.success === 'true');
        if (result.status < 200 || result.status >= 300 || !ok) {
            return res.status(502).json({ ok: false, error: (result.body && result.body.message) || 'Email send failed' });
        }
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(502).json({ ok: false, error: 'Email send failed' });
    }
}
