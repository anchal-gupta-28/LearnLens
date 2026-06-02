import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BookOpen, Clock, CheckCircle, AlertTriangle, Sparkles,
  ChevronRight, X, BarChart2, Target, Trophy, Zap,
  Calendar, Brain, Layers, Star, TrendingUp, ArrowRight,
  FileText, PlayCircle, RefreshCw
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────
const DIFF_BADGE = {
  Easy:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Hard:   'bg-red-500/10 text-red-400 border border-red-500/20',
};

const SCORE_COLOR = (pct) =>
  pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';

const SCORE_BG = (pct) =>
  pct >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : pct >= 60 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (s) => s ? `${Math.floor(s / 60)}m ${s % 60}s` : '—';

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const QuizSkeleton = () => (
  <div className="glass-card animate-pulse space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-4 w-3/4 bg-slate-800 rounded-full" />
        <div className="h-3 w-1/2 bg-slate-800 rounded-full" />
      </div>
      <div className="h-6 w-16 bg-slate-800 rounded-lg ml-3" />
    </div>
    <div className="flex gap-2">
      <div className="h-5 w-16 bg-slate-800 rounded-full" />
      <div className="h-5 w-16 bg-slate-800 rounded-full" />
    </div>
    <div className="h-10 w-full bg-slate-800 rounded-xl mt-2" />
  </div>
);

