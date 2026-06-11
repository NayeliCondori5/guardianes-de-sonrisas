const axios = require('axios');
const fs = require('fs');

const faceApiKey = process.env.AZURE_FACE_API_KEY;
let faceApiEndpoint = process.env.AZURE_FACE_API_ENDPOINT;

if (faceApiEndpoint && faceApiEndpoint.endsWith('/')) {
    faceApiEndpoint = faceApiEndpoint.slice(0, -1);
}

/**
 * Detects face and returns faceId
 * @param {string} imagePath 
 * @returns {Promise<string>}
 */
async function detectFace(imagePath) {
    const url = `${faceApiEndpoint}/face/v1.0/detect?returnFaceId=true&recognitionModel=recognition_04&detectionModel=detection_03`;
    const imageBuffer = fs.readFileSync(imagePath);

    const response = await axios.post(url, imageBuffer, {
        headers: {
            'Ocp-Apim-Subscription-Key': faceApiKey,
            'Content-Type': 'application/octet-stream'
        }
    });

    if (!response.data || response.data.length === 0) {
        throw new Error('No se detectó ningún rostro en la imagen.');
    }

    return response.data[0].faceId;
}

/**
 * Compares two faces and returns confidence score
 * @param {string} docPath 
 * @param {string} selfiePath 
 * @returns {Promise<{ isMatch: boolean, confidence: number, mock?: boolean }>}
 */
async function compareFaces(docPath, selfiePath) {
    if (!faceApiKey || !faceApiEndpoint) {
        console.log('\n======================================================');
        console.log(`[MOCK FACE API FALLBACK] (No AZURE_FACE_API_KEY/ENDPOINT set in .env)`);
        console.log(`Comparando documento: ${docPath}`);
        console.log(`Comparando selfie: ${selfiePath}`);
        console.log(`Resultado: Coincidencia exitosa (Mock 92.5%)`);
        console.log('======================================================\n');
        
        // Verificar que los archivos existen para emular el comportamiento real
        if (!fs.existsSync(docPath) || !fs.existsSync(selfiePath)) {
            throw new Error('Uno o ambos archivos de imagen no existen en el disco.');
        }

        return {
            success: true,
            isMatch: true,
            confidence: 0.925,
            mock: true
        };
    }

    try {
        console.log(`[AZURE FACE API] Iniciando detección de rostros...`);
        const faceId1 = await detectFace(docPath);
        console.log(`[AZURE FACE API] Rostro 1 detectado: ${faceId1}`);
        const faceId2 = await detectFace(selfiePath);
        console.log(`[AZURE FACE API] Rostro 2 detectado: ${faceId2}`);

        console.log(`[AZURE FACE API] Verificando similitud...`);
        const verifyUrl = `${faceApiEndpoint}/face/v1.0/verify`;
        const response = await axios.post(verifyUrl, {
            faceId1,
            faceId2
        }, {
            headers: {
                'Ocp-Apim-Subscription-Key': faceApiKey,
                'Content-Type': 'application/json'
            }
        });

        const { isIdentical, confidence } = response.data;
        console.log(`[AZURE FACE API] Resultado: idénticos=${isIdentical}, confianza=${confidence}`);
        return {
            success: true,
            isMatch: isIdentical,
            confidence: confidence
        };
    } catch (error) {
        console.error('[AZURE FACE API ERROR]:', error.response ? error.response.data : error.message);
        throw new Error(error.response?.data?.error?.message || error.message || 'Error en la verificación facial con Azure.');
    }
}

module.exports = {
    compareFaces
};
