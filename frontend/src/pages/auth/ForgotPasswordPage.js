import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

// Redux
import { forgotPassword, clearError, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

// Components
import { Button, Input, Card } from '../../components/common';

// Icons
import { EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ForgotPasswordPage = () => {
  const [emailSent, setEmailSent] = useState(false);
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      email: ''
    }
  });

  const watchedEmail = watch('email');

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

  const onSubmit = async (data) => {
    try {
      await dispatch(forgotPassword(data)).unwrap();
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Password reset failed:', error);
    }
  };

  const resendEmail = async () => {
    if (watchedEmail) {
      await onSubmit({ email: watchedEmail });
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="py-8 px-4 shadow-elevation-2 sm:rounded-lg sm:px-10">
            <div className="text-center">
              <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check your email
              </h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to{' '}
                <span className="font-medium text-gray-900">{watchedEmail}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or click below to resend.
              </p>
              
              <div className="space-y-3">
                <Button
                  type="button"
                  fullWidth
                  variant="outline"
                  onClick={resendEmail}
                  loading={isLoading}
                >
                  Resend email
                </Button>
                
                <Link
                  to="/login"
                  className="block w-full text-center py-2 px-4 text-sm text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
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
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow-elevation-2 sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              icon={EnvelopeIcon}
              placeholder="Enter your email address"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              disabled={!watchedEmail}
            >
              {isLoading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center text-sm text-primary-600 hover:text-primary-500 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to sign in
            </Link>
          </div>
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

export default ForgotPasswordPage;
