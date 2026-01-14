const express = require('express');
const router = express.Router();
const { getSiteContent } = require('../controllers/contentController');

router.get('/', getSiteContent);

module.exports = router;