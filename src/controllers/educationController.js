const Education = require('../models/Education');
const { generateSlug, sanitizeSlug, validateSlug } = require('../utils/slugUtils');

exports.getAllCategories = async (req, res) => {
  try {
    console.log("Listing categories.......");
    const categories = await Education.find({ isPublished: true })
      .sort({ order: 1 })
      .lean();

    
    const filteredCategories = categories.map(cat => ({
      ...cat,
      subcategories: cat.subcategories
        .filter(sub => sub.isPublished)
        .map(sub => {
          // Handle both sections and direct articles for backward compatibility
          const processedSub = {
            ...sub,
            articles: sub.articles?.filter(art => art.isPublished).sort((a, b) => a.order - b.order) || []
          };
          
          // If sections exist, process them
          if (sub.sections && sub.sections.length > 0) {
            processedSub.sections = sub.sections
              .filter(sec => sec.isPublished)
              .map(sec => ({
                ...sec,
                articles: sec.articles?.filter(art => art.isPublished).sort((a, b) => a.order - b.order) || []
              }))
              .sort((a, b) => a.order - b.order);
          }
          
          return processedSub;
        })
        .sort((a, b) => a.order - b.order)
    }));

    res.json({
      success: true,
      categories: filteredCategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  try {
    console.log("Entered here.......");
    const category = await Education.findOne({ 
      slug: req.params.slug,
      isPublished: true 
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.subcategories = category.subcategories
      .filter(sub => sub.isPublished)
      .map(sub => {
        const processedSub = {
          ...sub,
          articles: sub.articles?.filter(art => art.isPublished).sort((a, b) => a.order - b.order) || []
        };
        
        // If sections exist, process them
        if (sub.sections && sub.sections.length > 0) {
          processedSub.sections = sub.sections
            .filter(sec => sec.isPublished)
            .map(sec => ({
              ...sec,
              articles: sec.articles?.filter(art => art.isPublished).sort((a, b) => a.order - b.order) || []
            }))
            .sort((a, b) => a.order - b.order);
        }
        
        return processedSub;
      })
      .sort((a, b) => a.order - b.order);

    res.json({
      success: true,
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Replace the getArticleBySlug function in your educationController.js with this:

exports.getArticleBySlug = async (req, res) => {
  try {
    console.log("getting article using slug");
    console.log("Request params:", req.params);
    
    const { categorySlug, subcategorySlug, sectionSlug, articleSlug } = req.params;

    const category = await Education.findOne({ slug: categorySlug });

    if (!category) {
      console.log("Category not found:", categorySlug);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.find(sub => sub.slug === subcategorySlug);

    if (!subcategory) {
      console.log("Subcategory not found:", subcategorySlug);
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    let section = null;
    let article = null;
    
    // Determine which slug is actually the article slug
    // If we have 4 params: category/subcategory/section/article
    // If we have 3 params: category/subcategory/article (sectionSlug is actually articleSlug)
    const actualArticleSlug = articleSlug || sectionSlug;
    const actualSectionSlug = articleSlug ? sectionSlug : null;
    
    console.log("Looking for article:", actualArticleSlug);
    console.log("In section:", actualSectionSlug);
    
    // If we have a section slug, try to find the article in that specific section
    if (actualSectionSlug && subcategory.sections) {
      section = subcategory.sections.find(sec => sec.slug === actualSectionSlug);
      if (section) {
        article = section.articles?.find(art => art.slug === actualArticleSlug);
        console.log("Found in specified section:", !!article);
      }
    }
    
    // If not found and we have sections, search in all sections
    if (!article && subcategory.sections && subcategory.sections.length > 0) {
      console.log("Searching in all sections...");
      for (const sec of subcategory.sections) {
        article = sec.articles?.find(art => art.slug === actualArticleSlug);
        if (article) {
          section = sec;
          console.log("Found in section:", sec.title);
          break;
        }
      }
    }
    
    // Fallback: search in direct articles (backward compatibility)
    if (!article && subcategory.articles) {
      console.log("Searching in direct articles...");
      article = subcategory.articles.find(art => art.slug === actualArticleSlug);
      if (article) {
        console.log("Found in direct articles");
      }
    }

    if (!article) {
      console.log("Article not found anywhere");
      console.log("Available sections:", subcategory.sections?.map(s => s.slug));
      console.log("Available articles in sections:", subcategory.sections?.map(s => ({
        section: s.slug,
        articles: s.articles?.map(a => a.slug)
      })));
      
      return res.status(404).json({
        success: false,
        message: 'Article not found',
        debug: {
          categorySlug,
          subcategorySlug,
          sectionSlug: actualSectionSlug,
          articleSlug: actualArticleSlug,
          availableSections: subcategory.sections?.map(s => s.slug),
          availableArticles: subcategory.sections?.flatMap(s => s.articles?.map(a => a.slug) || [])
        }
      });
    }

    // Increment views
    article.views = (article.views || 0) + 1;
    await category.save();

    res.json({
      success: true,
      article,
      breadcrumb: {
        category: { title: category.title, slug: category.slug },
        subcategory: { title: subcategory.title, slug: subcategory.slug },
        section: section ? { title: section.title, slug: section.slug } : null
      }
    });
  } catch (error) {
    console.error("Error in getArticleBySlug:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
      error: error.message
    });
  }
};
// Add this new function to your educationController.js

exports.fixArticleSlugs = async (req, res) => {
  try {
    const categories = await Education.find({});
    let totalFixed = 0;
    const fixes = [];

    for (const category of categories) {
      let categoryModified = false;

      for (const subcategory of category.subcategories) {
        // Fix sections
        if (subcategory.sections && subcategory.sections.length > 0) {
          for (const section of subcategory.sections) {
            if (section.articles && section.articles.length > 0) {
              for (const article of section.articles) {
                const oldSlug = article.slug;
                // Remove invalid characters from slug
                const newSlug = oldSlug
                  .replace(/[^a-z0-9-]/g, '') // Remove anything that's not alphanumeric or hyphen
                  .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
                  .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

                if (oldSlug !== newSlug) {
                  article.slug = newSlug;
                  totalFixed++;
                  categoryModified = true;
                  fixes.push({
                    category: category.title,
                    subcategory: subcategory.title,
                    section: section.title,
                    oldSlug,
                    newSlug,
                    title: article.title || article.question
                  });
                }
              }
            }
          }
        }

        // Fix direct articles (backward compatibility)
        if (subcategory.articles && subcategory.articles.length > 0) {
          for (const article of subcategory.articles) {
            const oldSlug = article.slug;
            const newSlug = oldSlug
              .replace(/[^a-z0-9-]/g, '')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');

            if (oldSlug !== newSlug) {
              article.slug = newSlug;
              totalFixed++;
              categoryModified = true;
              fixes.push({
                category: category.title,
                subcategory: subcategory.title,
                section: null,
                oldSlug,
                newSlug,
                title: article.title || article.question
              });
            }
          }
        }
      }

      if (categoryModified) {
        await category.save();
      }
    }

    res.json({
      success: true,
      message: `Fixed ${totalFixed} article slugs`,
      totalFixed,
      fixes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fixing article slugs',
      error: error.message
    });
  }
};

exports.searchArticles = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        results: []
      });
    }

    const categories = await Education.find({ isPublished: true }).lean();
    const results = [];

    categories.forEach(cat => {
      cat.subcategories.forEach(sub => {
        // Search in direct articles
        sub.articles?.forEach(art => {
          if (art.isPublished && 
              (art.title.toLowerCase().includes(q.toLowerCase()) ||
               art.content.toLowerCase().includes(q.toLowerCase()) ||
               art.tags?.some(tag => tag.toLowerCase().includes(q.toLowerCase())))) {
            results.push({
              ...art,
              category: { title: cat.title, slug: cat.slug },
              subcategory: { title: sub.title, slug: sub.slug }
            });
          }
        });
        
        // Search in sections
        sub.sections?.forEach(sec => {
          sec.articles?.forEach(art => {
            if (art.isPublished && 
                (art.title.toLowerCase().includes(q.toLowerCase()) ||
                 art.content.toLowerCase().includes(q.toLowerCase()) ||
                 art.tags?.some(tag => tag.toLowerCase().includes(q.toLowerCase())))) {
              results.push({
                ...art,
                category: { title: cat.title, slug: cat.slug },
                subcategory: { title: sub.title, slug: sub.slug },
                section: { title: sec.title }
              });
            }
          });
        });
      });
    });

    res.json({
      success: true,
      results: results.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching articles',
      error: error.message
    });
  }
};

exports.adminGetAllCategories = async (req, res) => {
  try {
    const categories = await Education.find().sort({ order: 1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { title, slug, description, icon, order } = req.body;

    // Generate or sanitize slug
    let finalSlug;
    if (slug) {
      // Validate provided slug
      const validation = validateSlug(slug);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slug format',
          errors: validation.errors
        });
      }
      finalSlug = sanitizeSlug(slug);
    } else {
      // Generate slug from title
      try {
        finalSlug = generateSlug(title);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
    
    // Check if slug already exists
    const existing = await Education.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category with slug "${finalSlug}" already exists. Please use a different title or slug.`
      });
    }

    const category = new Education({
      title,
      slug: finalSlug,
      description,
      icon,
      order: order || 0,
      subcategories: []
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await Education.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Education.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

exports.addSubcategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { title, slug, description, icon, order } = req.body;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Generate or sanitize slug
    let finalSlug;
    if (slug) {
      const validation = validateSlug(slug);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slug format',
          errors: validation.errors
        });
      }
      finalSlug = sanitizeSlug(slug);
    } else {
      try {
        finalSlug = generateSlug(title);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    category.subcategories.push({
      title,
      slug: finalSlug,
      description,
      icon,
      order: order || 0,
      sections: [{
        title: title,
        slug: finalSlug,
        order: 0,
        articles: [],
        isPublished: true
      }],
      articles: []
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Subcategory added successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding subcategory',
      error: error.message
    });
  }
};

exports.updateSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const updates = req.body;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    Object.assign(subcategory, updates);
    await category.save();

    res.json({
      success: true,
      message: 'Subcategory updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating subcategory',
      error: error.message
    });
  }
};

exports.deleteSubcategory = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.subcategories.pull(subcategoryId);
    await category.save();

    res.json({
      success: true,
      message: 'Subcategory deleted successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting subcategory',
      error: error.message
    });
  }
};

exports.addSection = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const { title, slug, order } = req.body;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Generate or sanitize slug
    let finalSlug;
    if (slug) {
      const validation = validateSlug(slug);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slug format',
          errors: validation.errors
        });
      }
      finalSlug = sanitizeSlug(slug);
    } else {
      try {
        finalSlug = generateSlug(title);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    if (!subcategory.sections) {
      subcategory.sections = [];
    }

    subcategory.sections.push({
      title,
      slug: finalSlug,
      order: order || 0,
      articles: [],
      isPublished: true
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Section added successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding section',
      error: error.message
    });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { categoryId, subcategoryId, sectionId } = req.params;
    const updates = req.body;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    const section = subcategory.sections.id(sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    Object.assign(section, updates);
    await category.save();

    res.json({
      success: true,
      message: 'Section updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating section',
      error: error.message
    });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const { categoryId, subcategoryId, sectionId } = req.params;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    subcategory.sections.pull(sectionId);
    await category.save();

    res.json({
      success: true,
      message: 'Section deleted successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting section',
      error: error.message
    });
  }
};

exports.addArticle = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const { title, content, slug, order, tags, question, sectionId } = req.body;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Ensure sections array exists and has at least one section
    if (!subcategory.sections || subcategory.sections.length === 0) {
      // Create default section with subcategory name
      subcategory.sections = [{
        title: subcategory.title,
        slug: subcategory.slug,
        order: 0,
        articles: [],
        isPublished: true
      }];
    }

    // Find the target section
    let targetSection;
    if (sectionId) {
      targetSection = subcategory.sections.id(sectionId);
      if (!targetSection) {
        return res.status(404).json({
          success: false,
          message: 'Section not found'
        });
      }
    } else {
      // Default to first section if no sectionId provided
      targetSection = subcategory.sections[0];
    }

    // Add article to the target section
    // Generate or sanitize slug
    let finalSlug;
    if (slug) {
      const validation = validateSlug(slug);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slug format',
          errors: validation.errors
        });
      }
      finalSlug = sanitizeSlug(slug);
    } else {
      // Generate slug from question or title
      const sourceText = question || title;
      try {
        finalSlug = generateSlug(sourceText);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
    
    targetSection.articles.push({
      title,
      question,
      content,
      slug: finalSlug,
      order: order || 0,
      tags: tags || [],
      isPublished: true
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Article added successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding article',
      error: error.message
    });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const { categoryId, subcategoryId, articleId } = req.params;
    const updates = req.body;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Try to find article in sections first
    let article = null;
    if (subcategory.sections && subcategory.sections.length > 0) {
      for (const section of subcategory.sections) {
        article = section.articles.id(articleId);
        if (article) break;
      }
    }

    // Fallback to direct articles
    if (!article) {
      article = subcategory.articles.id(articleId);
    }

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    Object.assign(article, { ...updates, updatedAt: Date.now() });
    await category.save();

    res.json({
      success: true,
      message: 'Article updated successfully',
      category
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      error: error.message || 'Internal server error'
    });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const { categoryId, subcategoryId, articleId } = req.params;

    const category = await Education.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.id(subcategoryId);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    subcategory.articles.pull(articleId);
    await category.save();

    res.json({
      success: true,
      message: 'Article deleted successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting article',
      error: error.message
    });
  }
};

exports.fixExistingArticles = async (req, res) => {
  try {
    const categories = await Education.find({});
    let totalArticlesFixed = 0;
    let articlesWithoutQuestion = [];

    for (const category of categories) {
      let categoryModified = false;

      for (const subcategory of category.subcategories) {
        // Check sections
        if (subcategory.sections && subcategory.sections.length > 0) {
          for (const section of subcategory.sections) {
            if (section.articles && section.articles.length > 0) {
              for (const article of section.articles) {
                // Fix missing isPublished flag
                if (article.isPublished === undefined || article.isPublished === null) {
                  article.isPublished = true;
                  totalArticlesFixed++;
                  categoryModified = true;
                }

                // Track articles without question
                if (!article.question || article.question.trim() === '') {
                  articlesWithoutQuestion.push({
                    id: article._id,
                    title: article.title,
                    category: category.title,
                    subcategory: subcategory.title,
                    section: section.title
                  });
                }
              }
            }
          }
        }

        // Check direct articles (backward compatibility)
        if (subcategory.articles && subcategory.articles.length > 0) {
          for (const article of subcategory.articles) {
            if (article.isPublished === undefined || article.isPublished === null) {
              article.isPublished = true;
              totalArticlesFixed++;
              categoryModified = true;
            }

            if (!article.question || article.question.trim() === '') {
              articlesWithoutQuestion.push({
                id: article._id,
                title: article.title,
                category: category.title,
                subcategory: subcategory.title,
                section: null
              });
            }
          }
        }
      }

      if (categoryModified) {
        await category.save();
      }
    }

    res.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        articlesFixed: totalArticlesFixed,
        articlesNeedingQuestions: articlesWithoutQuestion.length
      },
      articlesWithoutQuestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during migration',
      error: error.message
    });
  }
};
