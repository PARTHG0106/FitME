import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Box, Heading, Text, Button, VStack, HStack, Badge, Icon, Flex, Grid,
  useToast, Divider, Spinner
} from '@chakra-ui/react'
import { FaCheck, FaCrown, FaRocket, FaStar, FaBolt, FaTimes } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { apiGet, apiPost } from '../api'

const MotionBox = motion(Box)

const Subscription = () => {
  const [plans, setPlans] = useState(null)
  const [currentTier, setCurrentTier] = useState('free')
  const [currentStatus, setCurrentStatus] = useState('inactive')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const success = searchParams.get('success')
  const cancelled = searchParams.get('cancelled')
  const planParam = searchParams.get('plan')

  useEffect(() => {
    fetchPlans()
    if (success && planParam) {
      toast({
        title: '🎉 Subscription Activated!',
        description: `Welcome to the ${planParam.charAt(0).toUpperCase() + planParam.slice(1)} plan!`,
        status: 'success', duration: 5000, isClosable: true,
      })
    }
    if (cancelled) {
      toast({
        title: 'Checkout cancelled',
        description: 'You can subscribe anytime.',
        status: 'info', duration: 3000, isClosable: true,
      })
    }
  }, [])

  const fetchPlans = async () => {
    try {
      const data = await apiGet('/api/subscription/plans')
      setPlans(data.plans)
      setCurrentTier(data.current_tier)
      setCurrentStatus(data.current_status)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async (plan) => {
    setCheckoutLoading(plan)
    try {
      const data = await apiPost('/api/subscription/checkout', { plan })
      if (data.checkout_url) window.location.href = data.checkout_url
    } catch (err) {
      toast({ title: 'Checkout Error', description: err.message, status: 'error', duration: 4000 })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleDevActivate = async (plan) => {
    try {
      const data = await apiPost('/api/subscription/dev-activate', { plan })
      toast({ title: '✅ Activated (Dev)', description: data.message, status: 'success', duration: 3000 })
      fetchPlans()
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3000 })
    }
  }

  const handleManageSubscription = async () => {
    try {
      const data = await apiPost('/api/subscription/portal', {})
      if (data.portal_url) window.location.href = data.portal_url
    } catch (err) {
      toast({ title: 'Error', description: 'Could not open portal.', status: 'error', duration: 3000 })
    }
  }

  if (loading) return (
    <Flex minH="60vh" align="center" justify="center">
      <Spinner size="xl" color="#6366F1" thickness="3px" />
    </Flex>
  )

  const planConfig = {
    free: {
      icon: FaStar, color: '#6B7280', gradient: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)',
      borderColor: '#E5E7EB', btnBg: '#F3F4F6', btnColor: '#6B7280', btnHover: '#E5E7EB',
      checkColor: '#9CA3AF', label: null
    },
    pro: {
      icon: FaRocket, color: '#3B82F6', gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
      borderColor: '#3B82F6', btnBg: '#3B82F6', btnColor: 'white', btnHover: '#2563EB',
      checkColor: '#3B82F6', label: 'MOST POPULAR'
    },
    elite: {
      icon: FaCrown, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
      borderColor: '#8B5CF6', btnBg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', btnColor: 'white', btnHover: '#7C3AED',
      checkColor: '#8B5CF6', label: 'BEST VALUE'
    }
  }

  return (
    <Box maxW="1100px" mx="auto" py={10} px={{ base: 4, md: 6 }}>
      {/* Header */}
      <VStack spacing={3} mb={12} textAlign="center">
        <Badge bg="#EEF2FF" color="#6366F1" fontSize="xs" px={3} py={1} borderRadius="full" fontWeight="700" letterSpacing="0.05em">
          PRICING PLANS
        </Badge>
        <Heading size="2xl" color="#111827" fontWeight="800">
          Choose Your <Text as="span" bgGradient="linear(to-r, #6366F1, #8B5CF6)" bgClip="text">Plan</Text>
        </Heading>
        <Text color="#6B7280" fontSize="lg" maxW="550px" lineHeight="1.7">
          Unlock AI-powered form tracking, personalized analytics, and premium workout features.
        </Text>
      </VStack>

      {/* Current Plan Banner */}
      {currentTier !== 'free' && currentStatus === 'active' && (
        <Box bg="#F0FDF4" border="1px solid" borderColor="#BBF7D0" borderRadius="xl" p={4} mb={8}>
          <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
            <HStack spacing={3}>
              <Flex w="36px" h="36px" borderRadius="lg" bg="#DCFCE7" align="center" justify="center">
                <Icon as={FaCheck} color="#16A34A" boxSize={4} />
              </Flex>
              <Box>
                <Text fontSize="sm" fontWeight="700" color="#166534">
                  Active {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
                </Text>
                <Text fontSize="xs" color="#4ADE80">Your subscription is active</Text>
              </Box>
            </HStack>
            <Button size="sm" bg="white" color="#16A34A" border="1px solid" borderColor="#BBF7D0"
              _hover={{ bg: '#F0FDF4' }} borderRadius="lg" onClick={handleManageSubscription}>
              Manage Subscription
            </Button>
          </Flex>
        </Box>
      )}

      {/* Plan Cards */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6} mb={16}>
        {plans && Object.entries(plans).map(([key, plan], idx) => {
          const cfg = planConfig[key]
          const isCurrentPlan = key === currentTier
          const isPaid = plan.price > 0

          return (
            <MotionBox key={key} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.12, duration: 0.5 }}>
              <Box
                bg="white" borderRadius="2xl" p={7} position="relative" overflow="hidden" h="100%"
                display="flex" flexDirection="column"
                border="2px solid" borderColor={isCurrentPlan ? '#10B981' : key === 'pro' ? '#3B82F6' : '#F3F4F6'}
                boxShadow={key === 'pro' ? '0 8px 30px rgba(59,130,246,0.12)' :
                  key === 'elite' ? '0 8px 30px rgba(139,92,246,0.12)' : '0 1px 3px rgba(0,0,0,0.08)'}
                _hover={{ transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
                transition="all 0.3s"
              >
                {/* Top accent bar */}
                <Box position="absolute" top={0} left={0} right={0} h="4px"
                  bg={key === 'pro' ? 'linear-gradient(90deg, #3B82F6, #60A5FA)' :
                    key === 'elite' ? 'linear-gradient(90deg, #8B5CF6, #A78BFA)' : '#E5E7EB'} />

                {/* Labels */}
                {cfg.label && (
                  <Badge position="absolute" top={5} right={5} bg={key === 'pro' ? '#DBEAFE' : '#EDE9FE'}
                    color={cfg.color} fontSize="2xs" px={2} py={0.5} borderRadius="full" fontWeight="800">
                    {cfg.label}
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge position="absolute" top={5} left={5} bg="#DCFCE7" color="#166534"
                    fontSize="2xs" px={2} py={0.5} borderRadius="full" fontWeight="800">
                    CURRENT
                  </Badge>
                )}

                <VStack align="start" spacing={5} flex={1}>
                  {/* Plan Icon + Name */}
                  <HStack spacing={3}>
                    <Flex w="40px" h="40px" borderRadius="xl" bg={cfg.gradient} align="center" justify="center">
                      <Icon as={cfg.icon} color={cfg.color} boxSize={4} />
                    </Flex>
                    <Heading size="md" color="#111827" fontWeight="800">{plan.name}</Heading>
                  </HStack>

                  {/* Price */}
                  <HStack align="baseline" spacing={1}>
                    <Text fontSize="4xl" fontWeight="900" color="#111827">${plan.price}</Text>
                    {isPaid && <Text fontSize="sm" color="#9CA3AF" fontWeight="500">/month</Text>}
                  </HStack>

                  <Divider borderColor="#F3F4F6" />

                  {/* Features */}
                  <VStack align="start" spacing={3} flex={1} w="full">
                    {plan.features.map((feature, i) => (
                      <HStack key={i} spacing={3} align="start">
                        <Flex w="20px" h="20px" borderRadius="full" bg={key === 'free' ? '#F3F4F6' : `${cfg.color}15`}
                          align="center" justify="center" flexShrink={0} mt={0.5}>
                          <Icon as={FaCheck} color={cfg.checkColor} boxSize={2.5} />
                        </Flex>
                        <Text fontSize="sm" color="#4B5563" lineHeight="1.5">{feature}</Text>
                      </HStack>
                    ))}
                  </VStack>

                  {/* CTA Buttons */}
                  {key === 'free' ? (
                    <Button w="full" bg={isCurrentPlan ? '#F3F4F6' : 'white'} color={isCurrentPlan ? '#9CA3AF' : '#374151'}
                      border="1px solid" borderColor="#E5E7EB" size="lg" borderRadius="xl" fontWeight="700"
                      isDisabled={isCurrentPlan} _hover={{ bg: '#F9FAFB' }}>
                      {isCurrentPlan ? 'Current Plan' : 'Get Started Free'}
                    </Button>
                  ) : (
                    <VStack w="full" spacing={2}>
                      <Button w="full" size="lg" borderRadius="xl" fontWeight="700"
                        bg={cfg.btnBg} color={cfg.btnColor} _hover={{ opacity: 0.9, transform: 'scale(1.01)' }}
                        leftIcon={<FaBolt />} isLoading={checkoutLoading === key}
                        isDisabled={isCurrentPlan} transition="all 0.2s"
                        onClick={() => handleCheckout(key)}>
                        {isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
                      </Button>
                      <Button w="full" size="xs" variant="ghost" color="#9CA3AF" fontWeight="500"
                        _hover={{ color: '#6B7280', bg: '#F9FAFB' }} onClick={() => handleDevActivate(key)}>
                        🧪 Dev: Activate Free
                      </Button>
                    </VStack>
                  )}
                </VStack>
              </Box>
            </MotionBox>
          )
        })}
      </Grid>

      {/* FAQ */}
      <VStack spacing={6} textAlign="center" mb={8}>
        <Heading size="md" color="#111827" fontWeight="800">Frequently Asked Questions</Heading>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} maxW="800px" w="full">
          {[
            { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel your subscription anytime from the Manage Subscription portal — no questions asked.' },
            { q: 'Is there a free trial?', a: 'The Free tier gives you 3 live tracking sessions per day, forever. No credit card required.' },
            { q: 'What payment methods are accepted?', a: 'We accept all major credit and debit cards securely processed via Stripe.' },
            { q: 'Can I switch between plans?', a: 'Yes! Upgrade or downgrade anytime. Changes take effect immediately with prorated billing.' },
          ].map(({ q, a }, i) => (
            <Box key={i} bg="white" p={5} borderRadius="xl" textAlign="left" border="1px solid" borderColor="#F3F4F6"
              boxShadow="0 1px 2px rgba(0,0,0,0.05)" _hover={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              transition="all 0.2s">
              <Text color="#111827" fontWeight="700" fontSize="sm" mb={2}>{q}</Text>
              <Text color="#6B7280" fontSize="sm" lineHeight="1.6">{a}</Text>
            </Box>
          ))}
        </Grid>
      </VStack>
    </Box>
  )
}

export default Subscription
