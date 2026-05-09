import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function PatientRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Email verification states
  const [emailVerificationStep, setEmailVerificationStep] = useState('verify'); // verify, pin
  const [emailForVerification, setEmailForVerification] = useState('');
  const [usernameForVerification, setUsernameForVerification] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);

  useEffect(() => {
    // Pre-fill email if coming from previous verification
    const email = location.state?.email || '';
    if (email) {
      setEmailForVerification(email);
      setFormData(prev => ({ ...prev, email }));
    }
  }, [location]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    country_code: '+63',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    valid_id: '',
    profile_image: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_history: '',
  });

  // Countries list (sample)
  const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'India', 'Philippines', 'Other'];
  const genders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
  const nationalities = ['American', 'Canadian', 'British', 'Australian', 'Indian', 'Filipino', 'Other'];

  // Generate date options for date of birth
  const today = new Date();
  const years = Array.from({ length: 100 }, (_, i) => today.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const getInputClasses = (field) => {
    const baseClasses = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2';
    return errors[field]
      ? `${baseClasses} border-red-500 focus:ring-red-200`
      : `${baseClasses} border-gray-300 focus:ring-blue-500`;
  };

  const renderFieldError = (field) => {
    if (!errors[field]) return null;
    return (
      <p className="mt-1 text-xs text-red-600" role="alert">
        {errors[field]}
      </p>
    );
  };

  const validateForm = () => {
    console.log('🔍 Validating form data:', formData);
    const newErrors = {};

    // Username validation (should be set from email verification)
    if (!formData.username || formData.username.trim().length < 3) {
      newErrors.username = 'Username is required and must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@_-]{8,}$/;
    if (!formData.password || !passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be 8+ characters with uppercase, lowercase, and number';
    }

    // Confirm password
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    // First name and last name
    if (!formData.first_name || formData.first_name.length < 2) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name || formData.last_name.length < 2) {
      newErrors.last_name = 'Last name is required';
    }

    // Phone number validation - must start with 09 and be exactly 11 digits total
    const phoneRegex = /^09\d{9}$/;
    if (!formData.phone_number || !phoneRegex.test(formData.phone_number)) {
      newErrors.phone_number = 'Phone number must be 09 followed by 9 digits (11 digits total)';
    }

    // Emergency contact name - optional, only validate if provided
    if (formData.emergency_contact_name && formData.emergency_contact_name.trim().length < 2) {
      newErrors.emergency_contact_name = 'Emergency contact name must be at least 2 characters';
    }

    // Emergency contact phone validation - optional, only validate if provided
    if (formData.emergency_contact_phone) {
      const emergencyPhoneRegex = /^09\d{9}$/;
      if (!emergencyPhoneRegex.test(formData.emergency_contact_phone)) {
        newErrors.emergency_contact_phone = 'Emergency contact phone must be 09 followed by 9 digits (11 digits total)'
      }
    }

    // Date of birth
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else if (new Date(formData.date_of_birth) > today) {
      newErrors.date_of_birth = 'Date of birth must be in the past';
    }

    // Gender
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    // Nationality
    if (!formData.nationality) {
      newErrors.nationality = 'Nationality is required';
    }

    // Address
    if (!formData.address || formData.address.length < 5) {
      newErrors.address = 'Address is required (minimum 5 characters)';
    }

    // City, state, postal code, country
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State/Province is required';
    if (!formData.postal_code || !/^[0-9]{5}$/.test(formData.postal_code)) {
      newErrors.postal_code = 'Postal code must be exactly 5 digits';
    }
    if (!formData.country) newErrors.country = 'Country is required';

    console.log('Validation result:', newErrors);
    return newErrors;
  };

  const handleSendPin = async (e) => {
    e?.preventDefault();
    setVerificationLoading(true);
    setPinError('');
    setPinSuccess('');

    try {
      const payload = {
        email: emailForVerification.trim(),
        username: usernameForVerification.trim(),
      };
      console.log('Sending verification PIN with payload:', payload);

      const response = await apiClient.post('/auth/send-verification-pin', payload);
      console.log('Send PIN response:', response.data);
      
      // Show PIN in development mode if provided
      if (response.data.data?.pin) {
        setPinSuccess(`✅ PIN sent to your email! (Dev Mode: ${response.data.data.pin})`);
      } else {
        setPinSuccess('PIN sent to your email!');
      }
      setEmailVerificationStep('pin');
    } catch (err) {
      console.error('Send PIN error:', err.response?.data || err.message);
      setPinError(err.response?.data?.message || 'Failed to send PIN');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    e?.preventDefault();
    setVerificationLoading(true);
    setPinError('');
    setPinSuccess('');

    try {
      const payload = { email: emailForVerification.trim(), pin };
      console.log('Verifying PIN with payload:', payload);
      
      const response = await apiClient.post('/auth/verify-pin', payload);
      console.log('Verify PIN response:', response.data);
      
      setPinSuccess('Email verified successfully!');
      setRegistrationToken(response.data.data.registrationToken);
      setEmailVerified(true);
      setFormData(prev => ({ ...prev, email: emailForVerification.trim(), username: response.data.data.username || usernameForVerification.trim() }));
      setEmailVerificationStep('complete');
      setShowCredentialsForm(true);
    } catch (err) {
      console.error('Verify PIN error:', err.response?.data || err.message);
      setPinError(err.response?.data?.message || 'Invalid PIN');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔥 handleSubmit called!');
    
    const newErrors = validateForm();
    console.log('Form validation errors:', newErrors);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      console.log('❌ Form validation failed, not submitting');
      return;
    }

    if (!emailVerified) {
      setErrors({ submit: 'Please verify your email before completing registration.' });
      console.log('❌ Email not verified');
      return;
    }

    console.log('✅ Form validation passed, proceeding with submission');
    setLoading(true);
    try {
      const payload = {
        ...formData,
        username: formData.username?.trim() || '',
        email: formData.email?.trim() || '',
        medical_history: formData.medical_history?.trim() || undefined,
        registrationToken,
      };
      
      // Remove fields not in backend validator
      delete payload.profile_image;
      delete payload.country_code; // Country code is UI-only, not needed for backend
      
      console.log('Submitting registration with payload:', payload);
      console.log('Registration payload JSON:', JSON.stringify(payload, null, 2));
      console.log('API Base URL:', apiClient.defaults.baseURL);
      
      const response = await apiClient.post('/auth/register/patient', payload);
      
      console.log('Registration response:', response);
      setSuccessMessage(response.data.data.message || 'Account created successfully. Setting up security questions...');
      setErrors({});
      
      // Redirect to security setup with registration data
      setTimeout(() => {
        navigate('/security-setup', { 
          state: { 
            registrationData: { 
              email: formData.email,
              password: formData.password,
            } 
          } 
        });
      }, 2000);
    } catch (error) {
      console.error('Registration error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config,
      });
      if (error.response?.data) {
        console.error('Registration error response body:', error.response.data);
      }

      const details = error.response?.data?.details;
      const fieldErrors = Array.isArray(details)
        ? details.reduce((acc, detail) => {
            if (detail.field) {
              acc[detail.field] = detail.message;
            }
            return acc;
          }, {})
        : {};

      const detailMessage = Array.isArray(details)
        ? details.map(detail => detail.message).join('. ')
        : typeof details === 'object' && details?.message
        ? details.message
        : null;

      const errorMessage =
        error.response?.data?.message ||
        detailMessage ||
        'Registration failed. Please try again.';

      setErrors(Object.keys(fieldErrors).length > 0 ? fieldErrors : { submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Create Your Account</h1>
          <p className="text-blue-100 mt-2">Join our Hospital Management System</p>
        </div>

        {!showCredentialsForm ? (
          // Email Verification Section
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200">
                Email Verification
              </h2>
              <p className="text-gray-600 mb-4">Please verify your email address and choose a username before proceeding.</p>
            </div>

            {emailVerificationStep === 'verify' && (
              <>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={usernameForVerification}
                      onChange={(e) => setUsernameForVerification(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={emailForVerification}
                      onChange={(e) => setEmailForVerification(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSendPin}
                  disabled={
                    !emailForVerification ||
                    !usernameForVerification ||
                    verificationLoading
                  }
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verificationLoading ? 'Sending PIN...' : 'Send PIN'}
                </button>
              </>
            )}

            {emailVerificationStep === 'pin' && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter PIN *
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength="6"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">6-digit PIN sent to {emailForVerification}</p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyPin}
                  disabled={pin.length !== 6 || verificationLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                >
                  {verificationLoading ? 'Verifying...' : 'Verify PIN'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailVerificationStep('verify');
                    setPin('');
                    setPinError('');
                    setPinSuccess('');
                  }}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                  Back
                </button>
              </>
            )}

            {emailVerificationStep === 'complete' && (
              <div className="text-center">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">✓ Email verified successfully!</p>
                  <p className="text-sm text-gray-600 mt-1">Username: <strong>{formData.username}</strong> | Email: <strong>{formData.email}</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCredentialsForm(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
                >
                  Continue to Account Credentials
                </button>
              </div>
            )}

            {pinError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-2">
                {pinError}
              </div>
            )}
            {pinSuccess && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm mb-2">
                {pinSuccess}
              </div>
            )}
          </div>
        ) : (
          // Account Credentials Form
          <form onSubmit={handleSubmit} className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200">
                Account Credentials
              </h2>
              <p className="text-gray-600 mb-4">Complete your account setup with personal information.</p>
              
              {/* Username display */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Username:</strong> {formData.username} | <strong>Email:</strong> {formData.email}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  className={getInputClasses('first_name')}
                />
                {renderFieldError('first_name')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  className={getInputClasses('last_name')}
                />
                {renderFieldError('last_name')}
                
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  max={today.toISOString().split('T')[0]}
                  required
                  className={getInputClasses('date_of_birth')}
                />
                {renderFieldError('date_of_birth')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className={getInputClasses('gender')}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nationality *
              </label>
              <select
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                required
                className={getInputClasses('nationality')}
              >
                <option value="">Select Nationality</option>
                {nationalities.map(nat => (
                  <option key={nat} value={nat}>{nat}</option>
                ))}
              </select>
              {renderFieldError('nationality')}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Code
                </label>
                <select
                  name="country_code"
                  value={formData.country_code}
                  onChange={handleInputChange}
                  className={getInputClasses('country_code')}
                >
                  <option value="+63">🇵🇭 Philippines (+63)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number * (09 + 9 digits)
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="09497800326"
                  required
                  maxLength="11"
                  className={getInputClasses('phone_number')}
                />
                {renderFieldError('phone_number')}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Image (Auto-cleared when Valid ID provided)
                </label>
                <input
                  type="file"
                  name="profile_image"
                  value={formData.profile_image}
                  onChange={handleInputChange}
                  accept="image/*"
                  disabled={formData.valid_id.length > 0}
                  className={`${getInputClasses('profile_image')} ${formData.valid_id.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {formData.valid_id.length > 0 && (
                  <p className="mt-1 text-xs text-orange-600">Image field disabled: Valid ID provided</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                rows="3"
                className={getInputClasses('address')}
              />
              {renderFieldError('address')}
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="New York"
                  required
                  className={getInputClasses('city')}
                />
                {renderFieldError('city')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province *
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="NY"
                  required
                  className={getInputClasses('state')}
                />
                {renderFieldError('state')}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code * (Must 5 digits)
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  placeholder="10001"
                  required
                  className={getInputClasses('postal_code')}
                />
                <p className="mt-1 text-xs text-gray-500">Please enter exactly 5 digits</p>
                {renderFieldError('postal_code')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  className={getInputClasses('country')}
                >
                  <option value="">Select Country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {renderFieldError('country')}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name (Optional)
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className={getInputClasses('emergency_contact_name')}
                />
                {renderFieldError('emergency_contact_name')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  className={getInputClasses('emergency_contact_phone')}
                />
                {renderFieldError('emergency_contact_phone')}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical History (Optional)
              </label>
              <textarea
                name="medical_history"
                value={formData.medical_history}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any relevant medical history..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className={`${getInputClasses('password')} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L3.596 3.039M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {renderFieldError('password')}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleInputChange}
                    required
                    className={`${getInputClasses('confirm_password')} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800 focus:outline-none"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.039m10.318 10.318L3.596 3.039M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {renderFieldError('confirm_password')}
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setShowCredentialsForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Back to Email Verification
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            {errors.submit && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {errors.submit}
              </div>
            )}
            {successMessage && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {successMessage}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
