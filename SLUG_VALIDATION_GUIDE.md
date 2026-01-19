# Slug Validation & Sanitization Guide

## Overview

This system implements comprehensive slug validation and sanitization to ensure all URLs are clean, consistent, and SEO-friendly across the education platform.

## Features

### 1. Automatic Slug Generation
- Slugs are automatically generated from titles/questions if not provided
- Converts text to lowercase
- Replaces spaces with hyphens
- Removes special characters
- Limits length to 100 characters

### 2. Slug Validation
- Ensures slugs only contain: `a-z`, `0-9`, and `-`
- Minimum length: 2 characters
- Maximum length: 100 characters
- No leading or trailing hyphens
- No consecutive hyphens

### 3. Slug Sanitization
- Automatically cleans invalid characters
- Fixes multiple hyphens
- Removes leading/trailing hyphens

## Usage

### In Controllers

```javascript
const { generateSlug, validateSlug, sanitizeSlug } = require('../utils/slugUtils');

// Generate a slug from text
const slug = generateSlug('How to Open an Account?');
// Result: "how-to-open-an-account"

// Validate a slug
const validation = validateSlug('my-article-slug');
if (!validation.valid) {
  console.log(validation.errors);
}

// Sanitize a slug
const clean = sanitizeSlug('My Article!!! Slug???');
// Result: "my-article-slug"
```

### As Middleware

```javascript
const { validateSlugMiddleware, sanitizeSlugMiddleware } = require('../middlewares/validateSlug');

// Validate slugs in request body
router.post('/articles', 
  validateSlugMiddleware(['slug']), 
  createArticle
);

// Auto-sanitize slugs
router.post('/articles', 
  sanitizeSlugMiddleware(['slug']), 
  createArticle
);
```

## Implementation Details

### Categories
- Slug generated from title if not provided
- Validated before creation
- Must be unique across all categories

### Subcategories
- Slug generated from title if not provided
- Validated before creation
- Scoped within parent category

### Sections
- Slug generated from title if not provided
- Validated before creation
- Scoped within parent subcategory

### Articles
- Slug generated from question or title if not provided
- Validated before creation
- Scoped within parent section
- Automatically sanitized to remove invalid characters

## Validation Rules

### Valid Slugs
✅ `how-to-open-account`
✅ `trading-basics-101`
✅ `what-is-demat`
✅ `account-opening-2024`

### Invalid Slugs
❌ `How To Open Account` (uppercase, spaces)
❌ `trading--basics` (consecutive hyphens)
❌ `-trading-basics` (leading hyphen)
❌ `trading-basics-` (trailing hyphen)
❌ `trading_basics` (underscore)
❌ `trading@basics` (special character)

## Error Handling

When validation fails, the API returns:

```json
{
  "success": false,
  "message": "Invalid slug format",
  "errors": [
    {
      "field": "slug",
      "errors": [
        "Slug can only contain lowercase letters, numbers, and hyphens",
        "Slug cannot contain consecutive hyphens"
      ]
    }
  ]
}
```

## Benefits

1. **Consistency**: All slugs follow the same format
2. **SEO-Friendly**: Clean URLs improve search engine rankings
3. **User-Friendly**: Readable URLs are easier to share
4. **Error Prevention**: Invalid slugs are caught before database insertion
5. **Automatic Fixing**: Sanitization fixes common issues automatically

## Migration

For existing data with invalid slugs, use the migration endpoint:

```bash
POST /api/education/admin/fix-article-slugs
Authorization: Bearer <admin-token>
```

This will:
- Scan all articles
- Fix invalid characters
- Remove consecutive hyphens
- Clean leading/trailing hyphens
- Report all changes made

## Best Practices

1. **Let the system generate slugs** - Don't manually create slugs unless necessary
2. **Use descriptive titles** - Good titles generate good slugs
3. **Keep titles concise** - Shorter titles create cleaner slugs
4. **Avoid special characters** - Stick to letters and numbers in titles
5. **Test before deploying** - Use validation before saving to database

## Testing

```javascript
// Test slug generation
const slug1 = generateSlug('How to Open a Trading Account?');
console.log(slug1); // "how-to-open-a-trading-account"

// Test validation
const result = validateSlug('my-article-slug');
console.log(result.valid); // true

// Test sanitization
const clean = sanitizeSlug('My Article!!! With??? Special@@@Characters');
console.log(clean); // "my-article-with-specialcharacters"
```

## Troubleshooting

### Problem: Slug generation fails
**Solution**: Ensure the source text (title/question) is not empty

### Problem: Validation fails for seemingly valid slug
**Solution**: Check for hidden characters, consecutive hyphens, or length issues

### Problem: Existing articles have invalid slugs
**Solution**: Run the migration endpoint to fix all existing slugs

## Future Enhancements

- [ ] Unique slug generation with counters (e.g., `article-1`, `article-2`)
- [ ] Custom slug patterns per category
- [ ] Slug history tracking for redirects
- [ ] Bulk slug update tool
- [ ] Slug preview in admin panel
