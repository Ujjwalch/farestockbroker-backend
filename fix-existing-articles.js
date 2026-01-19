const mongoose = require('mongoose');
require('dotenv').config();

const Education = require('./src/models/Education');

async function fixExistingArticles() {
  try {
    // Get MongoDB URI from command line argument or environment variable
    const mongoUri = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_DB_URI;
    
    if (!mongoUri) {
      console.error('❌ Error: MongoDB URI not provided');
      console.log('\nUsage:');
      console.log('  node fix-existing-articles.js "mongodb://your-connection-string"');
      console.log('\nOr set MONGODB_URI or MONGO_DB_URI environment variable');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');

    const categories = await Education.find({});
    let totalArticlesFixed = 0;
    let articlesWithoutQuestion = 0;

    for (const category of categories) {
      let categoryModified = false;

      for (const subcategory of category.subcategories) {
        if (subcategory.sections && subcategory.sections.length > 0) {
          for (const section of subcategory.sections) {
            if (section.articles && section.articles.length > 0) {
              for (const article of section.articles) {
                let articleModified = false;

                // Fix missing isPublished flag
                if (article.isPublished === undefined || article.isPublished === null) {
                  article.isPublished = true;
                  articleModified = true;
                  console.log(`  ✓ Set isPublished=true for article: ${article.title}`);
                }

                // Check for missing question field
                if (!article.question || article.question.trim() === '') {
                  articlesWithoutQuestion++;
                  console.log(`  ⚠ Article missing question: ${article.title} (ID: ${article._id})`);
                  console.log(`    You should manually add a question for this article in the admin panel`);
                }

                if (articleModified) {
                  totalArticlesFixed++;
                  categoryModified = true;
                }
              }
            }
          }
        }

        // Also check direct articles (for backward compatibility)
        if (subcategory.articles && subcategory.articles.length > 0) {
          for (const article of subcategory.articles) {
            let articleModified = false;

            if (article.isPublished === undefined || article.isPublished === null) {
              article.isPublished = true;
              articleModified = true;
              console.log(`  ✓ Set isPublished=true for article: ${article.title}`);
            }

            if (!article.question || article.question.trim() === '') {
              articlesWithoutQuestion++;
              console.log(`  ⚠ Article missing question: ${article.title} (ID: ${article._id})`);
            }

            if (articleModified) {
              totalArticlesFixed++;
              categoryModified = true;
            }
          }
        }
      }

      if (categoryModified) {
        await category.save();
        console.log(`✓ Saved changes to category: ${category.title}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total articles fixed (isPublished): ${totalArticlesFixed}`);
    console.log(`Articles missing question field: ${articlesWithoutQuestion}`);
    
    if (articlesWithoutQuestion > 0) {
      console.log('\n⚠ ACTION REQUIRED:');
      console.log('Some articles are missing the "question" field.');
      console.log('Please edit these articles in the admin panel to add questions.');
      console.log('The question is what users see in the article list.');
    }

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixExistingArticles();
