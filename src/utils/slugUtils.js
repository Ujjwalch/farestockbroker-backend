/**
 * Slug Utilities - Validation & Sanitization
 * This utility ensures consistent slug handling across the application
 */

/**
 * Generates a clean, URL-safe slug from any text
 * @param {string} text - The text to convert to a slug
 * @param {object} options - Options for slug generation
 * @returns {string} - Clean slug
 */
const generateSlug = (text, options = {}) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required and must be a string');
  }

  const {
    lowercase = true,
    separator = '-',
    maxLength = 100
  } = options;

  let slug = text.trim();

  // Convert to lowercase if specified
  if (lowercase) {
    slug = slug.toLowerCase();
  }

  // Replace spaces and special characters
  slug = slug
    .replace(/\s+/g, separator)              // Replace spaces with separator
    .replace(/[^\w\-]+/g, '')                // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, separator)            // Replace multiple separators with single separator
    .replace(/^-+/, '')                       // Trim separator from start
    .replace(/-+$/, '');                      // Trim separator from end

  // Limit length
  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-+$/, '');
  }

  // Ensure slug is not empty
  if (!slug) {
    throw new Error('Generated slug is empty. Please provide valid text.');
  }

  return slug;
};

/**
 * Validates if a slug is valid
 * @param {string} slug - The slug to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
const validateSlug = (slug) => {
  const errors = [];

  if (!slug) {
    errors.push('Slug is required');
    return { valid: false, errors };
  }

  if (typeof slug !== 'string') {
    errors.push('Slug must be a string');
    return { valid: false, errors };
  }

  // Check length
  if (slug.length < 2) {
    errors.push('Slug must be at least 2 characters long');
  }

  if (slug.length > 100) {
    errors.push('Slug must not exceed 100 characters');
  }

  // Check for invalid characters
  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
  }

  // Check for leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.push('Slug cannot start or end with a hyphen');
  }

  // Check for consecutive hyphens
  if (slug.includes('--')) {
    errors.push('Slug cannot contain consecutive hyphens');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes a slug by cleaning it and validating
 * @param {string} slug - The slug to sanitize
 * @returns {string} - Sanitized slug
 */
const sanitizeSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')              // Remove invalid characters
    .replace(/-+/g, '-')                      // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');                 // Remove leading/trailing hyphens
};

/**
 * Generates a unique slug by checking against existing slugs
 * @param {string} baseSlug - The base slug to start with
 * @param {function} checkExists - Async function that checks if slug exists
 * @returns {Promise<string>} - Unique slug
 */
const generateUniqueSlug = async (baseSlug, checkExists) => {
  let slug = sanitizeSlug(baseSlug);
  let counter = 1;
  let finalSlug = slug;

  while (await checkExists(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
};

module.exports = {
  generateSlug,
  validateSlug,
  sanitizeSlug,
  generateUniqueSlug
};
