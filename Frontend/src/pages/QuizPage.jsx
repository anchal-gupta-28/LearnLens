import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Clock, CheckCircle, XCircle, ChevronRight, ChevronLeft,
  BarChart2, Target, Trophy, Zap, BookOpen, ArrowRight,
  AlertTriangle, Loader, Brain, Sparkles, Home
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const SCORE_COLOR = (pct) =>
  pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';

const SCORE_BG = (pct) =>
  pct >= 80
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : pct >= 60
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-red-500/10 border-red-500/30';

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// ──────────────────────────────────────────────────────────────────────────────
// Loading Spinner
// ──────────────────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="min-h-screen bg-[#070b19] flex flex-col items-center justify-center gap-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
      <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin" />
    </div>
    <p className="text-slate-400 font-semibold animate-pulse">Loading Quiz…</p>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// Quiz Result Screen
// ──────────────────────────────────────────────────────────────────────────────
const ResultScreen = ({ result, quiz, gaps, timeTaken, onGoHome }) => {
  const pct = result?.percentage ?? Math.round((result.score / Math.max(result.totalQuestions, 1)) * 100);
  const topicPerformance = result?.topicPerformance || [];

  return (
    <div className="min-h-screen bg-[#070b19] text-white font-sans pt-20 pb-16 px-4 md:px-8">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Congrats Header */}
        <div className="text-center space-y-3 py-8">
          <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 60 ? '🎯' : '📚'}</div>
          <h1 className="text-4xl font-black tracking-tight font-outfit">
            {pct >= 80 ? 'Excellent Work!' : pct >= 60 ? 'Good Job!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-400">You completed <span className="text-white font-bold">{quiz?.title}</span></p>
        </div>

        {/* Score Card */}
        <div className={`glass-card border ${SCORE_BG(pct)} text-center space-y-2 py-8`}>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Your Score</p>
          <p className={`text-8xl font-black tracking-tight ${SCORE_COLOR(pct)}`}>
            {pct}<span className="text-4xl">%</span>
          </p>
          <p className="text-slate-300 text-lg font-semibold">
            {result.score} / {result.totalQuestions} correct
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Score', value: `${result.score}/${result.totalQuestions}`, icon: <Trophy size={20} className="text-amber-400" /> },
            { label: 'Time Taken', value: fmtTime(timeTaken), icon: <Clock size={20} className="text-blue-400" /> },
            { label: 'Accuracy', value: `${pct}%`, icon: <Target size={20} className="text-emerald-400" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="glass-card text-center space-y-2">
              <div className="flex justify-center">{icon}</div>
              <p className="text-xl font-black text-white">{value}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Topic Performance */}
        {topicPerformance.length > 0 && (
          <div className="glass-card space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-primary-400" /> Topic Accuracy Breakdown
            </h2>
            <div className="space-y-4">
              {topicPerformance.map((tp, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-200">{tp.topic}</span>
                    <span className={`font-black text-base ${SCORE_COLOR(tp.accuracy)}`}>{tp.accuracy}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        tp.accuracy >= 80 ? 'bg-emerald-500' : tp.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${tp.accuracy}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">{tp.correct} of {tp.total} correct</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Gaps */}
        {gaps && (
          <div className="glass-card border border-purple-500/20 bg-purple-500/5 space-y-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Brain size={18} className="text-purple-400" />
              <Sparkles size={14} className="text-purple-400" />
              AI Learning Insights
            </h2>
            {gaps.weakTopics?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">Needs Improvement</p>
                <div className="flex flex-wrap gap-2">
                  {gaps.weakTopics.map((t, i) => (
                    <span key={i} className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold px-3 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {gaps.recommendations?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">Recommendations</p>
                <ul className="space-y-2">
                  {gaps.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <ArrowRight size={14} className="text-purple-400 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onGoHome}
            className="flex-1 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-glow flex items-center justify-center gap-2 text-base"
          >
            <Home size={18} /> Back to Quizzes
          </button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main QuizPage
// ──────────────────────────────────────────────────────────────────────────────
const QuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { API_URL } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [gaps, setGaps] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Fetch quiz
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/quiz/${id}`);
        const q = res.data;
        setQuiz(q);
        setAnswers(new Array(q.questions?.length || 0).fill(null));
        if (q.duration) setTimeLeft(q.duration * 60);
        startTimeRef.current = Date.now();
      } catch (err) {
        setError('Quiz not found or you are not authorised to view it.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, API_URL]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft === null, submitted]);

  const handleAnswer = (optionIndex) => {
    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    const taken = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeTaken(taken);
    try {
      const res = await axios.post(`${API_URL}/quiz/${id}/submit`, {
        answers,
        timeTaken: taken,
      });
      setResult(res.data.result);
      setGaps(res.data.gaps);
      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, id, API_URL, submitting, submitted]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !submitted) handleSubmit();
  }, [timeLeft]);

  if (loading) return <Spinner />;
  if (error) return (
    <div className="min-h-screen bg-[#070b19] flex items-center justify-center px-4">
      <div className="glass-card max-w-md w-full text-center space-y-4 border border-red-500/20">
        <AlertTriangle className="mx-auto text-red-400" size={40} />
        <h2 className="text-2xl font-black text-white">Error</h2>
        <p className="text-slate-400">{error}</p>
        <button onClick={() => navigate('/student/quizzes')} className="btn-primary w-full">← Back to Quizzes</button>
      </div>
    </div>
  );
  if (submitted && result) return (
    <ResultScreen result={result} quiz={quiz} gaps={gaps} timeTaken={timeTaken} onGoHome={() => navigate('/student/quizzes')} />
  );
  if (!quiz) return null;

  const questions = quiz.questions || [];
  const q = questions[currentIndex];
  const answeredCount = answers.filter(a => a !== null).length;
  const progressPct = Math.round((answeredCount / questions.length) * 100);
  const timerWarning = timeLeft !== null && timeLeft < 60;

  return (
    <div className="min-h-screen bg-[#070b19] text-white font-sans pt-20 pb-16 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white leading-tight">{quiz.title}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{quiz.subject} · {quiz.topic}</p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-lg font-black shrink-0 transition-all ${
              timerWarning
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-slate-900/60 border-slate-800 text-white'
            }`}>
              <Clock size={16} className={timerWarning ? 'text-red-400' : 'text-slate-400'} />
              {fmtTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{answeredCount}/{questions.length} answered</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        {q && (
          <div className="glass-card space-y-6">
            {q.topic && (
              <span className="bg-primary-600/10 text-primary-400 border border-primary-500/20 text-xs font-bold px-3 py-1 rounded-full">
                {q.topic}
              </span>
            )}
            <h2 className="text-xl font-bold text-white leading-relaxed">{q.question}</h2>

            {/* Options */}
            <div className="space-y-3">
              {q.options?.map((opt, i) => {
                const selected = answers[currentIndex] === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 group
                      ${selected
                        ? 'border-primary-500 bg-primary-500/10 text-white shadow-glow'
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70 text-slate-300'
                      }`}
                  >
                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm shrink-0 transition-all ${
                      selected ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}>
                      {OPTION_LETTERS[i]}
                    </span>
                    <span className="font-medium text-sm leading-relaxed">{opt}</span>
                    {selected && <CheckCircle size={18} className="ml-auto text-primary-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Navigator */}
        <div className="glass-card space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Navigator</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-9 h-9 rounded-lg text-xs font-black border transition-all ${
                  i === currentIndex
                    ? 'bg-primary-600 border-primary-500 text-white shadow-glow'
                    : answers[i] !== null
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Nav Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 px-5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} /> Prev
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 px-5 rounded-xl transition-all"
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3 px-8 rounded-xl transition-all shadow-glow disabled:opacity-50"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {submitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          )}
        </div>

        {/* Submit shortcut if not on last question */}
        {currentIndex < questions.length - 1 && answeredCount === questions.length && (
          <div className="text-center">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3 px-8 rounded-xl transition-all shadow-glow disabled:opacity-50"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              All Answered — Submit Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
