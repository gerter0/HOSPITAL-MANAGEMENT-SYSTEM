import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { FiArrowLeft, FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    valid_id: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    blood_group: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_history_summary: '',
    allergies: '',
    current_medications: '',
    insurance_provider: '',
    insurance_policy_number: '',
  });

  const genders = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'India', 'Other'];
  const nationalities = ['American', 'Canadian', 'British', 'Australian', 'Indian', 'Filipino', 'Other'];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching profile from /api/v1/patients/profile');
        const response = await apiClient.get('/patients/profile');
        console.log('✅ Profile response:', response.data);
        
        const profileData = response.data.data;

        if (!profileData) {
          throw new Error('No profile data received from server');
        }

        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
          phone_number: profileData.phone_number || '',
          date_of_birth: profileData.date_of_birth ? profileData.date_of_birth.split('T')[0] : '',
          gender: profileData.gender || '',
          nationality: profileData.nationality || '',
          valid_id: profileData.valid_id || '',
          address: profileData.address || '',
          city: profileData.city || '',
          state: profileData.state || '',
          postal_code: profileData.postal_code || '',
          country: profileData.country || '',
          blood_group: profileData.blood_group || '',
          emergency_contact_name: profileData.emergency_contact_name || '',
          emergency_contact_phone: profileData.emergency_contact_phone || '',
          medical_history_summary: profileData.medical_history_summary || '',
          allergies: profileData.allergies || '',
          current_medications: profileData.current_medications || '',
          insurance_provider: profileData.insurance_provider || '',
          insurance_policy_number: profileData.insurance_policy_number || '',
        });
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching profile:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url
        });
        setError(err.response?.data?.message || err.message || 'Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required';
    
    if (formData.phone_number && !/^\d{10,}$/.test(formData.phone_number.replace(/\D/g, ''))) {
      newErrors.phone_number = 'Please enter a valid phone number (at least 10 digits)';
    }

    if (formData.emergency_contact_phone && !/^\d{10,}$/.test(formData.emergency_contact_phone.replace(/\D/g, ''))) {
      newErrors.emergency_contact_phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);
      setSuccess(false);
      setError(null);

      // Build payload with only non-empty fields to avoid validation errors on optional empty strings
      const payload = {};
      if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
      if (formData.gender) payload.gender = formData.gender;
      if (formData.nationality) payload.nationality = formData.nationality;
      if (formData.valid_id) payload.valid_id = formData.valid_id;
      if (formData.address) payload.address = formData.address;
      if (formData.city) payload.city = formData.city;
      if (formData.state) payload.state = formData.state;
      if (formData.postal_code) payload.postal_code = formData.postal_code;
      if (formData.country) payload.country = formData.country;
      if (formData.blood_group) payload.blood_group = formData.blood_group;
      if (formData.emergency_contact_name) payload.emergency_contact_name = formData.emergency_contact_name;
      if (formData.emergency_contact_phone) payload.emergency_contact_phone = formData.emergency_contact_phone;
      if (formData.medical_history_summary) payload.medical_history_summary = formData.medical_history_summary;
      if (formData.allergies) payload.allergies = formData.allergies;
      if (formData.current_medications) payload.current_medications = formData.current_medications;
      if (formData.insurance_provider) payload.insurance_provider = formData.insurance_provider;
      if (formData.insurance_policy_number) payload.insurance_policy_number = formData.insurance_policy_number;

      await apiClient.post('/patients/profile', payload);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error updating profile:', err);
      console.error('Full error response:', {
        message: err.response?.data?.message,
        data: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      if (err.response?.data?.details) {
        console.error('Validation errors:', JSON.stringify(err.response.data.details, null, 2));
      }
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getInputClasses = (field) => {
    const baseClasses = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition';
    return errors[field]
      ? `${baseClasses} border-red-500 focus:ring-red-200 bg-red-50`
      : `${baseClasses} border-gray-300 focus:ring-blue-500`;
  };

  const renderFieldError = (field) => {
    if (!errors[field]) return null;
    return (
      <p className="mt-1 text-sm text-red-600" role="alert">
        {errors[field]}
      </p>
    );
  };

  const handleProfileSettings = () => {
    navigate('/profile-settings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/patient')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <FiArrowLeft className="text-xl" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <FiCheckCircle className="text-green-600 text-xl" />
            <p className="text-green-800 font-medium">Profile updated successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <FiAlertCircle className="text-red-600 text-xl" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            {/* Personal Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-indigo-600">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={getInputClasses('first_name')}
                    placeholder="John"
                  />
                  {renderFieldError('first_name')}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={getInputClasses('last_name')}
                    placeholder="Doe"
                  />
                  {renderFieldError('last_name')}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className={getInputClasses('phone_number')}
                    placeholder="+1 (555) 000-0000"
                  />
                  {renderFieldError('phone_number')}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className={getInputClasses('date_of_birth')}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={getInputClasses('gender')}
                  >
                    <option value="">Select Gender</option>
                    {genders.map(g => (
                      <option key={g} value={g}>{g.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Demographic Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-indigo-600">
                Demographic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nationality */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nationality
                  </label>
                  <select
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className={getInputClasses('nationality')}
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Valid ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid ID / Passport Number
                  </label>
                  <input
                    type="text"
                    name="valid_id"
                    value={formData.valid_id}
                    onChange={handleInputChange}
                    className={getInputClasses('valid_id')}
                    placeholder="ID or Passport Number"
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-indigo-600">
                Address Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Street Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={getInputClasses('address')}
                    placeholder="123 Main Street"
                    rows="2"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={getInputClasses('city')}
                    placeholder="New York"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State / Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={getInputClasses('state')}
                    placeholder="NY"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    className={getInputClasses('postal_code')}
                    placeholder="10001"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className={getInputClasses('country')}
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Medical Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-indigo-600">
                Medical Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleInputChange}
                    className={getInputClasses('blood_group')}
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {/* Allergies */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    className={getInputClasses('allergies')}
                    placeholder="List any allergies (e.g., Penicillin, Nuts, Dairy)"
                    rows="3"
                  />
                </div>

                {/* Current Medications */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Medications
                  </label>
                  <textarea
                    name="current_medications"
                    value={formData.current_medications}
                    onChange={handleInputChange}
                    className={getInputClasses('current_medications')}
                    placeholder="List current medications (e.g., Aspirin 100mg daily)"
                    rows="3"
                  />
                </div>

                {/* Medical History */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Medical History Summary
                  </label>
                  <textarea
                    name="medical_history_summary"
                    value={formData.medical_history_summary}
                    onChange={handleInputChange}
                    className={getInputClasses('medical_history_summary')}
                    placeholder="Describe any past medical conditions, surgeries, or treatments"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-indigo-600">
                Emergency Contact
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Emergency Contact Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                    className={getInputClasses('emergency_contact_name')}
                    placeholder="Jane Doe"
                  />
                </div>

                {/* Emergency Contact Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                    className={getInputClasses('emergency_contact_phone')}
                    placeholder="+1 (555) 000-0000"
                  />
                  {renderFieldError('emergency_contact_phone')}
                </div>
              </div>
            </div>

            {/* Insurance Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-indigo-600">
                Insurance Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insurance Provider */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    name="insurance_provider"
                    value={formData.insurance_provider}
                    onChange={handleInputChange}
                    className={getInputClasses('insurance_provider')}
                    placeholder="Your Insurance Company"
                  />
                </div>

                {/* Insurance Policy Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    name="insurance_policy_number"
                    value={formData.insurance_policy_number}
                    onChange={handleInputChange}
                    className={getInputClasses('insurance_policy_number')}
                    placeholder="POL-1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                <FiSave />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/patient')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
