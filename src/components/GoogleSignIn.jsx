import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { googleAuth } from '../api';
import { useNavigate } from 'react-router-dom';

const GoogleSignIn = ({ onSuccess, onError }) => {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const result = await googleAuth(response.access_token);
        if (onSuccess) {
          onSuccess(result);
        }
        // Redirect to mainboard after successful login
        navigate('/mainboard');
      } catch (error) {
        if (onError) {
          onError(error.message || 'Login failed');
        }
      }
    },
    onError: () => {
      if (onError) {
        onError('Login Failed');
      }
    },
  });

  return (
    <Button
      w="full"
      maxW="md"
      variant="outline"
      leftIcon={<FcGoogle />}
      onClick={() => login()}
      size="lg"
      _hover={{
        bg: 'gray.100',
      }}
    >
      Sign in with Google
    </Button>
  );
};

export default GoogleSignIn; 