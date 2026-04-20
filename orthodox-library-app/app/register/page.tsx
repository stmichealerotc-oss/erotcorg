'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const EXPERTISE_OPTIONS = [
  { value: 'text-entry',   label: '⌨️ Text Entry',        desc: 'Typing / transcribing liturgical text' },
  { value: 'translation',  label: '🔄 Translation',        desc: 'Translating between languages' },
  { value: 'review',       label: '✅ Review / Proofread', desc: 'Checking accuracy of entered content' },
  { value: 'scholar',      label: '📚 Scholar / Expert',   desc: 'Liturgical or theological expertise' },
  { value: 'it',           label: '💻 IT / Technical',     desc: 'Web, app, or data work' },
  { value: 'audio',        label: '🎙️ Audio Recording',    desc: 'Recording liturgical audio' },
  { value: 'design',       label: '🎨 Design',             desc: 'UI, graphics, or layout' },
  { value: 'coordination', label: '📋 Coordination',       desc: 'Organizing and managing volunteers' },
];

const LANG_OPTIONS = [
  { value: 'gez', label: "Ge'ez (ግዕዝ)" },
  { value: 'ti',  label: 'Tigrinya (ትግርኛ)' },
  { value: 'en',  label: 'English' },
  { value: 'am',  label: 'Amharic (አማርኛ)' },
  { value: 'ar',  label: 'Arabic' },
  { value: 'other', label: 'Other' },
];

const PROFICIENCY = ['', 'native', 'fluent', 'intermediate', 'basic'];

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1=identity, 2=skills, 3=availability
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    languages: [] as string[],
    languageProficiency: { gez: '', ti: '', en: '', am: '' } as Record<string, string>,
    expertise: [] as string[],
    hoursPerWeek: 2,
    taskSizePreference: 'any',
    availability: 'flexible',
    notes: '',
  });

  const toggleList = (field: 'languages' | 'expertise', value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const taskSize = () => {
    if (form.hoursPerWeek <= 2) return { label: 'Small tasks', color: 'text-green-600', desc: '1–2 hrs/week · e.g. 5–10 verses' };
    if (form.hoursPerWeek <= 5) return { label: 'Medium tasks', color: 'text-blue-600', desc: '3–5 hrs/week · e.g. 20–40 verses' };
    return { label: 'Large tasks', color: 'text-purple-600', desc: '6+ hrs/week · e.g. full sections' };
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/volunteers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Cannot reach server. Please try again later.');
    }
    setLoading(false);
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🙏</div>
          <h1 className="text-2xl font-bold text-green-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-2">Your registration has been received.</p>
          <p className="text-gray-500 text-sm mb-6">
            An administrator will review your profile and assign tasks that match your skills and availability.
            You'll be able to log in at the volunteer portal once assigned.
          </p>
          <Link href="/volunteer" className="block bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 mb-3">
            Go to Volunteer Portal
          </Link>
          <Link href="/" className="block text-sm text-gray-400 hover:text-gray-600">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const size = taskSize();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 text-white">
          <div className="text-4xl mb-2">✝️</div>
          <h1 className="text-2xl font-bold">Volunteer Registration</h1>
          <p className="text-green-200 text-sm">Help us digitize the Orthodox liturgical heritage</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s === step ? 'bg-white text-green-800' :
                s < step  ? 'bg-green-400 text-white' :
                'bg-green-800 text-green-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-400' : 'bg-green-800'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-16 text-xs text-green-300 mb-8">
          <span>Your Info</span>
          <span>Skills</span>
          <span>Availability</span>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-6">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          {/* ── Step 1: Identity ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">About You</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="+1 234 567 8900"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({...form, location: e.target.value})}
                    placeholder="City, Country"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!form.name || !form.email) { setError('Name and email are required'); return; }
                  setError('');
                  setStep(2);
                }}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 mt-2"
              >
                Next: Skills & Languages →
              </button>
            </div>
          )}

          {/* ── Step 2: Skills ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Skills & Languages</h2>

              {/* Languages */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Which languages can you work with? *
                </label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {LANG_OPTIONS.map(l => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => toggleList('languages', l.value)}
                      className={`px-3 py-2 rounded-lg text-sm border-2 text-left transition-all ${
                        form.languages.includes(l.value)
                          ? 'border-green-500 bg-green-50 text-green-800 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {/* Proficiency for selected languages */}
                {(['gez', 'ti', 'en', 'am'] as const).filter(l => form.languages.includes(l)).map(lang => (
                  <div key={lang} className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-gray-600 w-32">
                      {LANG_OPTIONS.find(l => l.value === lang)?.label}
                    </span>
                    <select
                      value={form.languageProficiency[lang]}
                      onChange={e => setForm({
                        ...form,
                        languageProficiency: { ...form.languageProficiency, [lang]: e.target.value }
                      })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      <option value="">Select level</option>
                      <option value="native">Native speaker</option>
                      <option value="fluent">Fluent</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="basic">Basic</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Expertise */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  What can you help with? (select all that apply) *
                </label>
                <div className="space-y-2">
                  {EXPERTISE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleList('expertise', opt.value)}
                      className={`w-full px-4 py-3 rounded-lg text-left border-2 transition-all ${
                        form.expertise.includes(opt.value)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{opt.label}</span>
                        {form.expertise.includes(opt.value) && <span className="text-green-600 text-sm">✓</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (form.languages.length === 0 || form.expertise.length === 0) {
                      setError('Please select at least one language and one area of expertise');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700"
                >
                  Next: Availability →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Availability ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Your Availability</h2>

              {/* Hours slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  How many hours per week can you contribute?
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={form.hoursPerWeek}
                    onChange={e => setForm({...form, hoursPerWeek: parseInt(e.target.value)})}
                    className="flex-1 accent-green-600"
                  />
                  <span className="text-2xl font-bold text-green-700 w-16 text-center">
                    {form.hoursPerWeek}h
                  </span>
                </div>
                <div className={`text-sm font-medium ${size.color}`}>
                  → {size.label}
                  <span className="text-gray-400 font-normal ml-2">{size.desc}</span>
                </div>
              </div>

              {/* When available */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">When are you usually available?</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'weekdays', label: '📅 Weekdays' },
                    { value: 'weekends', label: '🏖️ Weekends' },
                    { value: 'evenings', label: '🌙 Evenings' },
                    { value: 'flexible', label: '🔄 Flexible' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({...form, availability: opt.value})}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        form.availability === opt.value
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Anything else you'd like to share? (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. I'm a deacon with 10 years experience, I can help with Ge'ez pronunciation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 text-right">{form.notes.length}/500</p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-700 mb-2">Your profile summary:</p>
                <p><span className="text-gray-500">Name:</span> {form.name}</p>
                <p><span className="text-gray-500">Languages:</span> {form.languages.join(', ') || '—'}</p>
                <p><span className="text-gray-500">Skills:</span> {form.expertise.join(', ') || '—'}</p>
                <p><span className="text-gray-500">Time:</span> {form.hoursPerWeek}h/week · {form.availability}</p>
                <p className={`font-medium ${size.color}`}>Task size: {size.label}</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : '✓ Submit Registration'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-green-300 text-xs mt-4">
          Already registered?{' '}
          <Link href="/volunteer" className="underline hover:text-white">Go to Volunteer Portal</Link>
        </p>
      </div>
    </div>
  );
}
