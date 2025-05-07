import React, { useEffect, useState } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Tag, Tabs, TabList, TabPanels, Tab, TabPanel, Spinner, Alert, AlertIcon, Button, useToast, Text } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';
import { apiGet } from '../api';

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/api/leaderboard');
      setData(res);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load leaderboard data';
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
    fetchLeaderboard();
  }, []);

  if (loading && !data) return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>;
  if (error && !data) return <Alert status="error" my={8}><AlertIcon />{error}</Alert>;

  const renderLeaderboardTable = (users, scoreKey) => (
    <Table variant="striped" colorScheme="blue">
      <Thead>
        <Tr>
          <Th>Rank</Th>
          <Th>Name</Th>
          <Th>{scoreKey === 'exercise_count' ? 'Total Exercises' : 'Total Reps'}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {users.map((user, index) => (
          <Tr 
            key={user.id}
            bg={user.is_current_user ? 'blue.50' : undefined}
            _hover={{ bg: 'blue.100' }}
          >
            <Td>
              <Tag 
                colorScheme={
                  index === 0 ? 'yellow' : 
                  index === 1 ? 'gray' : 
                  index === 2 ? 'orange' : 
                  'blue'
                }
                size="lg"
              >
                {index + 1}
              </Tag>
            </Td>
            <Td fontWeight={user.is_current_user ? 'bold' : 'normal'}>
              {user.username}
              {user.is_current_user && (
                <Tag ml={2} size="sm" colorScheme="blue">You</Tag>
              )}
            </Td>
            <Td>{user[scoreKey]}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  return (
    <Box maxW="4xl" mx="auto" py={8}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="xl">Leaderboard</Heading>
        <Button
          leftIcon={<FiRefreshCw />}
          onClick={fetchLeaderboard}
          isLoading={loading}
          variant="outline"
          colorScheme="blue"
        >
          Refresh
        </Button>
      </Box>

      <Tabs 
        variant="enclosed" 
        colorScheme="blue" 
        onChange={(index) => setActiveTab(index)}
        defaultIndex={0}
      >
        <TabList>
          <Tab>Total Exercises</Tab>
          <Tab>Total Reps</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {data?.total_exercises ? (
              renderLeaderboardTable(data.total_exercises, 'exercise_count')
            ) : (
              <Text color="gray.500" textAlign="center">No data available</Text>
            )}
          </TabPanel>
          <TabPanel>
            {data?.total_reps ? (
              renderLeaderboardTable(data.total_reps, 'total_reps')
            ) : (
              <Text color="gray.500" textAlign="center">No data available</Text>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
} 