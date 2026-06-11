const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
const maxRequests = 5; // Limit to 5 requests per window
const ipCache = new Map();

function otpRateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!ipCache.has(ip)) {
        ipCache.set(ip, []);
    }
    
    let timestamps = ipCache.get(ip);
    
    // Filter timestamps to keep only those within the active window
    timestamps = timestamps.filter(time => now - time < rateLimitWindow);
    
    if (timestamps.length >= maxRequests) {
        return res.status(429).json({
            success: false,
            message: 'Demasiadas solicitudes de código de verificación. Por favor, intente de nuevo en 15 minutos.'
        });
    }
    
    timestamps.push(now);
    ipCache.set(ip, timestamps);
    next();
}

module.exports = { otpRateLimiter };
