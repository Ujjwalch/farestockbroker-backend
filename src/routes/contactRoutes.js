const express = require('express');
const router = express.Router();
const { submitInquiry } = require('../controllers/contactController');

router.post('/', submitInquiry);

module.exports = router;
