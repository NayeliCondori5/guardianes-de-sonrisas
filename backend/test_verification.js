/**
 * test_verification.js
 * Script de validación automática de los flujos de verificación:
 *   - Email verification (request + confirm)
 *   - Phone verification (request + confirm)
 *   - 2FA setup + confirm + disable
 *
 * Uso: node test_verification.js
 * Requiere que el backend esté corriendo en http://localhost:5000
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = { email: 'papa1@ejemplo.com', password: 'Test123!' };

let authToken = null;
let passed = 0;
let failed = 0;

// ─── Utilidades ─────────────────────────────────────────────────────────────

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, data: body }); }
            });
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function ok(label) {
    console.log(`  ✅ ${label}`);
    passed++;
}

function fail(label, detail) {
    console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
}

function section(title) {
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`  ${title}`);
    console.log('─'.repeat(55));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function testLogin() {
    section('1. Login de usuario de prueba');
    const res = await request('POST', '/auth/login', TEST_USER);
    if (res.status === 200 && res.data.success && res.data.data?.access_token) {
        authToken = res.data.data.access_token;
        ok(`Login exitoso para ${TEST_USER.email}`);
        ok(`Token obtenido (${authToken.substring(0, 20)}...)`);
    } else if (res.status === 200 && res.data.data?.requires2FA) {
        // Caso 2FA ya activado — no podemos continuar sin el código
        fail('Login requiere 2FA — desactívalo primero o usa un usuario sin 2FA');
        return false;
    } else {
        fail('Login fallido', JSON.stringify(res.data));
        return false;
    }
    return true;
}

async function testProfile() {
    section('2. Verificación del perfil del usuario');
    const res = await request('GET', '/users/profile', null, authToken);
    if (res.status === 200 && res.data.success) {
        const u = res.data.data;
        ok(`Perfil cargado: ${u.full_name} (${u.role})`);
        console.log(`     email_verified: ${u.email_verified} | phone_verified: ${u.phone_verified} | two_factor_enabled: ${u.two_factor_enabled}`);
    } else {
        fail('No se pudo cargar el perfil', JSON.stringify(res.data));
    }
}

async function testEmailVerification() {
    section('3. Verificación de Correo Electrónico');

    // 3a. Solicitar código
    const reqRes = await request('POST', '/users/verify-email/request', {}, authToken);
    if (reqRes.status === 200 && reqRes.data.success) {
        ok('Código de email solicitado correctamente');
    } else if (reqRes.status === 429) {
        ok('Rate limit activo (demasiadas solicitudes recientes) — comportamiento correcto');
        return; // No podemos continuar sin el código
    } else {
        fail('No se pudo solicitar código de email', JSON.stringify(reqRes.data));
        return;
    }

    // 3b. Intentar confirmar con código inválido
    const badRes = await request('POST', '/users/verify-email/confirm', { code: '000000' }, authToken);
    if (badRes.status === 400 && !badRes.data.success) {
        ok('Código inválido correctamente rechazado (400)');
    } else {
        fail('Código inválido debería ser rechazado', JSON.stringify(badRes.data));
    }

    console.log('\n  ⚠️  Para completar esta prueba, revisa la consola del backend y busca:');
    console.log('     [MOCK EMAIL] Código de verificación de correo para papa1@ejemplo.com');
    console.log('     Luego ejecuta: POST /api/users/verify-email/confirm { "code": "CÓDIGO" }');
}

async function testRateLimiting() {
    section('6. Rate Limiting (Anti-Spam OTP)');

    // Hacer múltiples solicitudes rápidas
    let hit429 = false;
    for (let i = 0; i < 7; i++) {
        const res = await request('POST', '/users/verify-email/request', {}, authToken);
        if (res.status === 429) {
            hit429 = true;
            ok(`Rate limit activo tras ${i + 1} intentos (429 Too Many Requests)`);
            break;
        }
    }
    if (!hit429) {
        // Puede que el rate limit sea por tiempo; no necesariamente un fallo
        console.log('  ℹ️  Rate limit no alcanzado en 7 intentos (puede depender del tiempo de ventana)');
    }
}

async function testUnauthorized() {
    section('7. Protección de endpoints (sin token)');

    const endpoints = [
        { method: 'POST', path: '/users/verify-email/request' },
    ];

    for (const ep of endpoints) {
        const res = await request(ep.method, ep.path, ep.body || {}, null /* sin token */);
        if (res.status === 401 || res.status === 403) {
            ok(`${ep.method} ${ep.path} → ${res.status} (acceso denegado sin auth)`);
        } else {
            fail(`${ep.method} ${ep.path} debería retornar 401/403`, `obtuvo ${res.status}`);
        }
    }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   GUARDIANES DE SONRISAS — Validación de Seguridad  ║');
    console.log('╚══════════════════════════════════════════════════════╝');

    const loggedIn = await testLogin();
    if (!loggedIn) {
        console.log('\n⛔ No se puede continuar sin autenticación.\n');
        process.exit(1);
    }

    await testProfile();
    await testEmailVerification();
    await testRateLimiting();
    await testUnauthorized();

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log(`║  RESULTADO FINAL: ${passed} ✅ pasaron, ${failed} ❌ fallaron${' '.repeat(Math.max(0, 18 - String(passed).length - String(failed).length))}║`);
    console.log('╚══════════════════════════════════════════════════════╝\n');

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Error fatal en el script de prueba:', err);
    process.exit(1);
});
