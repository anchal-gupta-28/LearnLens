const Grade = require('../models/Grade');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const Note = require('../models/Note');
const StudyQuiz = require('../models/StudyQuiz');
const Progress = require('../models/Progress');

const findStudentGrade = async (user) => {
  if (user.grade) {
    const grade = await Grade.findById(user.grade);
    if (grade) return grade;
  }

  if (user.studentClass) {
    const slug = user.studentClass.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const grade = await Grade.findOne({ slug });
    if (grade) return grade;
  }

  return null;
};

const getClassMaterials = async (req, res) => {
  try {
    const grade = await findStudentGrade(req.user);
    if (!grade) {
      return res.status(404).json({ message: 'Student class not found. Please contact support.' });
    }

    const subjects = await Subject.find({ grade: grade._id }).sort({ order: 1, title: 1 });
    const continueLearning = await Progress.find({ user: req.user._id, status: { $ne: 'completed' } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate('subject', 'title slug')
      .populate('chapter', 'title slug');

    const recentlyViewed = await Progress.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(4)
      .populate('subject', 'title slug')
      .populate('chapter', 'title slug');

    const uniqueSubjects = subjects.reduce((map, subject) => {
      const key = subject.title?.toLowerCase().trim() || subject.slug || subject._id.toString();
      if (!map.has(key)) {
        map.set(key, subject);
      }
      return map;
    }, new Map());

    const subjectOverview = await Promise.all(Array.from(uniqueSubjects.values()).map(async subject => {
      const chapterCount = await Chapter.countDocuments({ subject: subject._id });
      const completedCount = await Progress.countDocuments({ user: req.user._id, subject: subject._id, status: 'completed' });
      return {
        _id: subject._id,
        title: subject.title,
        slug: subject.slug,
        description: subject.description,
        shortTitle: subject.shortTitle,
        chapterCount,
        completedCount,
        progress: chapterCount ? Math.round((completedCount / chapterCount) * 100) : 0
      };
    }));

    res.json({
      grade: {
        name: grade.name,
        slug: grade.slug,
        description: grade.description
      },
      subjects: subjectOverview,
      continueLearning: continueLearning.map(item => ({
        subject: item.subject,
        chapter: item.chapter,
        status: item.status,
        lastViewed: item.lastViewed
      })),
      recentlyViewed: recentlyViewed.map(item => ({
        subject: item.subject,
        chapter: item.chapter,
        status: item.status,
        lastViewed: item.lastViewed
      }))
    });
  } catch (error) {
    console.error('Study materials error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getSubjectDetails = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId).populate('grade');
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const grade = await findStudentGrade(req.user);
    if (!grade || subject.grade._id.toString() !== grade._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to access this subject' });
    }

    const chapters = await Chapter.find({ subject: subject._id }).sort({ order: 1 });
    const chapterIds = chapters.map(ch => ch._id);
    const notes = await Note.find({ chapter: { $in: chapterIds } }).sort({ order: 1 });
    const quizzes = await StudyQuiz.find({ chapter: { $in: chapterIds } }).select('title chapter');
    const progress = await Progress.find({ user: req.user._id, subject: subject._id });

    const progressMap = progress.reduce((acc, item) => {
      acc[item.chapter.toString()] = item;
      return acc;
    }, {});

    const chaptersWithProgress = chapters.map(chapter => ({
      _id: chapter._id,
      title: chapter.title,
      slug: chapter.slug,
      summary: chapter.summary,
      formulas: chapter.formulas,
      importantQuestions: chapter.importantQuestions,
      previousYearQuestions: chapter.previousYearQuestions,
      status: progressMap[chapter._id.toString()]?.status || 'not-started',
      score: progressMap[chapter._id.toString()]?.score || 0
    }));

    res.json({
      subject: {
        _id: subject._id,
        title: subject.title,
        slug: subject.slug,
        description: subject.description,
        shortTitle: subject.shortTitle,
        grade: {
          name: subject.grade.name,
          slug: subject.grade.slug,
        }
      },
      chapters: chaptersWithProgress,
      notes: notes.map(note => ({
        chapter: note.chapter,
        title: note.title,
        content: note.content,
        type: note.type
      })),
      quizzes: quizzes.map(quiz => ({
        _id: quiz._id,
        title: quiz.title,
        chapter: quiz.chapter
      })),
      progressSummary: {
        completedChapters: chaptersWithProgress.filter(c => c.status === 'completed').length,
        totalChapters: chaptersWithProgress.length
      }
    });
  } catch (error) {
    console.error('Subject details error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProgress = async (req, res) => {
  const { chapterId, status, score } = req.body;

  try {
    const chapter = await Chapter.findById(chapterId).populate('subject');
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const grade = await findStudentGrade(req.user);
    if (!grade || chapter.subject.grade.toString() !== grade._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this progress' });
    }

    const progress = await Progress.findOneAndUpdate(
      { user: req.user._id, chapter: chapter._id },
      {
        grade: req.user.grade,
        subject: chapter.subject,
        chapter: chapter._id,
        status: status || 'in-progress',
        score: score || 0,
        lastViewed: Date.now()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(progress);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getClassMaterials, getSubjectDetails, updateProgress };