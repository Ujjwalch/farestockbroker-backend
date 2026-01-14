const Education = require('../models/Education');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Education.find({ isPublished: true })
      .sort({ order: 1 })
      .lean();
    
    const filteredCategories = categories.map(cat => ({
      ...cat,
      subcategories: cat.subcategories
        .filter(sub => sub.isPublished)
        .map(sub => ({
          ...sub,
          articles: sub.articles.filter(art => art.isPublished).sort((a, b) => a.order - b.order)
        }))
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
      .map(sub => ({
        ...sub,
        articles: sub.articles.filter(art => art.isPublished).sort((a, b) => a.order - b.order)
      }))
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

exports.getArticleBySlug = async (req, res) => {
  try {
    const { categorySlug, subcategorySlug, articleSlug } = req.params;

    const category = await Education.findOne({ slug: categorySlug });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const subcategory = category.subcategories.find(sub => sub.slug === subcategorySlug);

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    const article = subcategory.articles.find(art => art.slug === articleSlug);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    article.views += 1;
    await category.save();

    res.json({
      success: true,
      article,
      breadcrumb: {
        category: { title: category.title, slug: category.slug },
        subcategory: { title: subcategory.title, slug: subcategory.slug }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching article',
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
        sub.articles.forEach(art => {
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

    const category = new Education({
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
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

    category.subcategories.push({
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      description,
      icon,
      order: order || 0,
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

exports.addArticle = async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.params;
    const { title, content, slug, order, tags } = req.body;

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

    subcategory.articles.push({
      title,
      content,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      order: order || 0,
      tags: tags || []
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

    const article = subcategory.articles.id(articleId);

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
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      error: error.message
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
