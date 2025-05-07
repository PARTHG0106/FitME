import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Avatar,
  Input,
  FormControl,
  FormLabel,
  useToast,
  HStack,
  IconButton,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  InputGroup,
  InputRightElement,
  Select,
} from '@chakra-ui/react'
import { FiEdit2, FiSave, FiCamera, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi'
import { apiGet, apiPost } from '../api'

const MotionBox = motion(Box)

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    username: '',
    name: '',
    email: '',
    height: '',
    weight: '',
    goal: '',
    profile_picture: null,
    rep_goal: 0,
    ex_goal: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({
    total_workouts: 0,
    calories_burned: 0,
    goals_achieved: 0
  })
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const [profileRes, statsRes] = await Promise.all([
        apiGet('/api/profile'),
        apiGet('/api/profile/stats')
      ])
      console.log('API response:', profileRes);
      setProfileData({
        ...profileRes,
        name: profileRes.name ?? profileRes.username ?? '',
        height: profileRes.height !== null && profileRes.height !== undefined ? String(profileRes.height) : '',
        weight: profileRes.weight !== null && profileRes.weight !== undefined ? String(profileRes.weight) : ''
      })
      console.log('After setState:', {
        ...profileRes,
        name: profileRes.name ?? profileRes.username ?? '',
        height: profileRes.height !== null && profileRes.height !== undefined ? String(profileRes.height) : '',
        weight: profileRes.weight !== null && profileRes.weight !== undefined ? String(profileRes.weight) : ''
      });
      setStats(statsRes)
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load profile'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const dataToSend = {
        ...profileData,
        height: profileData.height !== '' ? Number(profileData.height) : null,
        weight: profileData.weight !== '' ? Number(profileData.weight) : null
      }
      const res = await apiPost('/api/profile/update', dataToSend)
      setProfileData({
        ...profileData,
        ...res,
        height: res.height !== null && res.height !== undefined ? String(res.height) : '',
        weight: res.weight !== null && res.weight !== undefined ? String(res.weight) : ''
      })
    setIsEditing(false)
    toast({
      title: 'Profile Updated',
      description: 'Your changes have been saved successfully.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field) => (e) => {
    setProfileData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handlePasswordChange = async () => {
    if (!newPassword) {
      toast({
        title: 'Error',
        description: 'Please enter a new password',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await apiPost('/api/profile/change-password', { new_password: newPassword })
      toast({
        title: 'Success',
        description: 'Password updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      setNewPassword('')
      onClose()
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update password'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const formData = new FormData()
    formData.append('profile_picture', file)

    try {
      const res = await apiPost('/api/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setProfileData(prev => ({
        ...prev,
        profile_picture: res.profile_picture_url
      }))
      toast({
        title: 'Success',
        description: 'Profile picture updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile picture'
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (loading && !profileData.username) return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>
  if (error && !profileData.username) return <Alert status="error" my={8}><AlertIcon />{error}</Alert>

  return (
    <Box maxW="800px" mx="auto" py={8}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <VStack spacing={8} align="stretch">
          {/* Profile Header */}
          <MotionBox
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <HStack spacing={6} align="center">
              <Box position="relative">
                <Avatar
                  size="2xl"
                  name={profileData.name ?? profileData.username ?? ''}
                  src={profileData.profile_picture}
                />
                <IconButton
                  icon={<FiCamera />}
                  isRound
                  size="sm"
                  position="absolute"
                  bottom={0}
                  right={0}
                  colorScheme="blue"
                  onClick={() => document.getElementById('profile-picture-input').click()}
                  aria-label="Change photo"
                />
                <input
                  id="profile-picture-input"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  style={{ display: 'none' }}
                />
              </Box>
              <VStack align="start" flex={1}>
                <Heading size="lg">{profileData.name ?? profileData.username ?? ''}</Heading>
                <Text color="gray.600">{profileData.email}</Text>
              </VStack>
              <HStack>
              <Button
                leftIcon={isEditing ? <FiSave /> : <FiEdit2 />}
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                colorScheme={isEditing ? 'green' : 'blue'}
                variant={isEditing ? 'solid' : 'outline'}
                  isLoading={saving}
                  loadingText="Saving..."
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                as={motion.button}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
                <Button
                  variant="outline"
                  onClick={onOpen}
                >
                  Change Password
                </Button>
              </HStack>
            </HStack>
          </MotionBox>

          <Divider />

          {/* Profile Details */}
          <MotionBox
            bg="white"
            p={6}
            borderRadius="lg"
            boxShadow="md"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <VStack spacing={6} align="stretch">
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={profileData.name ?? profileData.username ?? ''}
                  onChange={handleChange('name')}
                  isReadOnly={!isEditing}
                  _focus={{ borderColor: 'blue.500' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  value={profileData.email}
                  isReadOnly={true}
                  type="email"
                  _focus={{ borderColor: 'blue.500' }}
                  _disabled={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Height (cm)</FormLabel>
                  <Input
                    value={profileData.height !== null && profileData.height !== undefined ? profileData.height : ''}
                    onChange={handleChange('height')}
                    isReadOnly={!isEditing}
                    type="number"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Weight (kg)</FormLabel>
                  <Input
                    value={profileData.weight !== null && profileData.weight !== undefined ? profileData.weight : ''}
                    onChange={handleChange('weight')}
                    isReadOnly={!isEditing}
                    type="number"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Fitness Goal</FormLabel>
                <Select
                  value={profileData.goal}
                  onChange={handleChange('goal')}
                  isReadOnly={!isEditing}
                  _focus={{ borderColor: 'blue.500' }}
                >
                  <option value="Build Muscle">Build Muscle</option>
                  <option value="Lose Weight">Lose Weight</option>
                  <option value="Improve Strength">Improve Strength</option>
                  <option value="Increase Endurance">Increase Endurance</option>
                  <option value="Maintain Fitness">Maintain Fitness</option>
                </Select>
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Rep Goal</FormLabel>
                  <Input
                    value={profileData.rep_goal}
                    onChange={handleChange('rep_goal')}
                    isReadOnly={!isEditing}
                    type="number"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Exercise Goal</FormLabel>
                  <Input
                    value={profileData.ex_goal}
                    onChange={handleChange('ex_goal')}
                    isReadOnly={!isEditing}
                    type="number"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </FormControl>
              </HStack>
            </VStack>
          </MotionBox>

          {/* Stats Section */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Your Progress</Heading>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={fetchProfile}
                size="sm"
                variant="outline"
              >
                Refresh
              </Button>
            </HStack>
            <HStack spacing={4}>
              <MotionBox
                p={6}
                bg="blue.50"
                borderRadius="lg"
                flex={1}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Text fontSize="sm" color="gray.600">Total Workouts</Text>
                <Text fontSize="2xl" fontWeight="bold">{stats.total_workouts}</Text>
              </MotionBox>

              <MotionBox
                p={6}
                bg="green.50"
                borderRadius="lg"
                flex={1}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Text fontSize="sm" color="gray.600">Calories Burned</Text>
                <Text fontSize="2xl" fontWeight="bold">{stats.calories_burned.toLocaleString()}</Text>
              </MotionBox>

              <MotionBox
                p={6}
                bg="purple.50"
                borderRadius="lg"
                flex={1}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Text fontSize="sm" color="gray.600">Goals Achieved</Text>
                <Text fontSize="2xl" fontWeight="bold">{stats.goals_achieved}</Text>
              </MotionBox>
            </HStack>
          </MotionBox>
        </VStack>
      </motion.div>

      {/* Change Password Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Change Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>New Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <InputRightElement>
                  <IconButton
                    icon={showPassword ? <FiEyeOff /> : <FiEye />}
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handlePasswordChange}
              isLoading={saving}
              loadingText="Updating..."
            >
              Update Password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default Profile 