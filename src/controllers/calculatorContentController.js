const CalculatorContent = require('../models/CalculatorContent');

// Get all calculator contents
exports.getAllCalculatorContents = async (req, res) => {
  try {
    const contents = await CalculatorContent.find({ isActive: true }).sort({ calculatorId: 1 });
    res.json(contents);
  } catch (error) {
    console.error('Error fetching calculator contents:', error);
    res.status(500).json({ message: 'Error fetching calculator contents', error: error.message });
  }
};

// Get single calculator content by ID
exports.getCalculatorContentById = async (req, res) => {
  try {
    const { calculatorId } = req.params;
    const content = await CalculatorContent.findOne({ calculatorId, isActive: true });
    
    if (!content) {
      return res.status(404).json({ message: 'Calculator content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching calculator content:', error);
    res.status(500).json({ message: 'Error fetching calculator content', error: error.message });
  }
};

// Create new calculator content (Admin only)
exports.createCalculatorContent = async (req, res) => {
  try {
    const { calculatorId, name, description, what, howToUse, benefits } = req.body;
    
    // Check if content already exists
    const existingContent = await CalculatorContent.findOne({ calculatorId });
    if (existingContent) {
      return res.status(400).json({ message: 'Content for this calculator already exists' });
    }
    
    const newContent = new CalculatorContent({
      calculatorId,
      name,
      description,
      what,
      howToUse,
      benefits
    });
    
    await newContent.save();
    res.status(201).json({ message: 'Calculator content created successfully', content: newContent });
  } catch (error) {
    console.error('Error creating calculator content:', error);
    res.status(500).json({ message: 'Error creating calculator content', error: error.message });
  }
};

// Update calculator content (Admin only)
exports.updateCalculatorContent = async (req, res) => {
  try {
    const { calculatorId } = req.params;
    const { name, description, what, howToUse, benefits } = req.body;
    
    const content = await CalculatorContent.findOne({ calculatorId });
    
    if (!content) {
      return res.status(404).json({ message: 'Calculator content not found' });
    }
    
    // Update fields
    if (name) content.name = name;
    if (description) content.description = description;
    if (what) content.what = what;
    if (howToUse) content.howToUse = howToUse;
    if (benefits) content.benefits = benefits;
    
    await content.save();
    res.json({ message: 'Calculator content updated successfully', content });
  } catch (error) {
    console.error('Error updating calculator content:', error);
    res.status(500).json({ message: 'Error updating calculator content', error: error.message });
  }
};

// Delete calculator content (Admin only - soft delete)
exports.deleteCalculatorContent = async (req, res) => {
  try {
    const { calculatorId } = req.params;
    
    const content = await CalculatorContent.findOne({ calculatorId });
    
    if (!content) {
      return res.status(404).json({ message: 'Calculator content not found' });
    }
    
    content.isActive = false;
    await content.save();
    
    res.json({ message: 'Calculator content deleted successfully' });
  } catch (error) {
    console.error('Error deleting calculator content:', error);
    res.status(500).json({ message: 'Error deleting calculator content', error: error.message });
  }
};

// Seed default calculator contents (for initial setup)
exports.seedCalculatorContents = async (req, res) => {
  try {
    const defaultContents = [
      {
        calculatorId: 'sip',
        name: 'SIP Calculator',
        description: 'Calculate returns on your Systematic Investment Plan (SIP) investments',
        what: 'A SIP Calculator helps you estimate the future value of your monthly SIP investments in mutual funds. It shows how regular investments can grow over time with compound interest.',
        howToUse: 'Enter your monthly investment amount, expected annual return rate, and investment duration. The calculator will show your total investment, estimated returns, and final corpus.',
        benefits: [
          'Plan your financial goals effectively',
          'Understand the power of compounding',
          'Compare different investment scenarios',
          'Make informed investment decisions'
        ]
      },
      // Add more default contents as needed
    ];
    
    for (const contentData of defaultContents) {
      const existing = await CalculatorContent.findOne({ calculatorId: contentData.calculatorId });
      if (!existing) {
        await CalculatorContent.create(contentData);
      }
    }
    
    res.json({ message: 'Calculator contents seeded successfully' });
  } catch (error) {
    console.error('Error seeding calculator contents:', error);
    res.status(500).json({ message: 'Error seeding calculator contents', error: error.message });
  }
};
