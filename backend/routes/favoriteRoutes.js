const express = require('express');
const router = express.Router();
const {
  addToFavorites,
  removeFromFavorites,
  getStudentFavorites,
  checkFavoriteStatus,
  toggleFavorite
} = require('../controllers/favoriteController');

// Add company to favorites
router.post('/add', addToFavorites);

// Remove company from favorites
router.post('/remove', removeFromFavorites);

// Get student's favorite companies
router.get('/student/:studentId', getStudentFavorites);

// Check if company is favorited by student
router.get('/check/:studentId/:companyId', checkFavoriteStatus);

// Toggle favorite status (add/remove)
router.post('/toggle', toggleFavorite);

module.exports = router;

