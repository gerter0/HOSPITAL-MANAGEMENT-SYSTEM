import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

const AccountRecoveryPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email', 'verify', 'questions', 'success'
  const [email, setEmail] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendVerification = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/account-recovery/initiate', { email });
      const message = response.data?.message;

      if (message?.includes('Account is not locked')) {
        setError(message);
      } else {
        setSuccess('A recovery PIN has been sent to your email. Copy it into the form below.');
        setStep('verify');
      }
    } catch (err) {
      console.error('Send verification error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to initiate recovery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/account-recovery/verify-email', {
        email,
        pin: recoveryPin,
      });

      const token = response.data.data.token_id;
      setTokenId(token);
      setSuccess('Recovery PIN verified! Please answer your security questions.');

      await fetchSecurityQuestions(token);
      setStep('questions');
    } catch (err) {
      console.error('Verify email error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Invalid or expired recovery PIN.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSecurityQuestions = async (tokenId) => {
    try {
      const response = await apiClient.post('/auth/account-recovery/questions', {
        token_id: tokenId,
      });

      const questions = response.data.data.questions || [];
      setSecurityQuestions(questions);

      if (!questions.length) {
        setError('No security questions found for this account.');
      }
    } catch (err) {
      console.error('Fetch security questions error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Unable to load security questions. Please try again.');
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitAnswers = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Check if all questions have answers
    const unanswered = securityQuestions.filter(q => !answers[q.question_id]?.trim());
    if (unanswered.length > 0) {
      setError('Please answer all security questions.');
      setIsLoading(false);
      return;
    }

    try {
      const securityAnswers = securityQuestions.map(question => ({
        question_id: question.question_id,
        answer: answers[question.question_id].trim(),
      }));

      await apiClient.post('/auth/account-recovery/complete', {
        token_id: tokenId,
        answers: securityAnswers,
      });

      setSuccess('Account unlocked successfully! You can now login.');
      setStep('success');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Complete recovery error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to unlock account. Please check your answers.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <form onSubmit={handleSendVerification} className="space-y-4">
      <div>
        <label className="block text-gray-700 font-medium mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          placeholder="your@email.com"
        />
        <p className="text-sm text-gray-600 mt-2">
          Enter the email address associated with your locked account.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Sending...' : 'Send Verification Code'}
      </button>
    </form>
  );

  const renderVerifyStep = () => (
    <form onSubmit={handleVerifyEmail} className="space-y-4">
      <div>
        <p className="text-gray-700 mb-4">
          A recovery PIN has been sent to your email. Paste the PIN below to continue.
        </p>
        <label className="block text-gray-700 font-medium mb-2">
          Recovery PIN
        </label>
        <input
          type="text"
          value={recoveryPin}
          onChange={(e) => setRecoveryPin(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          placeholder="Enter recovery PIN"
        />
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setStep('email')}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </button>
      </div>
    </form>
  );

  const renderQuestionsStep = () => (
    <form onSubmit={handleSubmitAnswers} className="space-y-4">
      <div className="space-y-4">
        {securityQuestions.map(question => (
          <div key={question.question_id}>
            <label className="block text-gray-700 font-medium mb-2">
              {question.question_text}
            </label>
            <input
              type="text"
              value={answers[question.question_id] || ''}
              onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              placeholder="Your answer..."
            />
          </div>
        ))}
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setStep('verify')}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Unlocking...' : 'Unlock Account'}
        </button>
      </div>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Account Unlocked!</h3>
      <p className="text-gray-600">You can now login with your credentials.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Account Recovery</h1>
        <p className="text-center text-gray-600 mb-8">
          Unlock your account by verifying your identity
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {step === 'email' && renderEmailStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'questions' && renderQuestionsStep()}
        {step === 'success' && renderSuccessStep()}

        <p className="text-center text-gray-600 mt-6 text-sm">
          Remember your password?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-indigo-600 hover:underline font-medium"
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default AccountRecoveryPage;