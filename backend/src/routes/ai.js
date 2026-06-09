const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Helper wrapper to call Gemini API via native fetch (or standard https if fetch is not available)
async function callGeminiAPI(apiKey, contents, systemInstruction) {
    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-2.0-flash'
    ];
    
    // Inyectamos las instrucciones de sistema al principio del primer mensaje de usuario
    // para garantizar compatibilidad universal con todas las versiones y entornos del endpoint REST de Gemini.
    if (contents.length > 0 && contents[0].role === 'user' && contents[0].parts && contents[0].parts[0]) {
        // Evitamos volver a concatenar si se reintenta
        if (!contents[0].parts[0].text.includes('INSTRUCCIONES DE SISTEMA:')) {
            contents[0].parts[0].text = `${systemInstruction}\n\n---\nINSTRUCCIONES DE SISTEMA: Responde al usuario de acuerdo a las reglas y datos provistos anteriormente. Mantente siempre en tu rol de Asistente de Guardianes de Sonrisas.\n---\n\n${contents[0].parts[0].text}`;
        }
    }

    let lastError = null;

    for (const model of modelsToTry) {
        // Probamos v1beta primero (mejor compatibilidad con gemini-1.5-*), luego v1
        const endpointVersions = ['v1beta', 'v1'];

        for (const apiVersion of endpointVersions) {
            try {
                const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
                
                const body = {
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    const status = response.status;

                    // 404: modelo no disponible en esta versión del endpoint → probar la siguiente
                    if (status === 404) {
                        console.warn(`[AI] ${model} (${apiVersion}) → 404. Probando siguiente...`);
                        lastError = new Error(`Gemini Error 404: ${model} (${apiVersion})`);
                        continue;
                    }

                    // 429 con limit:0 → el modelo no tiene cuota free tier → probar siguiente
                    if (status === 429 && errText.includes('limit: 0')) {
                        console.warn(`[AI] ${model} (${apiVersion}) → 429 limit:0 (sin cuota). Probando siguiente...`);
                        lastError = new Error(`Gemini Error 429 sin cuota: ${model} (${apiVersion})`);
                        continue;
                    }

                    // Cualquier otro error → lanzar inmediatamente
                    throw new Error(`Gemini API Error (${status}) para ${model} (${apiVersion}): ${errText}`);
                }

                const data = await response.json();
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                    console.log(`[AI] Usando modelo: ${model} (${apiVersion})`);
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error('Formato de respuesta de Gemini inválido');
                }
            } catch (err) {
                if (err.message.includes('404') || (err.message.includes('429') && err.message.includes('sin cuota'))) {
                    lastError = err;
                    continue;
                }
                throw err;
            }
        }
    }

    // Si todos los modelos y versiones fallaron
    throw lastError || new Error('No se encontró ningún modelo de Gemini disponible para esta clave API.');
}

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: 'El campo "messages" es requerido y debe ser un array.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback: Modo Demo si no está configurada la API Key de Gemini
    if (!apiKey) {
        const lastMessage = messages[messages.length - 1]?.content || '';
        const lowerMsg = lastMessage.toLowerCase();
        let reply = '';

        if (lowerMsg.includes('hola') || lowerMsg.includes('buenos') || lowerMsg.includes('buenas')) {
            reply = '¡Hola! 🧸 Soy el asistente virtual de **Guardianes de Sonrisas** en modo de demostración. Puedes hacerme preguntas básicas sobre cómo funciona la plataforma.';
        } else if (lowerMsg.includes('funciona') || lowerMsg.includes('cómo funciona') || lowerMsg.includes('que es') || lowerMsg.includes('qué es')) {
            reply = '**Guardianes de Sonrisas** es una plataforma que conecta a padres con cuidadores (niñeras) de confianza.\n\n- **Para Padres:** Puedes registrarte, buscar cuidadores en tu ciudad, ver sus tarifas/experiencia, agendar reservas y calificar el servicio.\n- **Para Cuidadores:** Puedes crear tu perfil, publicar tus servicios específicos, cargar certificaciones y recibir solicitudes de reservas.';
        } else if (lowerMsg.includes('reserva') || lowerMsg.includes('reservar') || lowerMsg.includes('agendar')) {
            reply = 'Para reservar un cuidador, sigue estos pasos:\n1. Inicia sesión en tu cuenta de Padre.\n2. Ve a "Buscar Cuidadores" en el menú.\n3. Selecciona el perfil del cuidador ideal.\n4. Haz clic en "Reservar", completa la fecha, el horario y envía un mensaje detallado.\n5. Una vez que el cuidador acepte, sube el comprobante de pago (QR o depósito) para confirmar la reserva.';
        } else if (lowerMsg.includes('niñera') || lowerMsg.includes('cuidador') || lowerMsg.includes('recomienda') || lowerMsg.includes('recomiendame') || lowerMsg.includes('madrid') || lowerMsg.includes('barcelona')) {
            reply = 'Actualmente contamos con varios cuidadores registrados en ciudades como La Paz, Santa Cruz y Cochabamba. Algunos de los perfiles disponibles son:\n- **Cuidador 1** (La Paz, 80 Bs/h, 3 años de experiencia, calificación 4.2)\n- **Cuidador 2** (Santa Cruz, 100 Bs/h, 5 años de experiencia, calificación 4.8)\n- **Cuidador 3** (Cochabamba, 120 Bs/h, 7 años de experiencia, calificación 4.5)';
        } else if (lowerMsg.includes('precio') || lowerMsg.includes('tarifa') || lowerMsg.includes('cuánto cuesta')) {
            reply = 'Los precios y tarifas de cuidado son establecidos de forma independiente por cada cuidador. En promedio:\n- Cuidado básico: 30 Bs – 50 Bs por hora.\n- Cuidado especializado: 50 Bs – 80 Bs por hora.\n\nPuedes filtrar por rango de precios en el buscador principal de la plataforma.';
        } else if (lowerMsg.includes('registro') || lowerMsg.includes('registrarse') || lowerMsg.includes('cómo registrarse') || lowerMsg.includes('registrar')) {
            reply = 'Para registrar una cuenta, sigue estos pasos:\n1. Dirígete a la página de inicio y haz clic en **Registrarse**.\n2. Completa tus datos personales (nombre, email, contraseña) y verifica tu correo.\n3. Elige si serás **Padre** o **Cuidador** y completa la información requerida.\n4. Una vez creado el perfil, podrás iniciar sesión y comenzar a usar la plataforma.';
        } else {
            reply = 'Entendido. Estoy en **modo demostración** porque no se ha configurado la clave API de Gemini.\n\nPregúntame sobre:\n- *¿Cómo funciona la plataforma?*\n- *¿Cómo reservar un servicio?*\n- *Precios promedio o cuidadores disponibles.*';
        }

        return res.json({
            success: true,
            response: reply,
            mode: 'demo'
        });
    }

    try {
        // 1. Obtener información de la base de datos para RAG
        const { rows: sitters } = await db.query(`
            SELECT u.full_name, u.city, s.experience_years, s.hourly_rate, s.rating, s.description, s.superpowers, s.comfortable_with
            FROM users u
            JOIN sitters s ON u.id = s.user_id
            WHERE u.role = 'sitter' AND u.is_active = 1
        `);

        const { rows: services } = await db.query(`
            SELECT s.title, s.description, s.category, s.hourly_rate, u.full_name as sitter_name
            FROM services s
            JOIN users u ON s.sitter_id = u.id
            WHERE s.status = 'approved'
        `);

        // 2. Construir la systemInstruction con el contexto dinámico de la BD
        const systemInstruction = `
Eres el asistente virtual con Inteligencia Artificial de "Guardianes de Sonrisas", una plataforma integral que conecta a padres con cuidadores (niñeras) de confianza en España. Tu objetivo es ser extremadamente útil, amigable, empático y profesional tanto para padres como para cuidadores.

INFORMACIÓN DE LA PLATAFORMA:
- Flujo para Padres: Registrarse, buscar cuidadores filtrando por ciudad/precio, revisar perfiles con detalle (calificaciones, experiencias, descripción), hacer una reserva indicando fecha/hora/mensaje, subir comprobante de pago por QR o transferencia bancaria, esperar aprobación del administrador y calificar con reseña una vez completado el servicio.
- Flujo para Cuidadores: Registrarse, completar perfil, definir tarifa por hora y descripción, ofrecer servicios específicos, subir certificaciones que el administrador verificará, aceptar o rechazar solicitudes de reservas, y solicitar retiros de dinero ganados.
- Métodos de Pago: Se paga por depósito bancario o código QR. El administrador revisa y aprueba el pago para confirmar la reserva.

CUIDADORES REGISTRADOS EN LA BASE DE DATOS (RECOMIENDA SOLO ESTOS CUIDADORES REALES):
${sitters.map(s => {
    let superpowers = [];
    let comfortableWith = [];
    try { superpowers = s.superpowers ? JSON.parse(s.superpowers) : []; } catch(e) {}
    try { comfortableWith = s.comfortable_with ? JSON.parse(s.comfortable_with) : []; } catch(e) {}
    return `- Nombre: ${s.full_name}, Ciudad: ${s.city || 'No especificada'}, Experiencia: ${s.experience_years} años, Tarifa: ${s.hourly_rate}€/h, Calificación: ${s.rating}/5, Descripción: "${s.description || ''}", Habilidades/Superpoderes: ${superpowers.join(', ') || 'ninguno'}, Cómodo con: ${comfortableWith.join(', ') || 'no especificado'}.`;
}).join('\n')}

SERVICIOS ESPECÍFICOS OFRECIDOS (RECOMIENDA SOLO ESTOS SERVICIOS REALES):
${services.map(s => `- Título: "${s.title}", Categoría: ${s.category}, Tarifa: ${s.hourly_rate}€/h, Ofrecido por: ${s.sitter_name}, Descripción: "${s.description}"`).join('\n')}

DIRECTRICES PARA RESPONDER:
1. Responde de manera concisa y clara en español.
2. Si el usuario pide recomendaciones de niñeras o servicios, filtra y sugiere basándote estrictamente en los datos anteriores. Menciona sus nombres, tarifas, ciudades y características clave.
3. Si te preguntan por una ciudad o tarifa que no coincide con ninguno de los cuidadores, explícalo amablemente y ofrece las opciones más cercanas o la lista general de ciudades donde hay servicio (Madrid, Barcelona, Valencia).
4. No inventes cuidadores ni servicios que no estén en las listas provistas.
5. Mantén un formato legible usando negritas y viñetas de Markdown.
6. Si un usuario te hace preguntas fuera del alcance del cuidado infantil o del funcionamiento de la plataforma, redirígelo amablemente hacia el tema de la plataforma.
`;

        // 3. Mapear los mensajes del historial al formato esperado por Gemini API
        // El historial en frontend es un array [{ role: 'user'|'assistant', content: '...' }]
        // El formato de Gemini es [{ role: 'user'|'model', parts: [{ text: '...' }] }]
        const contents = messages
            .filter(msg => msg && msg.content && msg.content.trim() !== '')
            .map(msg => {
                const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
                return {
                    role: geminiRole,
                    parts: [{ text: msg.content }]
                };
            });

        // Asegurarnos de que el historial empiece por 'user' y alterne correctamente
        // Si no, Gemini arrojará un error 400.
        // Si el primer elemento es del modelo, lo removemos.
        if (contents.length > 0 && contents[0].role === 'model') {
            contents.shift();
        }

        // Si después de eso no hay mensajes, lanzar error
        if (contents.length === 0) {
            return res.status(400).json({ success: false, message: 'Se requiere al menos un mensaje del usuario.' });
        }

        // 4. Llamar a la API de Gemini
        const replyText = await callGeminiAPI(apiKey, contents, systemInstruction);

        res.json({
            success: true,
            response: replyText,
            mode: 'ai'
        });

    } catch (err) {
        console.error('Error al procesar chat con Gemini:', err.message);
        res.status(500).json({
            success: false,
            message: 'Error al comunicarse con la Inteligencia Artificial.',
            error: err.message
        });
    }
});

// GET /api/ai/models (Diagnóstico)
router.get('/models', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(400).json({ success: false, message: 'No se configuró la variable GEMINI_API_KEY en el backend.' });
    }
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ success: false, error: err });
        }
        const data = await response.json();
        res.json({ success: true, models: data.models });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
