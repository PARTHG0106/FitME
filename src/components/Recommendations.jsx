import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, VStack, HStack, Card, CardHeader, CardBody, Progress, Tag, Table, Thead, Tbody, Tr, Th, Td, Spinner, Alert, AlertIcon, Button, useToast } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiGet } from '../api';

export default function Recommendations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const toast = useToast();

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/api/recommendations');
      setData(res);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load recommendations';
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
    fetchRecommendations();
  }, []);

  if (loading && !data) return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>;
  if (error && !data) return <Alert status="error" my={8}><AlertIcon />{error}</Alert>;

  // Calculate muscle balance percentages
  const totalWorkouts = data?.muscle_groups?.reduce((sum, group) => sum + group.count, 0) || 0;
  const muscleBalance = data?.muscle_groups?.map(group => ({
    muscle: group.name,
    percent: totalWorkouts ? Math.round((group.count / totalWorkouts) * 100) : 0,
    count: group.count
  })) || [];

  // Get focus areas (muscle groups with less than 20% of total workouts)
  const focusAreas = muscleBalance
    .filter(group => group.percent < 20)
    .map(group => ({
      muscle: group.muscle,
      exercises: data?.recommendations?.[group.muscle] || []
    }));

  return (
    <Box maxW="4xl" mx="auto" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="xl">Your Personalized Workout Recommendations</Heading>
        <Button
          leftIcon={<FiRefreshCw />}
          onClick={fetchRecommendations}
          isLoading={loading}
          variant="outline"
          colorScheme="blue"
        >
          Refresh
        </Button>
      </Box>

      {/* Muscle Balance */}
      <Card mb={8}>
        <CardHeader><Heading size="md">Muscle Group Balance</Heading></CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {muscleBalance.map((m) => (
              <Box key={m.muscle}>
                <HStack justify="space-between">
                  <Text fontWeight="semibold">{m.muscle}</Text>
                  <Text fontSize="sm">{m.percent}% ({m.count} workouts)</Text>
                </HStack>
                <Progress 
                  value={m.percent} 
                  colorScheme={m.percent < 20 ? "red" : "green"} 
                  borderRadius="full" 
                  h={4} 
                />
              </Box>
            ))}
          </VStack>
        </CardBody>
      </Card>

      {/* Focus Areas */}
      {focusAreas.length > 0 && (
        <Card mb={8}>
          <CardHeader><Heading size="md">Recommended Focus Areas</Heading></CardHeader>
          <CardBody>
            <Text mb={4} color="gray.500">These muscle groups need more attention based on your recent workout history:</Text>
            <HStack spacing={4} flexWrap="wrap">
              {focusAreas.map((fa) => (
                <Box key={fa.muscle} bg="gray.50" p={4} borderRadius="md" minW="200px">
                  <Text fontWeight="bold" mb={2}>{fa.muscle}</Text>
                  <VStack align="start" spacing={1}>
                    {fa.exercises.map((ex) => (
                      <Tag key={ex} colorScheme="blue">{ex}</Tag>
                    ))}
                  </VStack>
                </Box>
              ))}
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Progression Recommendations */}
      {data?.progression_recommendations && Object.keys(data.progression_recommendations).length > 0 && (
        <Card>
          <CardHeader><Heading size="md">Progression Recommendations</Heading></CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Exercise</Th>
                  <Th>Current Performance</Th>
                  <Th>Recommendation</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(data.progression_recommendations).map(([exercise, rec]) => (
                  <Tr key={exercise}>
                    <Td fontWeight="semibold">{exercise}</Td>
                    <Td>
                      <Tag colorScheme="green" mr={2}>ROM: {rec.rom}%</Tag>
                      <Tag colorScheme="blue">Avg Reps: {rec.reps}</Tag>
                    </Td>
                    <Td>
                      <Text fontWeight="bold">{rec.suggestion}</Text>
                      <Text>{rec.recommendation}</Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </Box>
  );
} 