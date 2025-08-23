import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

// Redux
import { registerBusiness, clearError, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

// Components
import { Button, Input, Select, Card } from '../../components/common';

// Icons
import { 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  UserIcon, 
  LockClosedIcon,
  PhoneIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm({
    defaultValues: {
      // Business Information
      businessName: '',
      businessEmail: '',
      industry: '',
      
      // Admin User Information  
      firstName: '',
      lastName: '',
      adminEmail: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  const watchedPassword = watch('password');

  // Clear errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Show error toast when auth error changes
  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  const industryOptions = [
    { value: '', label: 'Select industry', disabled: true },
    { value: 'technology', label: 'Technology' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'retail', label: 'Retail' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'other', label: 'Other' }
  ];

  const onSubmit = async (data) => {
    try {
      const registrationData = {
        businessName: data.businessName,
        businessEmail: data.businessEmail,
        industry: data.industry,
        adminEmail: data.adminEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        password: data.password
      };

      await dispatch(registerBusiness(registrationData)).unwrap();
      toast.success('Business account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const nextStep = async () => {
    // Validate current step fields
    const step1Fields = ['businessName', 'businessEmail', 'industry'];
    const isStep1Valid = await trigger(step1Fields);
    
    if (isStep1Valid) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create your business account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= 1 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-500'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              currentStep >= 2 ? 'bg-primary-600' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= 2 ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-500'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>Business Info</span>
            <span>Admin Account</span>
          </div>
        </div>

        <Card className="py-8 px-4 shadow-elevation-2 sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)}>
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
                  <p className="text-sm text-gray-500">Tell us about your company</p>
                </div>

                <Input
                  label="Business Name"
                  type="text"
                  required
                  icon={BuildingOfficeIcon}
                  placeholder="Enter your business name"
                  error={errors.businessName?.message}
                  {...register('businessName', {
                    required: 'Business name is required',
                    minLength: {
                      value: 2,
                      message: 'Business name must be at least 2 characters'
                    }
                  })}
                />

                <Input
                  label="Business Email"
                  type="email"
                  required
                  icon={EnvelopeIcon}
                  placeholder="Enter business email address"
                  error={errors.businessEmail?.message}
                  {...register('businessEmail', {
                    required: 'Business email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />

                <Select
                  label="Industry"
                  required
                  options={industryOptions}
                  error={errors.industry?.message}
                  {...register('industry', {
                    required: 'Please select an industry'
                  })}
                />

                <Button
                  type="button"
                  fullWidth
                  onClick={nextStep}
                >
                  Continue to Admin Setup
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Admin Account</h3>
                  <p className="text-sm text-gray-500">Create the administrator account for your business</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    type="text"
                    required
                    icon={UserIcon}
                    placeholder="First name"
                    error={errors.firstName?.message}
                    {...register('firstName', {
                      required: 'First name is required',
                      minLength: {
                        value: 1,
                        message: 'First name is required'
                      }
                    })}
                  />

                  <Input
                    label="Last Name"
                    type="text"
                    required
                    icon={UserIcon}
                    placeholder="Last name"
                    error={errors.lastName?.message}
                    {...register('lastName', {
                      required: 'Last name is required',
                      minLength: {
                        value: 1,
                        message: 'Last name is required'
                      }
                    })}
                  />
                </div>

                <Input
                  label="Admin Email"
                  type="email"
                  required
                  icon={EnvelopeIcon}
                  placeholder="Admin email address"
                  error={errors.adminEmail?.message}
                  {...register('adminEmail', {
                    required: 'Admin email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  icon={PhoneIcon}
                  placeholder="Phone number (optional)"
                  error={errors.phone?.message}
                  {...register('phone')}
                />

                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  icon={LockClosedIcon}
                  placeholder="Create a password"
                  error={errors.password?.message}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('password')}
                      className="pr-3 text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  }
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                />

                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  icon={LockClosedIcon}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword?.message}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="pr-3 text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  }
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === watchedPassword || 'Passwords do not match'
                  })}
                />

                <div className="flex items-center">
                  <input
                    id="agree-terms"
                    name="agree-terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
                    I agree to the{' '}
                    <a href="/terms" className="text-primary-600 hover:text-primary-500">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-primary-600 hover:text-primary-500">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    loading={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2024 Employee Evaluation System. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
