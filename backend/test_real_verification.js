require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./src/database/db');

const BASE_URL = 'http://localhost:3001/api';
const loginEmail = 'papa1@ejemplo.com';
const loginPassword = 'Test123!';

// Absolute paths to generated images in the brain workspace directory
const IMG_DOC_A = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\eab495de-8568-4a20-8d60-6a938354dc9f\\face_a_document_1781265116942.png';
const IMG_SELFIE_A = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\eab495de-8568-4a20-8d60-6a938354dc9f\\face_a_selfie_1781265132812.png';
const IMG_SELFIE_B = 'C:\\Users\\Usuario\\.gemini\\antigravity-ide\\brain\\eab495de-8568-4a20-8d60-6a938354dc9f\\face_b_selfie_1781265146839.png';

async function performUpload(token, docPath, selfiePath) {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('document', fs.createReadStream(docPath), { filename: 'doc.png', contentType: 'image/png' });
    form.append('selfie', fs.createReadStream(selfiePath), { filename: 'selfie.png', contentType: 'image/png' });

    const response = await axios.post(`${BASE_URL}/users/verify-identity/upload`, form, {
        headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
        },
        validateStatus: () => true // Allow handling non-200 responses
    });
    return response;
}

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   GUARDIANES DE SONRISAS — Test de Biometría Real    ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    // Reset identity verification in database for test user
    await db.query('UPDATE users SET identity_verified = 0, identity_verified_at = NULL WHERE email = $1', [loginEmail]);
    console.log('0. Reseteado estado de verificación del usuario en la base de datos.');

    let token;
    try {
        console.log('1. Autenticando con usuario de prueba...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: loginEmail,
            password: loginPassword
        });
        token = loginRes.data.data.access_token;
        console.log('   ✅ Autenticación exitosa.');
    } catch (err) {
        console.error('   ❌ Falló el login de prueba:', err.message);
        process.exit(1);
    }

    console.log('\n--------------------------------------------------');
    console.log('CASO A: Mismo rostro (Persona A vs Persona A)');
    console.log('--------------------------------------------------');
    try {
        const res = await performUpload(token, IMG_DOC_A, IMG_SELFIE_A);
        console.log('   Respuesta status:', res.status);
        console.log('   Respuesta data:', res.data);

        if (res.status === 200 && res.data.success && res.data.isMatch) {
            console.log('   ✅ OK: Coincidencia detectada correctamente.');
        } else {
            console.log('   ❌ FALLÓ: Se esperaba coincidencia pero no se detectó.');
        }
    } catch (err) {
        console.error('   ❌ Error en Caso A:', err.message);
    }

    console.log('\n--------------------------------------------------');
    console.log('CASO B: Rostros distintos (Persona A vs Persona B)');
    console.log('--------------------------------------------------');
    try {
        // Reset identity verification for second test
        await db.query('UPDATE users SET identity_verified = 0, identity_verified_at = NULL WHERE email = $1', [loginEmail]);

        const res = await performUpload(token, IMG_DOC_A, IMG_SELFIE_B);
        console.log('   Respuesta status:', res.status);
        console.log('   Respuesta data:', res.data);

        if (res.status === 400 && !res.data.success && !res.data.isMatch) {
            console.log('   ✅ OK: Se rechazó correctamente la verificación.');
        } else {
            console.log('   ❌ FALLÓ: Se esperaba rechazo pero fue aprobada.');
        }
    } catch (err) {
        console.error('   ❌ Error en Caso B:', err.message);
    }

    console.log('\n--------------------------------------------------');
    console.log('CASO C: Archivos corruptos o sin rostro');
    console.log('--------------------------------------------------');
    try {
        const tempFakePath = path.join(__dirname, 'temp_fake.png');
        fs.writeFileSync(tempFakePath, 'not-an-image-content');

        const res = await performUpload(token, IMG_DOC_A, tempFakePath);
        console.log('   Respuesta status:', res.status);
        console.log('   Respuesta data:', res.data);

        if (fs.existsSync(tempFakePath)) fs.unlinkSync(tempFakePath);

        if (res.status === 400 && !res.data.success) {
            console.log('   ✅ OK: Se detectó correctamente la falta de rostro / error.');
        } else {
            console.log('   ❌ FALLÓ: Se esperaba error de detección.');
        }
    } catch (err) {
        console.error('   ❌ Error en Caso C:', err.message);
    }

    console.log('\n--------------------------------------------------');
    console.log('Validando auditorías en la Base de Datos...');
    console.log('--------------------------------------------------');
    try {
        const logs = await db.query(
            "SELECT id, type, method, confidence_score, status, ip_address FROM verification_log WHERE user_id = (SELECT id FROM users WHERE email = $1) ORDER BY created_at DESC LIMIT 3",
            [loginEmail]
        );

        console.log(`   Se encontraron ${logs.rows.length} registros recientes en verification_log:`);
        logs.rows.forEach((row, idx) => {
            console.log(`   [Log #${idx + 1}]`);
            console.log(`      Método: ${row.method}`);
            console.log(`      Confianza: ${row.confidence_score}`);
            console.log(`      Estado: ${row.status}`);
            console.log(`      IP: ${row.ip_address}`);
        });
    } catch (err) {
        console.error('   ❌ Error leyendo logs:', err.message);
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║           TEST DE BIOMETRÍA REAL FINALIZADO          ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    process.exit(0);
}

run();
