const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

/**
 * Elimina físicamente un archivo dado su URL o ruta,
 * soportando tanto Cloudinary como almacenamiento local en disco.
 * 
 * @param {string} fileUrl - URL de Cloudinary o ruta del archivo local
 * @returns {Promise<boolean>} - true si se eliminó con éxito, false en caso contrario
 */
const deleteFile = async (fileUrl) => {
    if (!fileUrl) return false;
    
    try {
        if (fileUrl.includes('cloudinary.com')) {
            // Extraer public_id del URL de Cloudinary
            // Ejemplo de URL típica:
            // https://res.cloudinary.com/cloud_name/image/upload/v12345678/folder_name/public_id_del_archivo.jpg
            const parts = fileUrl.split('/upload/');
            if (parts.length > 1) {
                const afterUpload = parts[1];
                const subParts = afterUpload.split('/');
                
                // Si la primera parte después de /upload/ es la versión (ej. 'v16283726'), la removemos
                if (subParts[0].startsWith('v') && /^\d+$/.test(subParts[0].substring(1))) {
                    subParts.shift();
                }
                
                const pathWithExtension = subParts.join('/');
                // Remover la extensión para obtener el public_id limpio
                const publicId = pathWithExtension.replace(/\.[^/.]+$/, "");
                
                // Verificar si Cloudinary está configurado
                if (process.env.CLOUDINARY_CLOUD_NAME && 
                    process.env.CLOUDINARY_API_KEY && 
                    process.env.CLOUDINARY_API_SECRET) {
                    
                    cloudinary.config({
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET
                    });
                    
                    const result = await cloudinary.uploader.destroy(publicId);
                    console.log(`Cloudinary delete result for '${publicId}':`, result);
                    return result.result === 'ok';
                } else {
                    console.warn('Advertencia: Cloudinary no está configurado para la eliminación.');
                    return false;
                }
            }
        } else {
            // Eliminar de almacenamiento local
            let filePath = fileUrl;
            
            // Si es una URL del servidor local (ej. http://localhost:3001/uploads/filename.jpg)
            if (fileUrl.includes('/uploads/')) {
                const parts = fileUrl.split('/uploads/');
                const filename = parts[parts.length - 1];
                const uploadsDir = process.env.UPLOADS_DIR || './uploads';
                filePath = path.join(uploadsDir, filename);
            }
            
            // Intentar la eliminación física del archivo local
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Archivo local eliminado físicamente: ${filePath}`);
                return true;
            } else {
                console.warn(`Archivo local no encontrado en la ruta: ${filePath}`);
                return false;
            }
        }
    } catch (err) {
        console.error(`Error al intentar eliminar el archivo (${fileUrl}):`, err);
        return false;
    }
    
    return false;
};

module.exports = deleteFile;
