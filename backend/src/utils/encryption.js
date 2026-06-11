const crypto = require('crypto');

// ENCRYPTION_KEY must be 32 bytes (256 bits)
const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback_secret_key_32_characters_';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(secret).digest(); // This guarantees exactly 32 bytes!

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Decryption failed:', err);
        return null;
    }
}

module.exports = { encrypt, decrypt };
