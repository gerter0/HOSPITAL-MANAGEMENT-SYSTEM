import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';

const SecuritySetupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get registration data from location state
  const registrationData = location.state?.registrationData;

  useEffect(() => {
    if (!registrationData || !registrationData.password) {
      navigate('/register');
      return;
    }
    fetchSecurityQuestions();
  }, [registrationData, navigate]);

  const fetchSecurityQuestions = async () => {
    try {
      const response = await apiClient.get('/auth/security-questions/available');
      setSecurityQuestions(response.data.data.questions);
    } catch (err) {
      console.error('Failed to fetch security questions:', err);
      setError('Failed to load security questions. Please try again.');
    }
  };

  const handleQuestionSelect = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        // Remove question and its answer
        const newSelected = prev.filter(id => id !== questionId);
        const newAnswers = { ...answers };
        delete newAnswers[questionId];
        setAnswers(newAnswers);
        return newSelected;
      } else if (prev.length < 3) {
        // Add question
        return [...prev, questionId];
      }
      return prev;
    });
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (selectedQuestions.length < 3) {
      setError('Please select and answer at least 3 security questions.');
      setIsLoading(false);
      return;
    }

    // Check if all selected questions have answers
    const unanswered = selectedQuestions.filter(qId => !answers[qId]?.trim());
    if (unanswered.length > 0) {
      setError('Please provide answers for all selected security questions.');
      setIsLoading(false);
      return;
    }

    try {
      const securityAnswers = selectedQuestions.map(questionId => ({
        question_id: questionId,
        answer: answers[questionId].trim()
      }));

      const payload = {
        questions: securityAnswers
      };

      // First login to get authentication token
      const loginResponse = await apiClient.post('/auth/login', {
        email: registrationData.email,
        password: registrationData.password
      });

      // Set auth token for subsequent requests
      const token = loginResponse.data.data.token;
      localStorage.setItem('token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Setup security questions
      await apiClient.post('/auth/security-questions/setup', payload);
      setSuccess('Account created successfully! Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Security setup error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to complete account setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!registrationData) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Get to Know You</h1>
        <p className="text-center text-gray-600 mb-8">
          Security Setup - Please select and answer at least 3 security questions
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityQuestions.map(question => (
              <div key={question.question_id} className="border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={`question-${question.question_id}`}
                    checked={selectedQuestions.includes(question.question_id)}
                    onChange={() => handleQuestionSelect(question.question_id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`question-${question.question_id}`}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      {question.question_text}
                    </label>
                    {selectedQuestions.includes(question.question_id) && (
                      <input
                        type="text"
                        value={answers[question.question_id] || ''}
                        onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                        className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-indigo-500"
                        placeholder="Your answer..."
                        required
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Selected:</strong> {selectedQuestions.length}/3 questions
              {selectedQuestions.length < 3 && (
                <span className="text-red-600 ml-2">
                  (Please select {3 - selectedQuestions.length} more)
                </span>
              )}
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedQuestions.length < 3}
              className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition duration-200"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecuritySetupPage;