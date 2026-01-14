const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  registerAdmin,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyAdmin,
  logoutAdmin,
  createAdmin
} = require('../controllers/adminController');
const {
  getAllBrokersAdmin,
  createBroker,
  updateBroker,
  deleteBroker
} = require('../controllers/brokerController');
const { updateSiteContent } = require('../controllers/contentController');
const { authenticateAdmin } = require('../middlewares/auth');
const { 
  validateAdminLogin, 
  validateAdminRegister,
  validateAdminCreate, 
  validateBroker,
  validateForgotPassword,
  validateVerifyOTP,
  validateResetPassword
} = require('../middlewares/validation');

const transformBrokerResponse = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data && data.brokers && Array.isArray(data.brokers)) {
      data.brokers = data.brokers.map(broker => {
        const brokerObj = broker.toObject ? broker.toObject() : broker;
        return {
          ...brokerObj,
          id: brokerObj._id || brokerObj.id,
        };
      });
    } else if (data && data.broker) {
      const brokerObj = data.broker.toObject ? data.broker.toObject() : data.broker;
      data.broker = {
        ...brokerObj,
        id: brokerObj._id || brokerObj.id,
      };
    }
    return originalJson.call(this, data);
  };
  next();
};

router.post('/login', validateAdminLogin, loginAdmin);
router.post('/register', validateAdminRegister, registerAdmin);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/verify', verifyAdmin);
router.post('/logout', logoutAdmin);
router.post('/create', validateAdminCreate, createAdmin); 

router.get('/brokers', authenticateAdmin, transformBrokerResponse, getAllBrokersAdmin);
router.post('/brokers', authenticateAdmin, validateBroker, transformBrokerResponse, createBroker);
router.put('/brokers/:id', authenticateAdmin, transformBrokerResponse, updateBroker);
router.delete('/brokers/:id', authenticateAdmin, deleteBroker);

router.put('/content', authenticateAdmin, updateSiteContent);

module.exports = router;