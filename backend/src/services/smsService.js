const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && twilioPhone) {
    client = twilio(accountSid, authToken);
}

/**
 * Sends verification code via SMS.
 * @param {string} phone 
 * @param {string} code 
 */
async function sendSmsCode(phone, code) {
    if (!client) {
        console.log('\n======================================================');
        console.log(`[MOCK SMS FALLBACK] (No TWILIO credentials set in .env)`);
        console.log(`Enviar a: ${phone}`);
        console.log(`Código OTP: ${code}`);
        console.log('======================================================\n');
        return { success: true, mock: true };
    }

    try {
        const message = await client.messages.create({
            body: `Tu código de verificación de Guardianes de Sonrisas es: ${code}. Expira en 10 minutos.`,
            from: twilioPhone,
            to: phone
        });
        console.log(`[SMS] Código de verificación enviado exitosamente a ${phone}. Message SID: ${message.sid}`);
        return { success: true, sid: message.sid };
    } catch (error) {
        console.error(`[SMS ERROR] Falló el envío de SMS a ${phone}:`, error.message);
        throw error;
    }
}

module.exports = {
    sendSmsCode
};
