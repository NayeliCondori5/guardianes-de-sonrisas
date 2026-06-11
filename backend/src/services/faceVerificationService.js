/**
 * Face Verification Service usando Hugging Face Inference API
 * 
 * Modelo: 'openai/clip-vit-base-patch32' para embedding de imágenes
 * 
 * ALTERNATIVA GRATUITA a Azure Face API:
 * - Registro gratuito en huggingface.co (sin tarjeta)
 * - Obtener token en: https://huggingface.co/settings/tokens
 * - Colocar token en: HUGGINGFACE_API_KEY en el archivo .env
 * 
 * Sin API key: modo mock (siempre retorna verificado con 92.5% de confianza)
 */
const fs = require('fs');
const https = require('https');
const http = require('http');

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = 'facebook/dino-vits16'; // Modelo de visión para embeddings faciales

/**
 * Convierte imagen a base64
 */
function imageToBase64(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    return buffer.toString('base64');
}

/**
 * Llama a Hugging Face Feature Extraction API para obtener embedding de una imagen
 * @param {string} imagePath 
 * @returns {Promise<number[]>}
 */
async function getImageEmbedding(imagePath) {
    return new Promise((resolve, reject) => {
        const base64 = imageToBase64(imagePath);
        
        const payload = JSON.stringify({ inputs: base64 });
        
        const options = {
            hostname: 'api-inference.huggingface.co',
            path: `/models/${HF_MODEL}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        reject(new Error(`Hugging Face API error: ${parsed.error}`));
                    } else {
                        // La API retorna un array de embeddings (o array de arrays)
                        const embedding = Array.isArray(parsed[0]) ? parsed[0] : parsed;
                        resolve(embedding);
                    }
                } catch (e) {
                    reject(new Error('Error al procesar respuesta de HuggingFace: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

/**
 * Calcula similitud coseno entre dos vectores
 * @param {number[]} a 
 * @param {number[]} b 
 * @returns {number} similitud entre -1 y 1 (1 = idéntico)
 */
function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        throw new Error('Los embeddings tienen dimensiones incompatibles');
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compara dos imágenes faciales y devuelve el resultado de la verificación.
 * @param {string} docPath    - Ruta a la foto del documento oficial
 * @param {string} selfiePath - Ruta a la selfie del usuario
 * @returns {Promise<{ success: boolean, isMatch: boolean, confidence: number, mock?: boolean }>}
 */
async function compareFaces(docPath, selfiePath) {
    // Verificar que los archivos existen
    if (!fs.existsSync(docPath)) {
        throw new Error('No se encontró el archivo del documento de identidad.');
    }
    if (!fs.existsSync(selfiePath)) {
        throw new Error('No se encontró el archivo de la selfie.');
    }

    // Si no hay API key, usar modo mock
    if (!HF_API_KEY) {
        console.log('\n======================================================');
        console.log('[MOCK FACE VERIFICATION] (No HUGGINGFACE_API_KEY en .env)');
        console.log(`Comparando documento: ${docPath}`);
        console.log(`Comparando selfie: ${selfiePath}`);
        console.log(`Resultado: Coincidencia exitosa (Mock 92.5%)`);
        console.log('Para activar verificación real:');
        console.log('  1. Regístrate gratis en https://huggingface.co');
        console.log('  2. Obtén tu token en https://huggingface.co/settings/tokens');
        console.log('  3. Añade HUGGINGFACE_API_KEY=tu_token en el .env');
        console.log('======================================================\n');

        return {
            success: true,
            isMatch: true,
            confidence: 0.925,
            mock: true
        };
    }

    try {
        console.log('[HF-FACE] Extrayendo embedding del documento oficial...');
        const embedding1 = await getImageEmbedding(docPath);

        console.log('[HF-FACE] Extrayendo embedding de la selfie...');
        const embedding2 = await getImageEmbedding(selfiePath);

        // Calcular similitud coseno entre los dos embeddings
        const similarity = cosineSimilarity(embedding1, embedding2);

        // La similitud coseno va de -1 a 1.
        // Para imágenes del mismo rostro esperamos > 0.85
        // Normalizamos a rango 0-1
        const confidence = Math.max(0, Math.min(1, (similarity + 1) / 2));
        const isMatch = similarity > 0.75; // Umbral ajustado para DINO

        console.log(`[HF-FACE] Similitud coseno: ${similarity.toFixed(4)} | Confianza normalizada: ${(confidence * 100).toFixed(1)}% | Coincidencia: ${isMatch}`);

        return {
            success: true,
            isMatch,
            confidence: parseFloat(confidence.toFixed(4))
        };
    } catch (error) {
        console.error('[HF-FACE ERROR]:', error.message);
        throw new Error(error.message || 'Error en la verificación facial. Por favor intenta con imágenes más claras.');
    }
}

module.exports = {
    compareFaces
};
