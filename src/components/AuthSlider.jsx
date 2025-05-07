import React, { useState } from 'react'
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Input, InputGroup, InputLeftElement, IconButton, Divider, useToast, FormControl, FormErrorMessage, Tag
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle } from 'react-icons/fi'
import { FaGoogle, FaFacebook, FaApple } from 'react-icons/fa'
import { useGoogleLogin } from '@react-oauth/google'
import { apiPost } from '../api'

const MotionBox = motion(Box)

const passwordChecks = [
  { label: 'Least 8 characters', check: (v) => v.length >= 8 },
  { label: 'Least one number (0-9) or a symbol', check: (v) => /[0-9!@#$%^&*]/.test(v) },
  { label: 'Lowercase (a-z) and uppercase (A-Z)', check: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
]

export default function AuthSlider() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${response.access_token}` },
        }).then(res => res.json())
        
        const result = await apiPost('/login', {
          email: userInfo.email,
          googleId: userInfo.sub,
          name: userInfo.name,
          googleAuth: true
        })
        
        if (result.message === 'Google login successful!') {
          toast({ title: 'Google login successful!', status: 'success' })
          window.location.href = '/dashboard'
        } else {
          throw new Error(result.error || 'Authentication failed')
        }
      } catch (err) {
        setError(err.message || 'Google authentication failed')
        toast({ 
          title: 'Google login failed', 
          description: err.message || 'Please try again',
          status: 'error',
          duration: 5000,
          isClosable: true
        })
      }
    },
    onError: (error) => {
      setError('Google login failed')
      toast({ 
        title: 'Google login failed', 
        description: error?.message || 'Please try again',
        status: 'error',
        duration: 5000,
        isClosable: true
      })
    }
  })

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
    setTouched({ ...touched, [field]: true })
  }

  const isPasswordValid = passwordChecks.every((c) => c.check(form.password))
  const isEmailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
  const isNameValid = form.name.length > 1
  const isConfirmValid = form.password === form.confirm && form.confirm.length > 0
  const canSubmit = isSignUp
    ? isPasswordValid && isEmailValid && isNameValid && isConfirmValid
    : isEmailValid && isPasswordValid

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isSignUp) {
        console.log('Signup form data:', form);
        await apiPost('/login', {
          username: form.name,
          email: form.email,
          password: form.password,
          register: true,
        })
        toast({ title: 'Registration successful! Please log in.', status: 'success' })
        setIsSignUp(false)
      } else {
        console.log('Sign in form data:', { email: form.email, password: form.password });
        await apiPost('/login', {
          email: form.email,
          password: form.password,
        })
        toast({ title: 'Login successful!', status: 'success' })
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex minH="100vh" align="center" justify="center" bg="white">
      <Box
        w={{ base: '100%', md: '900px', lg: '1000px' }}
        h={{ base: 'auto', md: '680px', lg: '760px' }}
        bg="white"
        borderRadius="3xl"
        boxShadow="2xl"
        overflow="hidden"
        display="flex"
        position="relative"
        maxW="98vw"
      >
        {/* Forms: Sign Up (left) and Sign In (right) */}
        <Flex w="100%" h="100%" position="relative" zIndex={1}>
          {/* Sign Up Form (left) */}
          <MotionBox
            w={{ base: '100%', md: '50%' }}
            h="100%"
            px={{ base: 6, md: 10, lg: 14 }}
            py={{ base: 8, md: 10, lg: 14 }}
            display="flex"
            flexDir="column"
            justifyContent="center"
            bg="rgba(255,255,255,0.55)"
            style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.15)"
            borderRight={{ base: 'none', md: '1px solid rgba(255,255,255,0.18)' }}
            as={motion.div}
            initial={false}
            animate={{ x: isSignUp ? '0%' : '-100%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            position="relative"
            zIndex={2}
          >
            <Heading fontSize="3xl" mb={2}>Sign Up</Heading>
            <Text color="gray.400" mb={8}>Join the Gym Tracker community!</Text>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4} align="stretch">
                <FormControl isInvalid={touched.name && !isNameValid}>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none" children={<FiUser color="#b4c7f8" />} />
                    <Input placeholder="Your Name" value={form.name} onChange={handleChange('name')} />
                    {isNameValid && <FiCheckCircle color="#38a169" style={{ position: 'absolute', right: 12, top: 12 }} />}
                  </InputGroup>
                  <FormErrorMessage>Name is required</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={touched.email && !isEmailValid}>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none" children={<FiMail color="#b4c7f8" />} />
                    <Input placeholder="your@email.com" value={form.email} onChange={handleChange('email')} />
                    {isEmailValid && <FiCheckCircle color="#38a169" style={{ position: 'absolute', right: 12, top: 12 }} />}
                  </InputGroup>
                  <FormErrorMessage>Enter a valid email</FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={touched.password && !isPasswordValid}>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none" children={<FiLock color="#b4c7f8" />} />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange('password')}
                    />
                    <IconButton
                      icon={showPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      size="sm"
                      position="absolute"
                      right={2}
                      top={2}
                      aria-label="Show/Hide Password"
                      onClick={() => setShowPassword((v) => !v)}
                    />
                  </InputGroup>
                  <VStack align="start" spacing={1} mt={2} fontSize="xs">
                    {passwordChecks.map((c, i) => (
                      <Text key={i} color={c.check(form.password) ? 'green.500' : 'gray.400'}>
                        {c.check(form.password) ? '✔' : '✗'} {c.label}
                      </Text>
                    ))}
                  </VStack>
                </FormControl>
                <FormControl isInvalid={touched.confirm && !isConfirmValid}>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none" children={<FiLock color="#b4c7f8" />} />
                    <Input
                      type="password"
                      placeholder="Re-Type Password"
                      value={form.confirm}
                      onChange={handleChange('confirm')}
                    />
                  </InputGroup>
                  <FormErrorMessage>Passwords must match</FormErrorMessage>
                </FormControl>
                {/* Show error message if present */}
                {error && (
                  <Text color="red.500" fontSize="sm" mb={2} textAlign="center">
                    {error}
                  </Text>
                )}
                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  mt={4}
                  isLoading={loading}
                  isDisabled={!canSubmit}
                  _hover={{ bg: '#3b5bdb', filter: 'brightness(1.1)' }}
                  as={motion.button}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  boxShadow="0 4px 24px 0 rgba(80, 112, 255, 0.15)"
                >
                  Sign Up
                </Button>
                <HStack justify="center" py={2}>
                  <Divider w="40%" />
                  <Text color="gray.400" fontSize="sm">Or</Text>
                  <Divider w="40%" />
                </HStack>
                <HStack justify="center" spacing={4}>
                  <IconButton icon={<FaFacebook />} aria-label="Facebook" variant="outline" colorScheme="facebook" />
                  <IconButton 
                    icon={<FaGoogle />} 
                    aria-label="Google" 
                    variant="outline" 
                    colorScheme="red"
                    onClick={() => googleLogin()}
                  />
                  <IconButton icon={<FaApple />} aria-label="Apple" variant="outline" colorScheme="gray" />
                </HStack>
              </VStack>
            </form>
            <HStack mt={8} justify="space-between">
              <Tag size="md" colorScheme="gray">ENG</Tag>
            </HStack>
          </MotionBox>
          {/* Sign In Form (right) */}
          <MotionBox
            w={{ base: '100%', md: '50%' }}
            h="100%"
            px={{ base: 6, md: 10, lg: 14 }}
            py={{ base: 8, md: 10, lg: 14 }}
            display="flex"
            flexDir="column"
            justifyContent="center"
            bg="rgba(255,255,255,0.85)"
            style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.10)"
            as={motion.div}
            initial={false}
            animate={{ x: isSignUp ? '100%' : '0%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            position="absolute"
            top={0}
            left={{ base: 0, md: '50%' }}
            zIndex={3}
            pointerEvents={isSignUp ? 'auto' : 'auto'}
            opacity={isSignUp ? 1 : 1}
            borderRadius="0 0 3xl 0"
          >
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={8} w="100%" maxW="340px" mx="auto">
              <Heading fontSize="2xl" fontWeight="bold">Sign in</Heading>
              <HStack spacing={4} w="100%" justify="center">
                <Button variant="ghost" colorScheme="facebook" leftIcon={<FaFacebook />} />
                <Button 
                  variant="ghost" 
                  colorScheme="red" 
                  leftIcon={<FaGoogle />}
                  onClick={() => googleLogin()}
                />
              </HStack>
              <Text color="gray.400" fontSize="sm">or use your account</Text>
              <VStack spacing={4} w="100%">
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FiMail color="gray.300" />
                  </InputLeftElement>
                    <Input placeholder="Email" type="email" bg="whiteAlpha.900" value={form.email} onChange={handleChange('email')} />
                </InputGroup>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FiLock color="gray.300" />
                  </InputLeftElement>
                    <Input placeholder="Password" type={showPassword ? 'text' : 'password'} bg="whiteAlpha.900" value={form.password} onChange={handleChange('password')} />
                    <IconButton
                      icon={showPassword ? <FiEyeOff /> : <FiEye />}
                      variant="ghost"
                      size="sm"
                      position="absolute"
                      right={2}
                      top={2}
                      aria-label="Show/Hide Password"
                      onClick={() => setShowPassword((v) => !v)}
                    />
                </InputGroup>
                  {/* Show error message if present */}
                  {error && (
                    <Text color="red.500" fontSize="sm" mb={2} textAlign="center">
                      {error}
                    </Text>
                  )}
                </VStack>
                <Text color="blue.500" fontSize="sm" alignSelf="flex-end" cursor="pointer">Forgot your password?</Text>
                <Button
                  colorScheme="blue"
                  size="lg"
                  w="100%"
                  isLoading={loading}
                  loadingText="Signing in..."
                  _hover={{ bg: '#3b5bdb', filter: 'brightness(1.1)' }}
                  as={motion.button}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  boxShadow="0 4px 24px 0 rgba(80, 112, 255, 0.15)"
                  type="submit"
                  isDisabled={!form.email || !form.password}
                >
                  SIGN IN
                </Button>
              </VStack>
            </form>
          </MotionBox>
        </Flex>
        {/* Sliding Blue Panel Overlay */}
        <MotionBox
          position="absolute"
          top={0}
          left={isSignUp ? '50%' : '0%'}
          w={{ base: '100%', md: '50%' }}
          h="100%"
          bgGradient="linear(135deg, #4f8cff 60%, #6e7ff3 100%)"
          zIndex={4}
          borderRadius="3xl"
          display={{ base: 'none', md: 'block' }}
          initial={{ opacity: 0.7, scale: 0.98, y: 30 }}
          animate={{
            left: isSignUp ? '50%' : '0%',
            opacity: 1,
            scale: 1,
            y: 0
          }}
          exit={{ opacity: 0, scale: 0.98, y: 30 }}
          transition={{ left: { duration: 0.8, ease: 'easeInOut' }, opacity: { duration: 0.5 }, scale: { duration: 0.5 }, y: { duration: 0.5 } }}
        >
          <Flex h="100%" align="center" justify="center">
            <VStack spacing={6} color="white" textAlign="center" px={10}>
              <Heading fontSize="3xl" fontWeight="extrabold">
                {isSignUp ? 'Welcome Back!' : 'Hello! Welcome!'}
              </Heading>
              <Text fontSize="lg">
                {isSignUp
                  ? 'Use your personal info to login'
                  : 'Enter your details to start up your dashboard!'}
              </Text>
              <Button
                variant="outline"
                colorScheme="whiteAlpha"
                borderColor="white"
                color="white"
                size="lg"
                onClick={() => { setIsSignUp((s) => !s); setError(''); }}
                _hover={{ bg: 'whiteAlpha.200' }}
              >
                {isSignUp ? 'SIGN IN' : 'SIGN UP'}
              </Button>
            </VStack>
          </Flex>
        </MotionBox>
      </Box>
    </Flex>
  )
}