// ─── Review Modal ───────────────────────────────────────────────────────────────
const ReviewModal = ({ quiz, onClose }) => {
  const pct = quiz.result?.percentage ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      <div className="glass-card max-w-lg w-full space-y-6 border border-primary-500/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all">
          <X size={16} className="text-slate-400" />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2 text-xs text-primary-400 font-bold uppercase tracking-wider">
            <Trophy size={14} />Results
          </div>
          <h3 className="text-xl font-black text-white">{quiz.title}</h3>
          <p className="text-slate-400 text-sm">{quiz.subject} · {quiz.topic}</p>
        </div>

        {/* Score Banner */}
        <div className={`p-5 rounded-2xl border ${SCORE_BG(pct)} flex items-center justify-between`}>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Final Score</p>
            <p className={`text-5xl font-black ${SCORE_COLOR(pct)}`}>{pct}<span className="text-2xl">%</span></p>
            <p className="text-slate-400 text-xs mt-1">
              {quiz.result?.score} / {quiz.result?.totalQuestions} correct
            </p>
          </div>
          <div className="text-center">
            <div className={`text-6xl ${pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}`}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
            <p className={`text-xs font-bold mt-1 ${SCORE_COLOR(pct)}`}>
              {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <p className="text-slate-500 font-semibold mb-1">Completion Time</p>
            <p className="text-white font-bold">{fmtTime(quiz.result?.completionTime)}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            <p className="text-slate-500 font-semibold mb-1">Submitted</p>
            <p className="text-white font-bold">{fmt(quiz.result?.submittedAt)}</p>
          </div>
        </div>

        {/* Topic Performance */}
        {quiz.result?.topicPerformance?.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 size={14} className="text-primary-400" /> Topic Accuracy Breakdown
            </h4>
            <div className="space-y-3">
              {quiz.result.topicPerformance.map((tp, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold truncate max-w-[200px]">{tp.topic}</span>
                    <span className={`font-black ${SCORE_COLOR(tp.accuracy)}`}>{tp.accuracy}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${tp.accuracy >= 80 ? 'bg-emerald-500' : tp.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${tp.accuracy}%` }}
                    />
                  </div>
                  <p className="text-slate-500 text-[10px]">{tp.correct} / {tp.total} correct</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all border border-slate-700">
          Close
        </button>
      </div>
    </div>
  );
};

// ─── Pending Quiz Card ──────────────────────────────────────────────────────────
const PendingCard = ({ quiz, onStart }) => {
  const isOverdue = quiz.dueDate && new Date(quiz.dueDate) < new Date();
  return (
    <div className="glass-card flex flex-col gap-4 hover:border-primary-500/30 transition-all duration-300 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {quiz.isAIGenerated && (
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={9} />AI
              </span>
            )}
          </div>
          <h3 className="font-bold text-white text-base leading-snug group-hover:text-primary-300 transition-colors">{quiz.title}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{quiz.subject} · {quiz.topic}</p>
        </div>
        <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0 ${DIFF_BADGE[quiz.difficulty] || DIFF_BADGE.Medium}`}>
          {quiz.difficulty}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><FileText size={12} />{quiz.questionCount} Questions</span>
        <span className="flex items-center gap-1.5"><Clock size={12} />{quiz.duration} min</span>
        {quiz.class && <span className="flex items-center gap-1.5"><Layers size={12} />{quiz.class.name}</span>}
        {quiz.dueDate && (
          <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : ''}`}>
            <Calendar size={12} />{isOverdue ? 'Overdue: ' : 'Due: '}{fmt(quiz.dueDate)}
          </span>
        )}
      </div>

      <button
        onClick={() => onStart(quiz._id)}
        className="w-full mt-auto bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm py-3 px-5 rounded-xl transition-all shadow-glow flex items-center justify-center gap-2 active:scale-95"
      >
        <PlayCircle size={16} /> Start Quiz <ArrowRight size={14} />
      </button>
    </div>
  );
};

// ─── Completed Quiz Card ────────────────────────────────────────────────────────
const CompletedCard = ({ quiz, onReview }) => {
  const pct = quiz.result?.percentage ?? 0;
  return (
    <div className="glass-card flex flex-col gap-4 hover:border-slate-600 transition-all duration-300 group opacity-90 hover:opacity-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-base leading-snug">{quiz.title}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{quiz.subject} · {quiz.topic}</p>
        </div>
        <div className={`shrink-0 px-3 py-1.5 rounded-xl border text-center min-w-[64px] ${SCORE_BG(pct)}`}>
          <p className={`text-lg font-black leading-none ${SCORE_COLOR(pct)}`}>{pct}%</p>
          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{quiz.result?.score}/{quiz.result?.totalQuestions}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {quiz.result?.topicPerformance?.map((tp, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 truncate flex-1">{tp.topic}</span>
            <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden shrink-0">
              <div
                className={`h-full rounded-full ${tp.accuracy >= 80 ? 'bg-emerald-500' : tp.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${tp.accuracy}%` }}
              />
            </div>
            <span className={`font-bold w-8 text-right ${SCORE_COLOR(tp.accuracy)}`}>{tp.accuracy}%</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
        <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(quiz.result?.completionTime)}</span>
        <span>{fmt(quiz.result?.submittedAt)}</span>
      </div>

      <button
        onClick={() => onReview(quiz)}
        className="w-full bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
      >
        <TrendingUp size={14} /> View Detailed Results
      </button>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
const StudentQuizzes = () => {
  const { API_URL } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewQuiz, setReviewQuiz] = useState(null);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_URL}/student/quizzes`);
      setPending(res.data.pending || []);
      setCompleted(res.data.completed || []);
    } catch (err) {
      setError('Could not load quizzes. Please check that the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handleStart = (id) => navigate(`/quiz/${id}`);

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 font-sans pt-24 pb-16 px-4 md:px-8 relative overflow-hidden">
      {/* Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600/10 p-2.5 rounded-xl border border-primary-500/20">
              <Brain className="text-primary-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight font-outfit text-white">My Quizzes</h1>
              <p className="text-slate-400 text-sm mt-0.5">View assigned tests and track your performance.</p>
            </div>
          </div>
          <button
            onClick={fetchQuizzes}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: pending.length, icon: <Zap size={20} />, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
            { label: 'Completed', value: completed.length, icon: <CheckCircle size={20} />, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
            {
              label: 'Avg Score',
              value: completed.length > 0
                ? `${Math.round(completed.reduce((s, q) => s + (q.result?.percentage || 0), 0) / completed.length)}%`
                : '—',
              icon: <Target size={20} />,
              color: 'text-blue-400 border-blue-500/20 bg-blue-500/5'
            },
            {
              label: 'Best Score',
              value: completed.length > 0
                ? `${Math.max(...completed.map(q => q.result?.percentage || 0))}%`
                : '—',
              icon: <Star size={20} />,
              color: 'text-purple-400 border-purple-500/20 bg-purple-500/5'
            },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`glass-card flex items-center gap-4 border ${color}`}>
              <div className={`p-3 rounded-xl border ${color}`}>{icon}</div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl w-fit">
          {[
            { id: 'pending', label: 'Pending', icon: <Zap size={14} />, count: pending.length },
            { id: 'completed', label: 'Completed', icon: <CheckCircle size={14} />, count: completed.length },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                tab === t.id
                  ? 'bg-primary-600 text-white shadow-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.icon} {t.label}
              <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3].map(n => <QuizSkeleton key={n} />)
          ) : tab === 'pending' ? (
            pending.length > 0 ? (
              pending.map(q => (
                <PendingCard key={q._id} quiz={q} onStart={handleStart} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="text-emerald-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">All Caught Up!</h3>
                <p className="text-slate-400 text-sm">No pending quizzes. Your teacher hasn't assigned any yet.</p>
              </div>
            )
          ) : (
            completed.length > 0 ? (
              completed.map(q => (
                <CompletedCard key={q._id} quiz={q} onReview={setReviewQuiz} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary-600/10 border border-primary-500/20 rounded-2xl flex items-center justify-center">
                  <BookOpen className="text-primary-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">No Completed Quizzes Yet</h3>
                <p className="text-slate-400 text-sm">Attempt your first quiz from the Pending tab to see results here.</p>
                <button
                  onClick={() => setTab('pending')}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm py-3 px-6 rounded-xl transition-all shadow-glow"
                >
                  <PlayCircle size={16} /> View Pending Quizzes
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewQuiz && <ReviewModal quiz={reviewQuiz} onClose={() => setReviewQuiz(null)} />}
    </div>
  );
};

export default StudentQuizzes;
