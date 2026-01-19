const { validateSlug, sanitizeSlug } = require('../utils/slugUtils');

/**
 * Middleware to validate and sanitize slugs in request body
 * @param {string[]} fields - Array of field names that should be validated as slugs
 */
const validateSlugMiddleware = (fields = ['slug']) => {
  return (req, res, next) => {
    const errors = [];

    fields.forEach(field => {
      if (req.body[field]) {
        const validation = validateSlug(req.body[field]);
        
        if (!validation.valid) {
          errors.push({
            field,
            errors: validation.errors
          });
        }
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid slug format',
        errors
      });
    }

    next();
  };
};

/**
 * Middleware to auto-sanitize slugs in request body
 * @param {string[]} fields - Array of field names that should be sanitized
 */
const sanitizeSlugMiddleware = (fields = ['slug']) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = sanitizeSlug(req.body[field]);
      }
    });

    next();
  };
};

module.exports = {
  validateSlugMiddleware,
  sanitizeSlugMiddleware
};
