import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';

const StudentSubjectSelection = () => {
  const { API_URL, user, setSubject } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const uniqueSubjects = React.useMemo(() => {
    return Array.from(new Map(subjects.map((subject) => [subject.title?.toLowerCase().trim() || subject.slug || subject._id, subject])).values());
  }, [subjects]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user?.studentClass) {
        navigate('/student/class');
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/study/class-materials`);
        setSubjects(res.data.subjects || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Unable to load subjects.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [API_URL, navigate, user]);

  const selectSubject = (subject) => {
    setSubject(subject);
    navigate('/student/dashboard');
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading subjects...</div>;
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-400 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-6 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Select a subject</h1>
        <p className="text-slate-400 mt-2">Choose a subject for your current class before viewing the dashboard.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {uniqueSubjects.map((subject) => (
          <Card key={subject._id} className="p-6 hover:border-primary-400 hover:bg-slate-900 transition-all">
            <div className="flex flex-col justify-between h-full">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-2">{subject.grade?.name || user.studentClass}</p>
                <h2 className="text-2xl font-bold mb-3">{subject.title}</h2>
                <p className="text-slate-400 mb-4">{subject.description}</p>
              </div>
              <button onClick={() => selectSubject(subject)} className="mt-4 btn-primary w-full py-3">
                Continue with {subject.title}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudentSubjectSelection;
