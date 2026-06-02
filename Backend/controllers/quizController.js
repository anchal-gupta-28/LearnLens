const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const LearningGap = require('../models/LearningGap');
const Class = require('../models/Class');
const { analyzeLearningGaps, generateQuizQuestions } = require('../utils/aiService');

// ─── POST /api/quiz — Create quiz (Teacher) ───────────────────────────
exports.createQuiz = async (req, res) => {
  const { title, subject, topic, description, classId, questions, duration, dueDate, difficulty, isAIGenerated } = req.body;

  if (!title || !subject || !topic || !classId) {
    return res.status(400).json({ message: 'Title, subject, topic and class are required.' });
  }

  try {
    const quiz = await Quiz.create({
      title,
      subject,
      topic,
      description: description || '',
      class: classId,
      teacher: req.user._id,
      questions: questions || [],
      duration: duration || 30,
      dueDate: dueDate || null,
      difficulty: difficulty || 'Medium',
      isAIGenerated: isAIGenerated || false
    });

    const populated = await Quiz.findById(quiz._id).populate('class', 'name section');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/quiz/teacher/mine — All quizzes by this teacher ─────────
exports.getTeacherQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacher: req.user._id })
      .populate('class', 'name section')
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/quiz/class/:classId — All quizzes for a class ──────────
exports.getQuizzesByClass = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ class: req.params.classId })
      .select('-questions')
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/quiz/:id — Get quiz details with questions ─────────────
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('class', 'name section');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PUT /api/quiz/:id — Update quiz (Teacher, owner only) ───────────
exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or not authorised' });

    const { title, subject, topic, description, classId, questions, duration, dueDate, difficulty } = req.body;

    if (title)       quiz.title       = title;
    if (subject)     quiz.subject     = subject;
    if (topic)       quiz.topic       = topic;
    if (description !== undefined) quiz.description = description;
    if (classId)     quiz.class       = classId;
    if (questions)   quiz.questions   = questions;
    if (duration)    quiz.duration    = duration;
    if (dueDate !== undefined) quiz.dueDate = dueDate;
    if (difficulty)  quiz.difficulty  = difficulty;

    await quiz.save();
    const populated = await Quiz.findById(quiz._id).populate('class', 'name section');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/quiz/:id — Delete quiz (Teacher, owner only) ────────
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or not authorised' });
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/quiz/generate-ai — Generate quiz via Gemini AI ────────
exports.generateAIQuiz = async (req, res) => {
  const { subject, topic, difficulty, count, classId, title, duration, dueDate } = req.body;

  if (!subject || !topic || !classId) {
    return res.status(400).json({ message: 'Subject, topic and class are required for AI generation.' });
  }

  const questionCount = Math.min(Math.max(parseInt(count) || 5, 3), 20);

  try {
    const questions = await generateQuizQuestions(subject, topic, difficulty || 'Medium', questionCount);

    if (!questions || questions.length === 0) {
      return res.status(500).json({ message: 'AI failed to generate questions. Please try again.' });
    }

    const quiz = await Quiz.create({
      title: title || `AI Quiz: ${topic}`,
      subject,
      topic,
      description: `AI-generated diagnostic quiz on ${topic} (${difficulty || 'Medium'} difficulty).`,
      class: classId,
      teacher: req.user._id,
      questions,
      duration: duration || 30,
      dueDate: dueDate || null,
      difficulty: difficulty || 'Medium',
      isAIGenerated: true
    });

    const populated = await Quiz.findById(quiz._id).populate('class', 'name section');
    res.status(201).json(populated);
  } catch (error) {
    console.error('generateAIQuiz error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/quiz/:id/submit — Submit quiz (Student) ───────────────
exports.submitQuiz = async (req, res) => {
  const { answers, timeTaken } = req.body;

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    let score = 0;
    const topicStats = {};

    quiz.questions.forEach((q, index) => {
      if (!topicStats[q.topic]) {
        topicStats[q.topic] = { total: 0, correct: 0 };
      }
      topicStats[q.topic].total += 1;

      if (answers[index] === q.correctOption) {
        score += 1;
        topicStats[q.topic].correct += 1;
      }
    });

    const topicPerformance = Object.keys(topicStats).map(topic => ({
      topic,
      correct: topicStats[topic].correct,
      total: topicStats[topic].total,
      accuracy: Math.round((topicStats[topic].correct / topicStats[topic].total) * 100)
    }));

    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((score / Math.max(totalQuestions, 1)) * 100);
    const completionTime = timeTaken || 0;
    const submittedAt = new Date();

    const result = await Result.create({
      // String convenience fields
      studentId:  req.user._id.toString(),
      quizId:     quiz._id.toString(),
      subject:    quiz.subject,

      // ObjectId references
      student:        req.user._id,
      quiz:           quiz._id,

      // Score data
      score,
      totalQuestions,
      percentage,
      topicPerformance,

      // Time & date
      completionTime,
      timeTaken:    completionTime,
      submittedAt,
      completedAt:  submittedAt,
    });

    // Trigger AI Learning Gap Analysis (non-blocking on failure)
    let gaps = null;
    try {
      const performanceData = {
        subject:        quiz.subject,
        topic:          quiz.topic,
        score,
        totalQuestions,
        percentage,
        topicPerformance,
        timeTaken: completionTime
      };
      gaps = await analyzeLearningGaps(performanceData);
      if (gaps) {
        await LearningGap.create({ student: req.user._id, quiz: quiz._id, ...gaps });
      }
    } catch (aiErr) {
      console.error('Learning gap analysis failed (non-fatal):', aiErr.message);
    }

    res.status(201).json({ result, gaps });
  } catch (error) {
    console.error('submitQuiz error:', error);
    res.status(500).json({ message: error.message });
  }
};
