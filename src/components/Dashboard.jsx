import React, { useEffect, useState } from 'react'
import { Box, Grid, Heading, Text, Stat, StatLabel, StatNumber, StatHelpText, Spinner, Alert, AlertIcon, Button, useToast, Table, Thead, Tbody, Tr, Th, Td, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiActivity, FiTrendingUp, FiTarget, FiRefreshCw } from 'react-icons/fi'
import { apiGet } from '../api'
import { useDisclosure } from '@chakra-ui/react'

const MotionBox = motion(Box)
const MotionGrid = motion(Grid)

const StatCard = ({ icon: Icon, title, value, change, color }) => (
  <MotionBox
    p={6}
    bg="white"
    borderRadius="lg"
    boxShadow="md"
    whileHover={{ scale: 1.02, y: -5 }}
    transition={{ duration: 0.2 }}
  >
    <Stat>
      <StatLabel display="flex" alignItems="center" color="gray.600">
        <Icon size={20} style={{ marginRight: '8px' }} />
        {title}
      </StatLabel>
      <StatNumber fontSize="2xl" fontWeight="bold" color={color}>
        {value}
      </StatNumber>
      {change !== undefined && (
        <StatHelpText color={change >= 0 ? 'green.500' : 'red.500'}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last week
        </StatHelpText>
      )}
    </Stat>
  </MotionBox>
)

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [todaySchedule, setTodaySchedule] = useState([])
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()

  const fetchDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet('/api/dashboard')
      setData(res)
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to load dashboard data'
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

  // Fetch today's schedule on mount
  useEffect(() => {
    fetchDashboard()
    apiGet('/api/schedule/today').then(res => {
      if (res.today && res.today.length > 0) {
        setTodaySchedule(res.today)
      }
    })
  }, [])

  if (loading && !data) return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>
  if (error && !data) return <Alert status="error" my={8}><AlertIcon />{error}</Alert>

  // Fallbacks for missing data
  const stats = [
    {
      icon: FiActivity,
      title: 'Total Workouts',
      value: data?.total_workouts ?? '—',
      change: undefined,
      color: 'blue.500'
    },
    {
      icon: FiTrendingUp,
      title: 'Workout Efficiency',
      value: data?.efficiency !== undefined ? `${data.efficiency}%` : '—',
      change: undefined,
      color: 'green.500'
    },
    {
      icon: FiTrendingUp,
      title: 'Weekly Progress',
      value: data?.progress_change !== undefined ? `${data.progress_change}%` : '—',
      change: undefined,
      color: 'teal.500'
    },
    {
      icon: FiTarget,
      title: 'Workout Streak',
      value: data?.workout_streak ?? '—',
      change: undefined,
      color: 'purple.500'
    }
  ]

  // Below the table: Monthly Activity, Lifetime Reps, Weekly Goal
  const belowStats = [
    { label: 'Monthly Activity', value: data?.monthly_activity ?? '—' },
    { label: 'Lifetime Reps', value: data?.lifetime_reps ?? '—' },
    { label: 'Weekly Goal', value: data?.weekly_goal ?? '—' }
  ]

  // Workouts this week for Weekly Progress
  const workoutsThisWeek = data?.goals_achieved ?? 0
  const weeklyGoal = data?.weekly_goal ?? 0

  // Update Weekly Progress stat
  stats[2].value = `${workoutsThisWeek} / ${weeklyGoal}`

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading>Dashboard</Heading>
        <Button
          leftIcon={<FiRefreshCw />}
          onClick={fetchDashboard}
          isLoading={loading}
          variant="outline"
          colorScheme="blue"
        >
          Refresh
        </Button>
      </Box>
      <MotionGrid
        templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }}
        gap={6}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        mb={8}
      >
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          />
        ))}
      </MotionGrid>
      <MotionBox
        mt={8}
        p={6}
        bg="white"
        borderRadius="lg"
        boxShadow="md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Heading size="md" mb={4}>Recent Activity</Heading>
        {data?.recent_activity && data.recent_activity.length > 0 ? (
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Exercise</Th>
                  <Th>Duration</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.recent_activity.map((a, i) => (
                  <Tr key={i}>
                    <Td>{a.date}</Td>
                    <Td>{a.exercise}</Td>
                    <Td>{a.duration} sec</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Text color="gray.600">No recent activity to display</Text>
        )}
      </MotionBox>
      {/* Below stats OUTSIDE the white card */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6} mt={8} mb={20}>
        {belowStats.map((stat, i) => (
          <Box key={i} p={6} bg="white" borderRadius="lg" boxShadow="md" textAlign="center">
            <Text fontWeight="bold" fontSize="lg">{stat.label}</Text>
            <Text fontSize="2xl">{stat.value}</Text>
          </Box>
        ))}
      </Grid>

      {/* Floating Today's Schedule Widget */}
      <Box
        position="fixed"
        bottom="32px"
        right="32px"
        width="280px"
        bg="white"
        borderRadius="lg"
        boxShadow="lg"
        zIndex={1000}
        overflow="hidden"
        transition="height 0.3s, box-shadow 0.3s"
        height="56px"
        _hover={{ height: "240px", boxShadow: "2xl" }}
        cursor="pointer"
        className="dashboard-schedule-widget"
      >
        <Box p={3} fontWeight="bold" bg="gray.50" borderBottom="1px solid #eee">
          <Text fontSize="md"><FiActivity style={{ display: "inline", marginRight: 8 }} />Today's Schedule</Text>
        </Box>
        <Box display="none" p={4} className="dashboard-schedule-content" sx={{
          '.dashboard-schedule-widget:hover &': { display: 'block' }
        }}>
          {todaySchedule.length > 0 ? (
            todaySchedule.map((item) => (
              <Box key={item.id} mb={3} p={3} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold">{item.exercise_name}</Text>
                <Text fontSize="sm">Sets: {item.sets} &nbsp; Reps: {item.reps}</Text>
              </Box>
            ))
          ) : (
            <Text>No workouts scheduled for today.</Text>
          )}
          <Box mt={2} textAlign="right">
            <a href="/schedule" style={{ color: "#888", fontSize: "0.95em" }}>View Full Schedule &rarr;</a>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default Dashboard 