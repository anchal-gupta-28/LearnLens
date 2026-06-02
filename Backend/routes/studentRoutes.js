const express = require('express');
const { getStudentDashboard, getStudentGaps, getStudentQuizzes } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard',  protect, authorize('student'), getStudentDashboard);
router.get('/gaps',       protect, authorize('student'), getStudentGaps);
router.get('/quizzes',    protect, authorize('student'), getStudentQuizzes);

module.exports = router;
