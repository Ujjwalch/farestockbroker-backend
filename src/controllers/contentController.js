const SiteContent = require('../models/SiteContent');

const getSiteContent = async (req, res) => {
  try {
    let content = await SiteContent.findOne();
    
    if (!content) {
      content = new SiteContent();
      await content.save();
    }

    res.json({
      success: true,
      content: content
    });
  } catch (error) {
    console.error('Error fetching site content:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching site content'
    });
  }
};

const updateSiteContent = async (req, res) => {
  try {
    const updateData = req.body;

    let content = await SiteContent.findOne();
    
    if (!content) {
      content = new SiteContent(updateData);
    } else {
      Object.assign(content, updateData);
    }

    await content.save();

    res.json({
      success: true,
      message: 'Site content updated successfully',
      content: content
    });
  } catch (error) {
    console.error('Error updating site content:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating site content'
    });
  }
};

module.exports = {
  getSiteContent,
  updateSiteContent
};