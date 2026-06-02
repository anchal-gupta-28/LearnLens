import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const classOptions = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

const StudentClassSelection = () => {
  const { user, updateClass, selectedSubject } = useAuth();
  const [studentClass, setStudentClass] = useState(user?.studentClass || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!studentClass) {
      setError('Please choose a class to continue.');
      return;
    }

    try {
      console.log('Submitting class update', studentClass);
      setSaving(true);
      await updateClass(studentClass);
      navigate('/student/subjects');
    } catch (err) {
      console.error('Class update error', err.response?.data || err.message || err);
      setError(err.response?.data?.message || 'Unable to update class.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
      <div className="glass-card p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Choose your class</h1>
        <p className="text-slate-400 mb-8">Select your current grade so LearnLens can show the right subjects.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-left text-sm font-medium text-slate-300 mb-2">Class</label>
            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Select Class</option>
              {classOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full py-4 text-lg">
            {saving ? 'Saving...' : 'Save Class'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentClassSelection;
