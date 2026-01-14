const express = require('express');
const router = express.Router();
const { registerLead, getLeads } = require('../controllers/leadController');
const { authenticateAdmin } = require('../middlewares/auth');

router.post('/register', registerLead);

router.get('/', authenticateAdmin, getLeads);

module.exports = router;