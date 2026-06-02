import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const StudySubjects = () => {
  const { API_URL } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const uniqueSubjects = React.useMemo(() => {
    return Array.from(new Map(subjects.map((subject) => [subject.title?.toLowerCase().trim() || subject.slug || subject._id, subject])).values());
  }, [subjects]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await axios.get(`${API_URL}/study/class-materials`);
        setSubjects(res.data.subjects || []);
        if (res.data.subjects?.length) {
          setSelected(res.data.subjects[0]);
        }
      } catch (err) {
        console.error('StudySubjects fetch error:', err);
        setError(err.response?.data?.message || 'Unable to load subjects.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [API_URL]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-slate-400">Loading subjects...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-rose-400">{error}</div>
      </Card>
    );
  }

  if (!subjects.length) {
    return (
      <Card className="p-6">
        <div className="text-center text-slate-400">No subjects available for your class yet.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="xl:w-1/3 space-y-4">
          <div>
            <p className="text-sm text-emerald-400 uppercase tracking-[0.2em] mb-2">Study by Subject</p>
            <h3 className="text-2xl font-bold">Choose a subject to begin learning</h3>
            <p className="text-slate-400 mt-2">Pick a subject and explore curated fundamentals and practice tips.</p>
          </div>

          <div className="grid gap-3">
            {uniqueSubjects.map((subject) => (
              <button
                key={subject._id}
                type="button"
                className={`w-full text-left rounded-2xl border p-4 transition-all ${selected?._id === subject._id ? 'border-primary-400 bg-primary-500/10 text-white' : 'border-white/10 bg-slate-950 text-slate-300 hover:border-primary-400 hover:bg-white/5'}`}
                onClick={() => setSelected(subject)}
              >
                <p className="font-semibold">{subject.title}</p>
                <p className="text-sm text-slate-400 mt-1">{subject.shortTitle || subject.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:w-2/3 bg-slate-950 rounded-3xl p-6 border border-white/10">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-sm text-emerald-400 uppercase tracking-[0.2em]">{selected?.title}</p>
              <h4 className="text-3xl font-bold mt-2">{selected?.shortTitle || selected?.description}</h4>
            </div>
            <span className="inline-flex rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-200">Easy to follow</span>
          </div>

          <p className="text-slate-400 mb-6">{selected?.description}</p>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="font-medium text-white">Chapters</p>
              <p className="text-slate-400 mt-1">{selected?.chapterCount ?? '—'} chapters available</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="font-medium text-white">Completion</p>
              <p className="text-slate-400 mt-1">{selected?.progress ?? 0}% complete</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate(`/student/study/${selected._id}`)}
              className="w-full sm:w-auto bg-primary-500 hover:bg-primary-400 text-white px-5 py-3 rounded-2xl font-semibold transition"
            >
              Start Learning
            </button>
            <button
              type="button"
              onClick={() => navigate(`/student/study/${selected._id}`)}
              className="w-full sm:w-auto border border-white/10 hover:border-primary-400 hover:bg-white/5 text-slate-200 px-5 py-3 rounded-2xl font-semibold transition"
            >
              View Resources
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StudySubjects;
