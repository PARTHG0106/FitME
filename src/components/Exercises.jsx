import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Image,
  VStack,
  HStack,
  Tag,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Link,
} from '@chakra-ui/react'
import { FiSearch, FiPlay, FiInfo, FiRefreshCw } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'

const MotionBox = motion(Box)

const ExerciseCard = ({ exercise, onStart }) => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <MotionBox
        bg="rgba(255,255,255,0.55)"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="lg"
        whileHover={{ y: -5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
        transition={{ duration: 0.2 }}
        cursor="pointer"
        onClick={onOpen}
        style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      >
        <Box bg="white" display="flex" alignItems="center" justifyContent="center" h="220px" w="100%">
          <Image
            src={exercise.image_url}
            alt={exercise.name}
            fallbackSrc="https://via.placeholder.com/300x200"
            objectFit="contain"
            h="200px"
            w="100%"
            bg="white"
          />
        </Box>
        <Box p={4}>
          <VStack align="start" spacing={2}>
            <Heading size="md">{exercise.name}</Heading>
            <HStack>
              <Tag colorScheme="blue">{exercise.muscles_involved}</Tag>
            </HStack>
          </VStack>
        </Box>
      </MotionBox>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{exercise.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Image
                src={exercise.image_url}
                alt={exercise.name}
                fallbackSrc="https://via.placeholder.com/600x400"
                borderRadius="md"
              />
              <Text>{exercise.description}</Text>
              {exercise.link && (
                <Link href={exercise.link} isExternal color="blue.500">
                  Watch Tutorial Video
                </Link>
              )}
              <HStack spacing={4}>
                <Button
                  leftIcon={<FiPlay />}
                  colorScheme="blue"
                  onClick={() => {
                    onStart(exercise);
                    onClose();
                  }}
                  flex={1}
                >
                  Start Exercise
                </Button>
                <Button
                  leftIcon={<FiInfo />}
                  variant="outline"
                  onClick={() => window.open(exercise.link, '_blank')}
                >
                  View Details
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

const Exercises = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [exercisesRes, profileRes] = await Promise.all([
          apiGet('/api/exercises'),
          apiGet('/api/profile')
        ])
        setExercises(exercisesRes)
        setUserProfile(profileRes)
      } catch (err) {
        setError('Failed to load data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Extract unique muscle groups for categories
  const categories = ['All', ...new Set(exercises.map(ex => ex.muscles_involved))]

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || exercise.muscles_involved === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleStartExercise = (exercise) => {
    const repGoal = userProfile?.rep_goal || 7
    console.log('Starting exercise:', exercise.key, 'with repGoal:', repGoal)
    navigate(`/start/${exercise.key}?rep_goal=${repGoal}`)
  }

  if (loading) {
    return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>
  }
  if (error) {
    return <Alert status="error" my={8}><AlertIcon />{error}</Alert>
  }

  return (
    <Box maxW="6xl" mx="auto" px={4} py={8}>
      <Box mb={6}>
        <HStack spacing={4} mb={6}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </HStack>
        <HStack spacing={2} overflow="auto" pb={2}>
          {categories.map(category => (
            <Button
              key={category}
              size="sm"
              colorScheme={selectedCategory === category ? 'blue' : 'gray'}
              variant={selectedCategory === category ? 'solid' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              whiteSpace="nowrap"
            >
              {category}
            </Button>
          ))}
        </HStack>
      </Box>

      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(2, 1fr)' }}
        gap={6}
      >
        <AnimatePresence>
          {filteredExercises.map(exercise => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <ExerciseCard 
                exercise={exercise} 
                onStart={handleStartExercise}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </Grid>
      {filteredExercises.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No exercises found matching your criteria.</Text>
        </Box>
      )}
    </Box>
  )
}

export default Exercises 