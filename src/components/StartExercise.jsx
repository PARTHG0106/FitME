import { useParams, useSearchParams } from 'react-router-dom'
import { Box, Heading, Spinner } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { apiGet } from '../api'

const StartExercise = () => {
  const { exercise } = useParams()
  const [searchParams] = useSearchParams()
  const repGoal = searchParams.get('rep_goal') || 7 // fallback to 7 if not present
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await apiGet('/api/profile')
        setUserId(profile.id)
      } catch (err) {
        setUserId(null)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  if (loading || !userId) return <Spinner size="xl" />

  return (
    <Box textAlign="center" py={8}>
      <Heading size="lg" mb={6}>
        Live Feedback: {exercise.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Heading>
      <img
        src={`http://localhost:5000/video_feed/${exercise}/${userId}/${repGoal}`}
        width={640}
        height={480}
        alt="Live Exercise Feed"
        style={{ borderRadius: 8, background: '#000', maxWidth: '100%' }}
      />
    </Box>
  )
}

export default StartExercise 