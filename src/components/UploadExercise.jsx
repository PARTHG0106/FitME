import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Textarea,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Tag,
  useToast,
  Divider,
  Image,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
} from '@chakra-ui/react';
import { FiUpload, FiArrowLeft, FiCheckCircle, FiInfo, FiVideo, FiRefreshCw, FiDownload, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api';

export default function UploadExercise() {
  const [selectedExercise, setSelectedExercise] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [analyzedVideos, setAnalyzedVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [exercises, setExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [exercisesError, setExercisesError] = useState('');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExercises = async () => {
      setLoadingExercises(true);
      setExercisesError('');
      try {
        const res = await apiGet('/api/exercises');
        // Filter to only show the 4 specific exercises on the upload page
        const allowedExercises = ['Barbell Squats', 'Bicep Curls', 'Shoulder Press', 'Deadlift'];
        const filteredExercises = res.filter(ex => allowedExercises.includes(ex.name));
        setExercises(filteredExercises);
      } catch (err) {
        setExercisesError('Failed to load exercises');
      } finally {
        setLoadingExercises(false);
      }
    };
    fetchExercises();
  }, []);

  const fetchAnalyzedVideos = async () => {
    try {
      const res = await apiGet('/api/analyzed_videos');
      const exerciseNameMap = {
        squat: 'Barbell Squats',
        bicep_curl: 'Bicep Curls',
        shoulder_press: 'Shoulder Press',
        deadlift: 'Deadlift',
        lateral_raise: 'Lateral Raises',
      };
      const mappedVideos = res.map(video => ({
        ...video,
        video_url: `/uploads/exercises/${video.video_path}`,
        exercise_name: exerciseNameMap[video.exercise_type] || video.exercise_type,
        feedback: video.feedback ? video.feedback.split('\n') : [],
      }));
      setAnalyzedVideos(mappedVideos);
    } catch (err) {
      console.error('Failed to fetch analyzed videos:', err);
    }
  };

  useEffect(() => {
    fetchAnalyzedVideos();
  }, []);

  const handleExerciseSelect = (value) => setSelectedExercise(value);
  const handleFileChange = (e) => setVideoFile(e.target.files[0]);
  const handleNotesChange = (e) => setNotes(e.target.value);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !videoFile) {
      toast({
        title: 'Missing Information',
        description: 'Please select an exercise and upload a video file.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setCurrentAnalysis(null);
    const formData = new FormData();
    formData.append('exercise_type', selectedExercise);
    formData.append('video', videoFile);
    if (notes) formData.append('notes', notes);

    try {
      const res = await apiPost('/api/upload_exercise', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      setCurrentAnalysis(res.analysis);
      toast({
        title: 'Success',
        description: res.message,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setSelectedExercise('');
      setVideoFile(null);
      setNotes('');
      await fetchAnalyzedVideos();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to upload video';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box maxW="4xl" mx="auto" py={8}>
      {/* Header */}
      <Box textAlign="center" mb={8}>
        <Heading size="xl" mb={2}>Exercise Upload</Heading>
        <Text fontSize="lg" color="gray.500">Upload your exercise video for form analysis</Text>
      </Box>

      {/* Exercise Selection Cards */}
      {loadingExercises ? (
        <Box textAlign="center" py={6}><Spinner size="lg" /></Box>
      ) : exercisesError ? (
        <Alert status="error" my={4}><AlertIcon />{exercisesError}</Alert>
      ) : (
        <Flex gap={6} mb={8} flexWrap={{ base: 'wrap', md: 'nowrap' }} justify="center">
          {exercises.map((exercise) => (
            <Card key={exercise.id} w={{ base: '100%', md: '22%' }} minW="180px" cursor="pointer" border={selectedExercise === exercise.key ? '2px solid #3182ce' : 'none'} onClick={() => setSelectedExercise(exercise.key)}>
              <CardHeader pb={0}>
                <HStack>
                  {exercise.image_url && (
                    <Box 
                      mb={4}
                      borderRadius="md" 
                      overflow="hidden"
                      boxShadow="sm"
                      bg="white"
                      p={2}
                      textAlign="center"
                    >
                      <Image 
                        src={exercise.image_url} 
                        alt={exercise.name} 
                        maxH="150px" 
                        mx="auto"
                        objectFit="contain"
                      />
                    </Box>
                  )}
                  <Heading size="sm">{exercise.name}</Heading>
                </HStack>
              </CardHeader>
              <CardBody pt={2}>
                <Text fontSize="sm" color="gray.600">{exercise.muscles_involved}</Text>
              </CardBody>
            </Card>
          ))}
        </Flex>
      )}

      {/* Upload Form */}
      <Card mb={8}>
        <CardBody>
          <form onSubmit={handleFormSubmit}>
            <VStack spacing={6} align="stretch">
              {/* Exercise Type Selection */}
              <Box>
                <Text fontWeight="semibold" mb={1}>Selected Exercise</Text>
                <Select
                  placeholder="Select an exercise"
                  value={selectedExercise}
                  onChange={e => handleExerciseSelect(e.target.value)}
                  isRequired
                  isDisabled={loadingExercises || !!exercisesError}
                >
                  {exercises.map(ex => (
                    <option key={ex.id} value={ex.key}>{ex.name}</option>
                  ))}
                </Select>
              </Box>
              {/* Video Upload */}
              <Box>
                <Text fontWeight="semibold" mb={1}>Video File</Text>
                <Input
                  type="file"
                  accept=".mp4,.mov,.avi"
                  onChange={handleFileChange}
                  required
                  bg="white"
                  colorScheme="blue"
                  sx={{
                    '::file-selector-button': {
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.5em 1em',
                      cursor: 'pointer',
                    },
                  }}
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Supported formats: MP4, MOV, AVI (Max size: 100MB)
                </Text>
                {uploading && (
                  <Progress value={uploadProgress} size="sm" colorScheme="blue" mt={2} />
                )}
              </Box>
              {/* Notes */}
              <Box>
                <Text fontWeight="semibold" mb={1}>Notes (Optional)</Text>
                <Textarea
                  placeholder="Add any notes about your exercise..."
                  value={notes}
                  onChange={handleNotesChange}
                  bg="white"
                />
              </Box>
              {/* Submit Button */}
              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                leftIcon={<FiUpload />}
                isLoading={uploading}
                loadingText="Uploading..."
              >
                Upload Video
              </Button>
            </VStack>
          </form>
          <Button
            variant="ghost"
            leftIcon={<FiArrowLeft />}
            mt={6}
            onClick={() => navigate('/exercises')}
          >
            Back to Exercises
          </Button>
        </CardBody>
      </Card>

      {/* Analysis Results */}
      {currentAnalysis && (
        <Card mb={8}>
          <CardHeader>
            <Heading size="md">Analysis Results</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {currentAnalysis.feedback && currentAnalysis.feedback.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" mb={2}>Feedback:</Text>
                  {currentAnalysis.feedback.map((feedback, index) => (
                    <Text key={index} mb={1}>• {feedback}</Text>
                  ))}
                </Box>
              )}
              {currentAnalysis.video_path && (
                <Box>
                  <Text fontWeight="semibold" mb={2}>Analyzed Video:</Text>
                  <video 
                    controls 
                    width="100%" 
                    src={`/uploads/exercises/${currentAnalysis.video_path}`}
                    style={{ borderRadius: '8px' }}
                  />
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Upload Guidelines */}
      <Card mb={8} bg="gray.50">
        <CardHeader>
          <HStack>
            <Box as="span" color="blue.400"><FiInfo /></Box>
            <Heading size="md">Upload Guidelines</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={2} fontSize="md">
            <HStack><Box as="span" color="green.400"><FiCheckCircle /></Box><Text>Ensure good lighting and clear view of the exercise</Text></HStack>
            <HStack><Box as="span" color="green.400"><FiCheckCircle /></Box><Text>Record from a side angle for best form analysis</Text></HStack>
            <HStack><Box as="span" color="green.400"><FiCheckCircle /></Box><Text>Include the full range of motion in the video</Text></HStack>
            <HStack><Box as="span" color="green.400"><FiCheckCircle /></Box><Text>Keep the video under 100MB</Text></HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Your Analyzed Videos Section */}
      <Box mt={12}>
        <HStack justify="space-between" mb={6}>
          <Heading size="lg">
            <Box as="span" color="blue.400" mr={2}><FiVideo /></Box>
            Your Analyzed Videos
          </Heading>
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={fetchAnalyzedVideos}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>
        {analyzedVideos.length > 0 ? (
          <Flex gap={6} flexWrap="wrap" justify="center">
            {analyzedVideos.map((video) => (
              <Card key={video.id} w={{ base: '100%', md: '45%' }}>
                <CardBody>
                  <Box mb={4}>
                    <video 
                      className="video-thumbnail"
                      width="100%"
                      controls 
                      preload="metadata" 
                      style={{ background: '#000', borderRadius: 8 }}
                    >
                      <source src={video.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </Box>
                  <HStack spacing={4} mt={2}>
                    <Button
                      colorScheme="red"
                      size="sm"
                      variant="outline"
                      leftIcon={<FiTrash2 />}
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this video?')) {
                          await apiPost(`/delete-analyzed-video/${video.id}`);
                          fetchAnalyzedVideos();
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </HStack>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Heading size="md">{video.exercise_name}</Heading>
                      <Text fontSize="sm" color="gray.500">Uploaded: {new Date(video.created_at).toLocaleString()}</Text>
                    </HStack>
                    {video.notes && (
                      <Box bg="gray.100" p={2} borderRadius="md">
                        <Text fontWeight="semibold" fontSize="sm">Your Notes:</Text>
                        <Text fontSize="sm">{video.notes}</Text>
                      </Box>
                    )}
                    <Box bg="blue.50" p={2} borderRadius="md">
                      <Text fontWeight="semibold" fontSize="sm">Form Analysis:</Text>
                      <Text fontSize="sm">{video.feedback.join('\n')}</Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </Flex>
        ) : (
          <Text textAlign="center" color="gray.500">No analyzed videos yet.</Text>
        )}
      </Box>
    </Box>
  );
} 