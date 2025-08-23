import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

// Redux
import { resetPassword, clearError, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

// Components
import { Button, Input, Card } from '../../components/common';

// Icons
import { LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode'); // Firebase uses oobCode for password reset
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
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

  // Check if we have a valid token
  useEffect(() => {
    if (!token && !oobCode) {
      toast.error('Invalid or missing reset token');
      navigate('/forgot-password');
    }
  }, [token, oobCode, navigate]);

  const onSubmit = async (data) => {
    try {
      const resetData = {
        oobCode: oobCode || token, // Use Firebase oobCode or fallback to token
        newPassword: data.password
      };

      await dispatch(resetPassword(resetData)).unwrap();
      setResetSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Password reset failed:', error);
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="py-8 px-4 shadow-elevation-2 sm:rounded-lg sm:px-10">
            <div className="text-center">
              <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Password updated successfully
              </h2>
              <p className="text-gray-600 mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              
              <Link to="/login">
                <Button fullWidth>
                  Continue to sign in
                </Button>
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
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow-elevation-2 sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              icon={LockClosedIcon}
              placeholder="Enter your new password"
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
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
                }
              })}
            />

            <Input
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              icon={LockClosedIcon}
              placeholder="Confirm your new password"
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

            {/* Password requirements */}
            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  At least 6 characters long
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  Contains uppercase and lowercase letters
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  Contains at least one number
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isLoading}
              disabled={!watch('password') || !watch('confirmPassword')}
            >
              {isLoading ? 'Updating password...' : 'Update password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
            >
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

export default ResetPasswordPage;
