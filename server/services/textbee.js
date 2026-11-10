const sendOtpSms = async (phone, code) => {
  if (!process.env.TEXTBEE_API_KEY) throw new Error('TextBee is not configured. Add TEXTBEE_API_KEY to server/.env');
  const response = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.TEXTBEE_API_KEY },
    body: JSON.stringify({
      recipients: [phone],
      message: `Your Terrava verification code is ${code}. It expires in 5 minutes.`,
      ...(process.env.TEXTBEE_DEVICE_ID ? { deviceId: process.env.TEXTBEE_DEVICE_ID } : {})
    })
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message || body?.error || body?.errors?.[0]?.message || '';
    } catch { /* keep the status-only error */ }
    throw new Error(`TextBee SMS failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
};

module.exports = { sendOtpSms };
