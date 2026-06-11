require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./src/database/db');

const BASE_URL = 'http://localhost:3001/api';
const loginEmail = 'papa1@ejemplo.com';
const loginPassword = 'Test123!';

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   GUARDIANES DE SONRISAS — Test de Biometría Facial   ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

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

    // Crear imágenes temporales de prueba
    const tempDocPath = path.join(__dirname, 'temp_doc_test.jpg');
    const tempSelfiePath = path.join(__dirname, 'temp_selfie_test.jpg');
    
    fs.writeFileSync(tempDocPath, 'fake-document-content');
    fs.writeFileSync(tempSelfiePath, 'fake-selfie-content');
    console.log('2. Creados archivos temporales de prueba.');

    try {
        console.log('3. Subiendo imágenes a /users/verify-identity/upload...');
        
        // Crear FormData manual o con Axios compatible
        // Usamos Axios con Buffer y cabeceras multipart manuales para compatibilidad
        const FormData = require('form-data'); // form-data es sub-dependencia de twilio u otros, o podemos usar axios FormData
        const form = new FormData();
        form.append('document', fs.createReadStream(tempDocPath), { filename: 'doc.jpg', contentType: 'image/jpeg' });
        form.append('selfie', fs.createReadStream(tempSelfiePath), { filename: 'selfie.jpg', contentType: 'image/jpeg' });

        const uploadRes = await axios.post(`${BASE_URL}/users/verify-identity/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('   ✅ Respuesta del servidor:', uploadRes.status, uploadRes.data);
        
        if (uploadRes.data.success && uploadRes.data.confidence >= 0.85) {
            console.log('   ✅ Verificación aprobada correctamente.');
        } else {
            console.log('   ❌ La respuesta no tiene el formato esperado:', uploadRes.data);
        }

        console.log('4. Validando cambios en la base de datos...');
        const userQuery = await db.query('SELECT identity_verified, identity_verified_at FROM users WHERE email = $1', [loginEmail]);
        const userRow = userQuery.rows[0];
        if (userRow && userRow.identity_verified === 1) {
            console.log(`   ✅ Usuario marcado como verificado en DB. Fecha: ${userRow.identity_verified_at}`);
        } else {
            console.log('   ❌ El usuario no fue marcado como verificado en la base de datos.');
        }

        console.log('5. Validando registro de auditoría en verification_log...');
        const logQuery = await db.query("SELECT * FROM verification_log WHERE type = 'identity' ORDER BY created_at DESC LIMIT 1");
        const logRow = logQuery.rows[0];
        if (logRow) {
            console.log(`   ✅ Log de auditoría encontrado:`);
            console.log(`      ID: ${logRow.id}`);
            console.log(`      Método: ${logRow.method}`);
            console.log(`      Puntaje de Confianza: ${logRow.confidence_score}`);
            console.log(`      Estado: ${logRow.status}`);
            console.log(`      IP: ${logRow.ip_address}`);
        } else {
            console.log('   ❌ No se encontró ningún registro en verification_log.');
        }

    } catch (err) {
        console.error('   ❌ Error durante la prueba:', err.response?.data || err.message);
    } finally {
        console.log('6. Validando eliminación de archivos temporales...');
        // Esperar un poco para que el servidor complete el unlink
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Las imágenes de prueba que creamos nosotros localmente para la subida
        if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);
        if (fs.existsSync(tempSelfiePath)) fs.unlinkSync(tempSelfiePath);

        // Verificar que los archivos subidos al servidor en ./uploads/temp-verify fueron borrados
        const tempDir = path.join(__dirname, 'uploads', 'temp-verify');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            if (files.length === 0) {
                console.log('   ✅ Excelente: Todos los archivos en temp-verify fueron eliminados de forma segura.');
            } else {
                console.log(`   ⚠️  Archivos huérfanos detectados en temp-verify:`, files);
            }
        } else {
            console.log('   ✅ Excelente: La carpeta temporal está vacía o no existe.');
        }
    }

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║               TEST DE BIOMETRÍA FINALIZADO           ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    process.exit(0);
}

run();
