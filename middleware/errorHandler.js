const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Log error to file
const logError = (error, req) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        }
    };
    
    fs.appendFileSync(
        path.join(logDir, 'error.log'),
        JSON.stringify(logEntry) + '\n'
    );
};

// 404 Not Found Handler
const notFound = (req, res, next) => {
    res.status(404);
    
    // Check if it's an API request
    if (req.originalUrl.startsWith('/api')) {
        return res.json({
            success: false,
            error: 'Not Found'
        });
    }
    
    res.render('404', {
        title: 'Page Not Found',
        statusCode: 404
    });
};

// Main Error Handler
const errorHandler = (err, req, res, next) => {
    // Log error
    logError(err, req);
    
    // Get status code
    const statusCode = err.status || 500;
    
    // Check if this is an API request
    const isApiRequest = req.originalUrl.startsWith('/api') || 
                         req.originalUrl.startsWith('/webhooks') ||
                         req.xhr;
    
    if (isApiRequest) {
        // Return JSON error for API requests
        res.status(statusCode).json({
            success: false,
            error: err.message || 'Internal Server Error',
            code: err.code || statusCode,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    } else {
        // Render error page for HTML requests
        res.status(statusCode).render('error', {
            title: 'Error',
            message: err.message || 'Something went wrong!',
            error: process.env.NODE_ENV === 'development' ? err : {},
            statusCode: statusCode
        });
    }
};

module.exports = {
    notFound,
    errorHandler
};