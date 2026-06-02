const Result = require('../models/Result');
const LearningGap = require('../models/LearningGap');
const Quiz = require('../models/Quiz');
const Class = require('../models/Class');

// @desc    Get student dashboard stats
exports.getStudentDashboard = async (req, res) => {
  try {
    const results = await Result.find({ student: req.user._id }).populate('quiz', 'title topic');
    const gaps = await LearningGap.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(5);

    const resultCount = results.length;
    const totalTimeSeconds = results.reduce((sum, result) => sum + (result.timeTaken || 0), 0);
    const timeStudied = totalTimeSeconds ? `${(totalTimeSeconds / 3600).toFixed(1)}h` : null;
    const avgAccuracy = resultCount > 0
      ? Math.round(results.reduce((sum, result) => sum + ((result.score / Math.max(result.totalQuestions, 1)) * 100), 0) / resultCount)
      : null;

    const riskScore = avgAccuracy != null ? Math.max(0, Math.min(100, 100 - avgAccuracy)) : null;
    const riskLabel = avgAccuracy == null ? null : avgAccuracy >= 80 ? 'Low' : avgAccuracy >= 60 ? 'Medium' : 'High';

    const streak = (() => {
      if (!resultCount) return 0;
      const days = [...new Set(results.map((result) => result.completedAt.toISOString().slice(0, 10)))].sort().reverse();
      let currentStreak = 0;
      let dayPointer = new Date();
      dayPointer.setHours(0, 0, 0, 0);
      const dayKeys = new Set(days);
      while (dayKeys.has(dayPointer.toISOString().slice(0, 10))) {
        currentStreak += 1;
        dayPointer.setDate(dayPointer.getDate() - 1);
      }
      return currentStreak;
    })();

    const weeklyStudy = (() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const week = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return {
          dateKey: d.toISOString().slice(0, 10),
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          hours: 0,
        };
      });
      const weekMap = Object.fromEntries(week.map((w) => [w.dateKey, w]));
      results.forEach((result) => {
        if (!result.completedAt) return;
        const completedDate = result.completedAt.toISOString().slice(0, 10);
        if (weekMap[completedDate]) {
          weekMap[completedDate].hours += (result.timeTaken || 0) / 3600;
        }
      });
      return week.map((item) => ({ day: item.day, hours: Number(item.hours.toFixed(1)) }));
    })();

    res.json({
      results,
      recentGaps: gaps,
      totalQuizzes: resultCount,
      streak,
      timeStudied,
      avgAccuracy,
      riskScore,
      riskLabel,
      weeklyStudy,
      learningPlan: [],
      aiSummary: null,
      achievements: [],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all learning gaps for a student
exports.getStudentGaps = async (req, res) => {
  try {
    const gaps = await LearningGap.find({ student: req.user._id }).populate('quiz', 'title');
    res.json(gaps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student's assigned quizzes (pending + completed)
exports.getStudentQuizzes = async (req, res) => {
  try {
    // 1. Find all classes this student belongs to
    const classes = await Class.find({ students: req.user._id }).select('_id name section');
    const classIds = classes.map(c => c._id);

    if (classIds.length === 0) {
      return res.json({ pending: [], completed: [] });
    }

    // 2. Find all quizzes assigned to these classes
    const allQuizzes = await Quiz.find({ class: { $in: classIds } })
      .populate('class', 'name section')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    // 3. Find all results submitted by this student
    const results = await Result.find({ student: req.user._id })
      .populate('quiz', '_id');

    const attemptedQuizIds = new Set(results.map(r => r.quiz?._id?.toString()));

    // 4. Categorise
    const pending = [];
    const completed = [];

    for (const quiz of allQuizzes) {
      const quizId = quiz._id.toString();
      if (attemptedQuizIds.has(quizId)) {
        const result = results.find(r => r.quiz?._id?.toString() === quizId);
        completed.push({
          _id:           quiz._id,
          title:         quiz.title,
          subject:       quiz.subject,
          topic:         quiz.topic,
          difficulty:    quiz.difficulty,
          questionCount: quiz.questions?.length || 0,
          duration:      quiz.duration,
          dueDate:       quiz.dueDate,
          isAIGenerated: quiz.isAIGenerated,
          class:         quiz.class,
          teacher:       quiz.teacher,
          createdAt:     quiz.createdAt,
          result: {
            score:            result.score,
            totalQuestions:   result.totalQuestions,
            percentage:       result.percentage ?? Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100),
            topicPerformance: result.topicPerformance,
            completionTime:   result.completionTime || result.timeTaken,
            submittedAt:      result.submittedAt || result.completedAt,
          }
        });
      } else {
        pending.push({
          _id:           quiz._id,
          title:         quiz.title,
          subject:       quiz.subject,
          topic:         quiz.topic,
          difficulty:    quiz.difficulty,
          questionCount: quiz.questions?.length || 0,
          duration:      quiz.duration,
          dueDate:       quiz.dueDate,
          isAIGenerated: quiz.isAIGenerated,
          class:         quiz.class,
          teacher:       quiz.teacher,
          createdAt:     quiz.createdAt,
        });
      }
    }

    res.json({ pending, completed });
  } catch (error) {
    console.error('getStudentQuizzes error:', error);
    res.status(500).json({ message: error.message });
  }
};
