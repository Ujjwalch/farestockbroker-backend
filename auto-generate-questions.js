const mongoose = require('mongoose');
require('dotenv').config();

const Education = require('./src/models/Education');

async function autoGenerateQuestions() {
  try {
    const mongoUri = process.argv[2] || process.env.MONGODB_URI || process.env.MONGO_DB_URI;
    
    if (!mongoUri) {
      console.error('❌ Error: MongoDB URI not provided');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    const categories = await Education.find({});
    let totalFixed = 0;

    for (const category of categories) {
      let categoryModified = false;

      for (const subcategory of category.subcategories) {
        if (subcategory.sections && subcategory.sections.length > 0) {
          for (const section of subcategory.sections) {
            if (section.articles && section.articles.length > 0) {
              for (const article of section.articles) {
                if (!article.question || article.question.trim() === '') {
                  // Auto-generate question from title
                  article.question = article.title;
                  totalFixed++;
                  categoryModified = true;
                  console.log(`✓ Generated question for: ${article.title}`);
                }
              }
            }
          }
        }

        if (subcategory.articles && subcategory.articles.length > 0) {
          for (const article of subcategory.articles) {
            if (!article.question || article.question.trim() === '') {
              article.question = article.title;
              totalFixed++;
              categoryModified = true;
              console.log(`✓ Generated question for: ${article.title}`);
            }
          }
        }
      }

      if (categoryModified) {
        await category.save();
      }
    }

    console.log(`\n✅ Done! Generated questions for ${totalFixed} articles`);
    console.log('\nNote: Questions are set to the article titles.');
    console.log('You can edit them in the admin panel to make them more user-friendly.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

autoGenerateQuestions();
