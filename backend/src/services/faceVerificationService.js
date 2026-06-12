/**
 * Face Verification Service — Verificación facial REAL con face-api.js local
 *
 * Usa modelos pre-entrenados de reconocimiento facial corridos localmente
 * en el backend con @vladmandic/face-api + canvas.
 *
 * NO aprueba automáticamente. Si no detecta un rostro en alguna imagen,
 * devuelve un fallo claro. Solo aprueba cuando la distancia euclidiana
 * entre descriptores faciales es suficientemente baja (umbral configurable).
 *
 * Modelos requeridos en ./models/:
 *   - ssd_mobilenetv1/
 *   - face_landmark_68/
 *   - face_recognition_model/
 */

const fs = require('fs');
const path = require('path');

// Directorio donde están los modelos en el paquete npm instalado
const MODELS_DIR = path.join(__dirname, '../../node_modules/@vladmandic/face-api/model');

// Umbral de distancia euclidiana para considerar que dos rostros son la misma persona.
// face-api.js usa distancia euclidiana: el valor estándar recomendado es 0.6.
const MATCH_THRESHOLD = 0.6;

// Cache de inicialización de modelos (solo se cargan una vez)
let faceapi = null;
let canvas = null;
let modelsLoaded = false;
let initError = null;

/**
 * Inicializa face-api.js con TensorFlow y canvas, cargando los modelos locales.
 * Solo se ejecuta una vez; subsecuentes llamadas usan el cache.
 */
async function initFaceApi() {
    if (modelsLoaded) return true;
    if (initError) return false;

    try {
        // Verificar que los modelos existen localmente
        const requiredManifests = [
            'ssd_mobilenetv1_model-weights_manifest.json',
            'face_landmark_68_model-weights_manifest.json',
            'face_recognition_model-weights_manifest.json'
        ];
        for (const manifest of requiredManifests) {
            const filePath = path.join(MODELS_DIR, manifest);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Archivo de modelo no encontrado: ${filePath}`);
            }
        }

        // Usar el bundle node-wasm de face-api que incluye su propio backend
        // sin necesidad de bindings nativos de TensorFlow
        const faceApiPath = path.join(__dirname, '../../node_modules/@vladmandic/face-api/dist/face-api.node-wasm.js');
        faceapi = require(faceApiPath);
        canvas = require('canvas');

        // Patch del entorno para Node.js (reemplaza APIs de browser)
        const { Canvas, Image, ImageData } = canvas;
        faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

        // Inicializar el backend WASM
        await faceapi.tf.setBackend('wasm');
        await faceapi.tf.ready();

        // Cargar los tres modelos necesarios desde el directorio de modelos
        console.log('[FACE-API] Cargando modelos locales (WASM backend)...');
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR);

        modelsLoaded = true;
        console.log('[FACE-API] ✅ Modelos cargados correctamente.');
        return true;
    } catch (err) {
        initError = err.message;
        console.error('[FACE-API] ❌ Error al inicializar modelos:', err.message);
        return false;
    }
}

/**
 * Extrae el descriptor facial (embedding de 128 dimensiones) de una imagen.
 * @param {string} imagePath — Ruta local al archivo de imagen
 * @returns {Float32Array|null} — Descriptor facial, o null si no se detectó rostro
 */
async function getFaceDescriptor(imagePath) {
    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor;
}

/**
 * Compara dos imágenes faciales y devuelve el resultado de la verificación.
 * 
 * @param {string} docPath    — Ruta a la foto del documento oficial (carnet/pasaporte)
 * @param {string} selfiePath — Ruta a la selfie del usuario
 * @returns {Promise<{ success: boolean, isMatch: boolean, confidence: number, error?: string }>}
 */
async function compareFaces(docPath, selfiePath) {
    // Verificar existencia de archivos
    if (!fs.existsSync(docPath)) {
        throw new Error('No se encontró el archivo del documento de identidad.');
    }
    if (!fs.existsSync(selfiePath)) {
        throw new Error('No se encontró el archivo de la selfie.');
    }

    // Intentar inicializar face-api.js
    const initialized = await initFaceApi();

    if (!initialized) {
        // Si los modelos no están disponibles, NO aprobamos automáticamente.
        // Retornamos un error indicando que la verificación no pudo realizarse.
        console.error('[FACE-API] No se pudo inicializar el motor de verificación facial.');
        return {
            success: false,
            isMatch: false,
            confidence: 0,
            error: `Motor de verificación facial no disponible: ${initError || 'error desconocido'}`
        };
    }

    try {
        console.log('[FACE-API] Extrayendo descriptor facial del documento...');
        const descriptor1 = await getFaceDescriptor(docPath);

        if (!descriptor1) {
            console.warn('[FACE-API] ⚠️ No se detectó ningún rostro en el documento oficial.');
            return {
                success: false,
                isMatch: false,
                confidence: 0,
                error: 'No se detectó ningún rostro en la foto del documento. Por favor usa una imagen clara del documento con tu rostro visible.'
            };
        }

        console.log('[FACE-API] Extrayendo descriptor facial de la selfie...');
        const descriptor2 = await getFaceDescriptor(selfiePath);

        if (!descriptor2) {
            console.warn('[FACE-API] ⚠️ No se detectó ningún rostro en la selfie.');
            return {
                success: false,
                isMatch: false,
                confidence: 0,
                error: 'No se detectó ningún rostro en la selfie. Por favor toma una foto clara de tu rostro de frente.'
            };
        }

        // Calcular distancia euclidiana entre los dos descriptores faciales
        const distance = faceapi.euclideanDistance(descriptor1, descriptor2);

        // Convertir distancia a confianza (0 = idéntico, ~1+ = muy diferente)
        // Confianza: cuanto menor distancia, mayor confianza
        const confidence = Math.max(0, Math.min(1, 1 - distance));
        const isMatch = distance < MATCH_THRESHOLD;

        console.log(`[FACE-API] Distancia: ${distance.toFixed(4)} | Confianza: ${(confidence * 100).toFixed(1)}% | Umbral: ${MATCH_THRESHOLD} | Coincidencia: ${isMatch ? '✅' : '❌'}`);

        return {
            success: true,
            isMatch,
            confidence: parseFloat(confidence.toFixed(4)),
            distance: parseFloat(distance.toFixed(4))
        };

    } catch (error) {
        console.error('[FACE-API ERROR]:', error.message);

        // No aprobamos en caso de error inesperado
        return {
            success: false,
            isMatch: false,
            confidence: 0,
            error: 'Error inesperado durante la verificación facial. Por favor intenta con imágenes más claras y bien iluminadas.'
        };
    }
}

// Pre-cargar modelos al iniciar el módulo (en segundo plano)
initFaceApi().catch(() => {});

module.exports = { compareFaces };
