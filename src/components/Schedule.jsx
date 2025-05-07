import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tag,
  Button,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useDisclosure,
  IconButton,
  HStack,
  Text,
  Switch,
} from '@chakra-ui/react';
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { apiGet, apiPost, apiDelete } from '../api';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    exercise_id: '',
    day_of_week: 1,
    sets: 3,
    reps: 10,
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const [scheduleRes, exercisesRes] = await Promise.all([
        apiGet('/api/schedule'),
        apiGet('/api/exercises'),
      ]);
      setData(scheduleRes);
      setExercises(exercisesRes);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load schedule';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleAddSchedule = async () => {
    try {
      await apiPost('/api/add_schedule', newSchedule);
      toast({
        title: 'Success',
        description: 'Workout added to schedule',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onClose();
      fetchSchedule();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to add workout',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await apiDelete(`/api/delete_schedule/${scheduleId}`);
      toast({
        title: 'Success',
        description: 'Workout removed from schedule',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchSchedule();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to remove workout',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleStatusChange = async (scheduleId, isCompleted) => {
    try {
      await apiPost(`/api/update_schedule_status/${scheduleId}`, { is_completed: isCompleted });
      fetchSchedule();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading && !data) return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>;
  if (error && !data) return <Alert status="error" my={8}><AlertIcon />{error}</Alert>;

  return (
    <Box maxW="4xl" mx="auto" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="xl">Workout Schedule</Heading>
        <HStack spacing={4}>
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={fetchSchedule}
            isLoading={loading}
            variant="outline"
            colorScheme="blue"
          >
            Refresh
          </Button>
          <Button
            leftIcon={<FiPlus />}
            onClick={onOpen}
            colorScheme="blue"
          >
            Add Workout
          </Button>
        </HStack>
      </Box>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Day</Th>
            <Th>Exercise</Th>
            <Th>Sets × Reps</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data?.schedules?.map((item) => (
            <Tr key={item.id}>
              <Td>{DAYS_OF_WEEK[item.day_of_week]}</Td>
              <Td>{item.exercise_name}</Td>
              <Td>{item.sets} × {item.reps}</Td>
              <Td>
                <Switch
                  isChecked={item.is_completed}
                  onChange={(e) => handleStatusChange(item.id, e.target.checked)}
                  colorScheme="green"
                />
              </Td>
              <Td>
                <IconButton
                  icon={<FiTrash2 />}
                  colorScheme="red"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSchedule(item.id)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Workout to Schedule</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl mb={4}>
              <FormLabel>Exercise</FormLabel>
              <Select
                value={newSchedule.exercise_id}
                onChange={(e) => setNewSchedule({ ...newSchedule, exercise_id: e.target.value })}
              >
                <option value="">Select an exercise</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Day of Week</FormLabel>
              <Select
                value={newSchedule.day_of_week}
                onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(e.target.value) })}
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Sets</FormLabel>
              <NumberInput
                min={1}
                max={10}
                value={newSchedule.sets}
                onChange={(value) => setNewSchedule({ ...newSchedule, sets: parseInt(value) })}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Reps</FormLabel>
              <NumberInput
                min={1}
                max={100}
                value={newSchedule.reps}
                onChange={(value) => setNewSchedule({ ...newSchedule, reps: parseInt(value) })}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <Button colorScheme="blue" mr={3} onClick={handleAddSchedule}>
              Add
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
} 