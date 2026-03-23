// api/send-sms.js – Vercel Serverless Function (Twilio SMS)
// Sends a review request SMS via Twilio.
// Required env vars: TWILIO_SID, TWILIO_AUTH, TWILIO_FROM

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Missing to or message' });

    const SID = process.env.TWILIO_SID;
    const AUTH = process.env.TWILIO_AUTH;
    const FROM = process.env.TWILIO_FROM;

    // If no Twilio credentials: return demo success
    if (!SID || !AUTH || !FROM) {
        console.log(`[DEMO] Would send SMS to ${to}: ${message}`);
        return res.status(200).json({ demo: true, message: 'Demo mode – no Twilio credentials set' });
    }

    try {
        const Authorization = 'Basic ' + Buffer.from(`${SID}:${AUTH}`).toString('base64');
        const body = new URLSearchParams({
            To: to.startsWith('+') ? to : `+33${to.replace(/^0/, '')}`,
            From: FROM,
            Body: message
        });
        const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
            method: 'POST',
            headers: { Authorization, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        const data = await twilioRes.json();
        if (data.sid) return res.status(200).json({ success: true, sid: data.sid });
        return res.status(400).json({ error: data.message || 'Twilio error' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
