import React, { useState, useEffect } from 'react';
import { CheckCircle, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { api } from '../../lib/api';

const QUESTIONS = [
  { id: 'q1', section: 'Employment Status', question: 'Are you currently employed?', type: 'radio', options: ['Yes, employed full-time', 'Yes, employed part-time', 'Self-employed / Freelance', 'Not yet employed', 'Pursuing further studies'] },
  { id: 'q2', section: 'Employment Status', question: 'How long did it take you to find your first job after graduation?', type: 'radio', options: ['Less than 1 month', '1–3 months', '4–6 months', '7–12 months', 'More than 1 year', 'Not applicable'] },
  { id: 'q3', section: 'Employment Details', question: 'Is your current job related to your course/program?', type: 'radio', options: ['Very related', 'Somewhat related', 'Not related', 'Not applicable'] },
  { id: 'q4', section: 'Employment Details', question: 'What industry are you currently working in?', type: 'radio', options: ['Information Technology', 'Business / Finance', 'Tourism / Hospitality', 'Education', 'Healthcare', 'Government', 'Other'] },
  { id: 'q5', section: 'Employment Details', question: 'What is your current job title / position?', type: 'text', placeholder: 'e.g. Software Engineer, Front Desk Officer' },
  { id: 'q6', section: 'Employment Details', question: 'What is your employer\'s name and location?', type: 'text', placeholder: 'e.g. TechCorp, Cebu City' },
  { id: 'q7', section: 'Further Studies', question: 'Are you currently pursuing or planning to pursue further studies?', type: 'radio', options: ['Yes, currently enrolled', 'Yes, planning to enroll', 'No'] },
  { id: 'q8', section: 'Feedback', question: 'How would you rate the quality of education you received from Asian College?', type: 'radio', options: ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'] },
  { id: 'q9', section: 'Feedback', question: 'Which skills from your program have been most useful in your career?', type: 'textarea', placeholder: 'Share the skills, subjects, or experiences that helped you most...' },
  { id: 'q10', section: 'Feedback', question: 'Do you have any suggestions to improve the curriculum or alumni services?', type: 'textarea', placeholder: 'Your honest feedback helps us improve...' },
];

const SECTIONS = [...new Set(QUESTIONS.map(q => q.section))];

// Maps question 1's answer to the standard employment-status values the
// backend tracks on the alumni profile.
function deriveEmploymentStatus(q1Answer: string | undefined): string {
  if (!q1Answer) return 'Unemployed';
  if (q1Answer.startsWith('Yes')) return 'Employed';
  if (q1Answer.startsWith('Self-employed')) return 'Self-Employed';
  if (q1Answer.startsWith('Pursuing')) return 'Pursuing Studies';
  return 'Unemployed';
}

export default function TracerSurveyAlumni() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [noSurvey, setNoSurvey] = useState(false);

  useEffect(() => {
    api.get('/surveys').then((res) => {
      const active = res.surveys.find((s: any) => s.status === 'Active');
      if (active) setActiveSurveyId(active.id);
      else setNoSurvey(true);
    });
  }, []);

  const sectionQuestions = QUESTIONS.filter(q => q.section === SECTIONS[currentSection]);
  const totalAnswered = Object.keys(answers).length;
  const progress = (totalAnswered / QUESTIONS.length) * 100;

  const setAnswer = (id: string, val: string) => setAnswers(a => ({ ...a, [id]: val }));

  const handleSubmit = async () => {
    if (!activeSurveyId) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/surveys/${activeSurveyId}/responses`, {
        employmentStatus: deriveEmploymentStatus(answers.q1),
        currentCompany: answers.q6 || undefined,
        position: answers.q5 || undefined,
        answers,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (noSurvey) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-3">
        <h2 className="text-xl font-bold text-gray-800">No open surveys right now</h2>
        <p className="text-sm text-gray-500">There isn't a tracer survey open for responses at the moment. Check back later.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-5">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Survey Submitted!</h2>
        <p className="text-gray-500">Thank you, your response has been recorded. Your data helps Asian College improve its programs and alumni services.</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
          <p className="text-sm font-semibold text-blue-800 mb-1">What happens next?</p>
          <p className="text-xs text-blue-600">Your responses will be anonymized and included in the department tracer report. You may update your survey once per semester.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Tracer Survey</h2>
        <p className="text-sm text-gray-500">Help us track your employment journey and improve our programs</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Survey Progress</span>
          <span className="text-sm font-bold text-blue-700">{totalAnswered}/{QUESTIONS.length} answered</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#1B3A6B,#2B5BA8)' }} />
        </div>
        <div className="flex items-center gap-2">
          {SECTIONS.map((s, i) => (
            <button key={s} onClick={() => setCurrentSection(i)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${currentSection === i ? 'text-white' : i < currentSection ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              style={currentSection === i ? { background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' } : {}}>
              {i < currentSection ? '✓ ' : ''}{s}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
        <h3 className="font-bold text-gray-800 text-lg border-b pb-3">{SECTIONS[currentSection]}</h3>
        {sectionQuestions.map((q, qi) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">{qi + 1}. {q.question}</p>
            {q.type === 'radio' && q.options && (
              <div className="space-y-2">
                {q.options.map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[q.id] === opt ? 'border-blue-600' : 'border-gray-300'}`}>
                      {answers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                    </div>
                    <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} className="hidden" />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'text' && (
              <input value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)}
                placeholder={q.placeholder} className="w-full text-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400" />
            )}
            {q.type === 'textarea' && (
              <textarea value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)}
                placeholder={q.placeholder} rows={4} className="w-full text-sm border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-400 resize-none" />
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentSection(s => Math.max(0, s - 1))} disabled={currentSection === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {currentSection < SECTIONS.length - 1 ? (
          <button onClick={() => setCurrentSection(s => s + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#1B3A6B,#2B5BA8)' }}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
            <Send className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Survey'}
          </button>
        )}
      </div>
    </div>
  );
}
