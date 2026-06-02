const mongoose = require('mongoose');

const topicPerformanceSchema = new mongoose.Schema({
  topic:    { type: String },
  correct:  { type: Number },
  total:    { type: Number },
  accuracy: { type: Number }   // 0–100
}, { _id: false });

const resultSchema = new mongoose.Schema({
  // Convenience string fields (for quick queries / analytics)
  studentId:  { type: String },
  quizId:     { type: String },
  subject:    { type: String },

  // Proper ObjectId references
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  quiz:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz',  required: true },

  score:          { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage:     { type: Number },  // score / totalQuestions * 100

  topicPerformance: [topicPerformanceSchema],

  completionTime: { type: Number },   // seconds (alias for timeTaken)
  timeTaken:      { type: Number },   // seconds (legacy field kept)

  submittedAt:  { type: Date, default: Date.now },
  completedAt:  { type: Date, default: Date.now }  // legacy alias
});

module.exports = mongoose.model('Result', resultSchema);
