const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER;
const emailAppPassword = process.env.EMAIL_APP_PASSWORD;

let transporter = null;
if (emailUser && emailAppPassword) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailAppPassword
        }
    });
}

/**
 * Sends verification code via email.
 * @param {string} email 
 * @param {string} code 
 */
async function sendVerificationCode(email, code) {
    if (!transporter) {
        console.log('\n======================================================');
        console.log(`[MOCK EMAIL FALLBACK] (No EMAIL_USER/EMAIL_APP_PASSWORD set in .env)`);
        console.log(`Enviar a: ${email}`);
        console.log(`Código OTP: ${code}`);
        console.log('======================================================\n');
        return { success: true, mock: true };
    }

    const mailOptions = {
        from: `"Guardianes de Sonrisas" <${emailUser}>`,
        to: email,
        subject: 'Código de Verificación - Guardianes de Sonrisas',
        html: `
            <div style="font-family: 'Outfit', sans-serif, Arial; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 700;">Guardianes de Sonrisas</h1>
                    <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Verificación de Seguridad</p>
                </div>
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; text-align: center; border: 1px dashed #cbd5e1; margin-bottom: 24px;">
                    <p style="margin: 0 0 16px 0; color: #334155; font-size: 16px;">Usa el siguiente código de verificación de un solo uso para verificar tu cuenta:</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 4px; color: #1e1b4b; margin: 0 0 16px 0; font-family: monospace;">${code}</div>
                    <p style="margin: 0; color: #64748b; font-size: 13px;">Este código expira en 10 minutos.</p>
                </div>
                <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">Si no solicitaste este código, por favor ignora este correo electrónico o ponte en contacto con nuestro equipo de soporte si tienes dudas.</p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 16px;" />
                <div style="text-align: center; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 0 0 4px 0;">&copy; 2026 Guardianes de Sonrisas. Todos los derechos reservados.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Código de verificación enviado exitosamente a ${email}`);
        return { success: true };
    } catch (error) {
        console.error(`[EMAIL ERROR] Falló el envío del correo a ${email}:`, error.message);
        throw error;
    }
}

module.exports = {
    sendVerificationCode
};
