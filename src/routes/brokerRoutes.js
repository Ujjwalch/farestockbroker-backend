const express = require('express');
const router = express.Router();
const {
  getAllBrokers,
  getBrokerById,
  getAllBrokersAdmin,
  createBroker,
  updateBroker,
  deleteBroker
} = require('../controllers/brokerController');
const { authenticateAdmin } = require('../middlewares/auth');
const { validateBroker } = require('../middlewares/validation');

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
    } else if (data && data._id) {
      const dataObj = data.toObject ? data.toObject() : data;
      data = {
        ...dataObj,
        id: dataObj._id || dataObj.id,
      };
    }
    return originalJson.call(this, data);
  };
  next();
};

router.get('/', transformBrokerResponse, getAllBrokers);
router.get('/:id', transformBrokerResponse, getBrokerById);

router.get('/admin/all', authenticateAdmin, transformBrokerResponse, getAllBrokersAdmin);
router.post('/', authenticateAdmin, validateBroker, transformBrokerResponse, createBroker);
router.put('/:id', authenticateAdmin, transformBrokerResponse, updateBroker);
router.delete('/:id', authenticateAdmin, deleteBroker);

module.exports = router;