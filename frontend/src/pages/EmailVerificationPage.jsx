import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // email, pin
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pinDisplay, setPinDisplay] = useState(''); // For testing only

  const handleSendPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post('/auth/send-verification-pin', { email });
      setSuccess('PIN sent to your email. Check your inbox.');
      setPinDisplay(response.data.data.pin); // For testing - remove in production
      setStep('pin');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post('/auth/verify-pin', { email, pin });
      setSuccess('Email verified! Proceed to registration.');
      setRegistrationToken(response.data.data.registrationToken);
      
      // Store in localStorage and redirect to registration
      localStorage.setItem('verifiedEmail', email);
      localStorage.setItem('registrationToken', response.data.data.registrationToken);
      
      setTimeout(() => {
        navigate('/register', { state: { email, registrationToken: response.data.data.registrationToken } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">Email Verification</h1>
          <p className="text-blue-100 mt-2">Verify your email to create an account</p>
        </div>

        <form onSubmit={step === 'email' ? handleSendPin : handleVerifyPin} className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <p className="text-gray-500 text-sm mt-2">
                  We'll send a 6-digit PIN to this email address.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Sending PIN...' : 'Send PIN'}
              </button>
            </>
          )}

          {/* Step 2: PIN Verification */}
          {step === 'pin' && (
            <>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                <p className="font-semibold mb-2">Testing Mode:</p>
                <p>Your PIN: <span className="font-mono font-bold text-lg">{pinDisplay}</span></p>
                <p className="text-xs mt-2">In production, PIN will be sent via email only.</p>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Enter PIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-gray-500 text-sm mt-2">
                  Enter the 6-digit PIN sent to {email}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || pin.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify PIN'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setPin('');
                  setEmail('');
                }}
                className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Back
              </button>
            </>
          )}

          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Login here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
