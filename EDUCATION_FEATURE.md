# Education/Knowledge Base Feature

## Overview
Hierarchical education system: Categories → Subcategories → Articles (like Zerodha support)

## API Endpoints

### Public (No Auth)
```
GET  /api/education/categories                                          - All categories
GET  /api/education/categories/:slug                                    - Single category
GET  /api/education/articles/:categorySlug/:subcategorySlug/:articleSlug - Single article
GET  /api/education/search?q=term                                       - Search articles
```

### Admin (Auth Required)
```
GET    /api/education/admin/categories                                  - All (including unpublished)
POST   /api/education/admin/categories                                  - Create category
PUT    /api/education/admin/categories/:id                              - Update category
DELETE /api/education/admin/categories/:id                              - Delete category

POST   /api/education/admin/categories/:categoryId/subcategories        - Add subcategory
PUT    /api/education/admin/categories/:categoryId/subcategories/:subcategoryId
DELETE /api/education/admin/categories/:categoryId/subcategories/:subcategoryId

POST   /api/education/admin/categories/:categoryId/subcategories/:subcategoryId/articles
PUT    /api/education/admin/categories/:categoryId/subcategories/:subcategoryId/articles/:articleId
DELETE /api/education/admin/categories/:categoryId/subcategories/:subcategoryId/articles/:articleId
```

## Example: Create Category
```bash
POST /api/education/admin/categories
Authorization: Bearer <token>

{
  "title": "Account Opening",
  "description": "Everything about opening accounts",
  "icon": "user-plus",
  "order": 1
}
```

## Features
✅ 3-level hierarchy
✅ Admin-only management
✅ Publish/unpublish
✅ Custom ordering
✅ View counter
✅ Search
✅ SEO-friendly slugs
✅ Tags

## Next Steps
1. Push to GitHub → Railway auto-deploys
2. Build frontend pages
3. Create admin panel UI
