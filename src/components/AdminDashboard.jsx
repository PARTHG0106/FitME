import { useEffect, useState, useRef } from 'react'
import {
  Box, Heading, Text, Button, VStack, HStack, Badge, Icon,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select, useToast, Spinner,
  Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  IconButton, InputGroup, InputLeftElement, Flex, Grid, GridItem
} from '@chakra-ui/react'
import { FaUsers, FaDollarSign, FaDumbbell, FaSearch, FaTrash, FaCrown, FaEdit, FaUpload, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { apiGet, apiDelete } from '../api'

const MotionBox = motion(Box)

const tierBadge = (tier) => {
  const config = {
    free: { bg: '#374151', color: '#9CA3AF' },
    pro: { bg: '#1E3A5F', color: '#60A5FA' },
    elite: { bg: '#3B1F6E', color: '#A78BFA' }
  }
  const c = config[tier] || config.free
  return (
    <Badge bg={c.bg} color={c.color} px={2} py={0.5} borderRadius="md" fontSize="xs" fontWeight="600" textTransform="uppercase">
      {tier}
    </Badge>
  )
}

const statusBadge = (status) => {
  const config = {
    active: { bg: '#064E3B', color: '#34D399' },
    inactive: { bg: '#374151', color: '#9CA3AF' },
    past_due: { bg: '#78350F', color: '#FBBF24' },
    cancelled: { bg: '#7F1D1D', color: '#F87171' }
  }
  const c = config[status] || config.inactive
  return (
    <Badge bg={c.bg} color={c.color} px={2} py={0.5} borderRadius="md" fontSize="xs" fontWeight="600">
      {status}
    </Badge>
  )
}

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleteUserId, setDeleteUserId] = useState(null)
  const [editTier, setEditTier] = useState('')
  const [editAdmin, setEditAdmin] = useState(false)
  const [editFields, setEditFields] = useState({})
  const [accessDenied, setAccessDenied] = useState(false)
  const toast = useToast()

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const cancelRef = useRef()

  useEffect(() => { fetchStats(); fetchUsers() }, [])
  useEffect(() => { fetchUsers() }, [currentPage, search])

  const fetchStats = async () => {
    try {
      const data = await apiGet('/api/admin/stats')
      setStats(data)
    } catch (err) {
      setAccessDenied(true)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await apiGet(`/api/admin/users?page=${currentPage}&per_page=15&search=${search}`)
      setUsers(data.users)
      setTotalUsers(data.total)
      setTotalPages(data.pages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditTier(user.subscription_tier)
    setEditAdmin(user.is_admin)
    setEditFields({
      username: user.username || '',
      email: user.email || '',
      name: user.name || '',
      height: user.height ?? '',
      weight: user.weight ?? '',
      goal: user.goal || '',
      rep_goal: user.rep_goal ?? 8,
      ex_goal: user.ex_goal ?? 5,
      subscription_status: user.subscription_status || 'inactive',
      created_at: user.created_at ? user.created_at.slice(0, 16) : '',
    })
    onEditOpen()
  }

  const apiPut = async (path, data) => {
    const res = await fetch('http://localhost:5000' + path, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }

  const handleUpdateUser = async () => {
    try {
      await apiPut(`/api/admin/users/${selectedUser.id}`, {
        subscription_tier: editTier, is_admin: editAdmin, ...editFields
      })
      toast({ title: 'User updated', status: 'success', duration: 2000 })
      onEditClose(); fetchUsers(); fetchStats()
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3000 })
    }
  }

  const handleDelete = async () => {
    try {
      await apiDelete(`/api/admin/users/${deleteUserId}`)
      toast({ title: 'User deleted', status: 'info', duration: 2000 })
      onDeleteClose(); fetchUsers(); fetchStats()
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error', duration: 3000 })
    }
  }

  if (accessDenied) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column" gap={4}>
        <Icon as={FaCrown} boxSize={16} color="#FBBF24" />
        <Heading size="lg" color="#1F2937">Admin Access Required</Heading>
        <Text color="#6B7280">You don't have permission to access this page.</Text>
      </Flex>
    )
  }

  if (!stats) return (
    <Flex minH="60vh" align="center" justify="center">
      <Spinner size="xl" color="#6366F1" thickness="3px" />
    </Flex>
  )

  const statCards = [
    { label: 'Total Users', value: stats.total_users, sub: `${stats.recent_signups} new (30d)`, icon: FaUsers, gradient: 'linear-gradient(135deg, #6366F1, #8B5CF6)', iconBg: 'rgba(99,102,241,0.15)' },
    { label: 'Monthly Revenue', value: `$${stats.mrr}`, sub: `${stats.pro_users} Pro · ${stats.elite_users} Elite`, icon: FaDollarSign, gradient: 'linear-gradient(135deg, #10B981, #059669)', iconBg: 'rgba(16,185,129,0.15)' },
    { label: 'Exercises Tracked', value: stats.total_exercises, sub: 'All time', icon: FaDumbbell, gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', iconBg: 'rgba(245,158,11,0.15)' },
    { label: 'Video Uploads', value: stats.total_uploads, sub: 'All time', icon: FaUpload, gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', iconBg: 'rgba(236,72,153,0.15)' },
  ]

  return (
    <Box maxW="1400px" mx="auto" py={6} px={{ base: 4, md: 6 }}>
      {/* Header */}
      <Flex align="center" gap={3} mb={8}>
        <Flex align="center" justify="center" w="44px" h="44px" borderRadius="xl"
          bg="linear-gradient(135deg, #FBBF24, #F59E0B)">
          <Icon as={FaCrown} color="white" boxSize={5} />
        </Flex>
        <Box>
          <Heading size="lg" color="#111827" fontWeight="800">Admin Dashboard</Heading>
          <Text fontSize="sm" color="#6B7280">Manage users, subscriptions and analytics</Text>
        </Box>
      </Flex>

      {/* Stats Cards */}
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={5} mb={8}>
        {statCards.map((s, i) => (
          <MotionBox key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}>
            <Box bg="white" borderRadius="2xl" p={5} boxShadow="0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)"
              border="1px solid" borderColor="#F3F4F6" position="relative" overflow="hidden"
              _hover={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' }}
              transition="all 0.2s">
              <Box position="absolute" top={0} left={0} right={0} h="3px" bg={s.gradient} />
              <Flex justify="space-between" align="start">
                <Box>
                  <Text fontSize="xs" fontWeight="600" color="#9CA3AF" textTransform="uppercase" letterSpacing="0.05em" mb={1}>
                    {s.label}
                  </Text>
                  <Text fontSize="2xl" fontWeight="800" color="#111827">{s.value}</Text>
                  <Text fontSize="xs" color="#9CA3AF" mt={1}>{s.sub}</Text>
                </Box>
                <Flex w="40px" h="40px" borderRadius="xl" bg={s.iconBg} align="center" justify="center">
                  <Icon as={s.icon} boxSize={4} color={s.gradient.includes('6366F1') ? '#6366F1' : 
                    s.gradient.includes('10B981') ? '#10B981' : s.gradient.includes('F59E0B') ? '#F59E0B' : '#EC4899'} />
                </Flex>
              </Flex>
            </Box>
          </MotionBox>
        ))}
      </Grid>

      {/* Tier Breakdown */}
      <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={8}>
        {[
          { label: 'Free Tier', count: stats.free_users, pct: stats.total_users ? Math.round((stats.free_users / stats.total_users) * 100) : 0, color: '#6B7280', barBg: '#E5E7EB' },
          { label: 'Pro Tier', count: stats.pro_users, pct: stats.total_users ? Math.round((stats.pro_users / stats.total_users) * 100) : 0, color: '#3B82F6', barBg: '#DBEAFE' },
          { label: 'Elite Tier', count: stats.elite_users, pct: stats.total_users ? Math.round((stats.elite_users / stats.total_users) * 100) : 0, color: '#8B5CF6', barBg: '#EDE9FE' },
        ].map((t, i) => (
          <Box key={i} bg="white" borderRadius="xl" p={4} border="1px solid" borderColor="#F3F4F6"
            boxShadow="0 1px 2px rgba(0,0,0,0.05)">
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="sm" fontWeight="600" color="#374151">{t.label}</Text>
              <Text fontSize="xs" fontWeight="700" color={t.color}>{t.pct}%</Text>
            </Flex>
            <Text fontSize="2xl" fontWeight="800" color="#111827" mb={2}>{t.count}</Text>
            <Box w="100%" h="6px" bg={t.barBg} borderRadius="full" overflow="hidden">
              <Box h="100%" w={`${Math.max(t.pct, 2)}%`} bg={t.color} borderRadius="full"
                transition="width 0.6s ease" />
            </Box>
          </Box>
        ))}
      </Grid>

      {/* User Management */}
      <Box bg="white" borderRadius="2xl" border="1px solid" borderColor="#F3F4F6"
        boxShadow="0 1px 3px rgba(0,0,0,0.08)" overflow="hidden">
        {/* Table Header */}
        <Flex justify="space-between" align="center" p={5} borderBottom="1px solid" borderColor="#F3F4F6">
          <Box>
            <Text fontSize="lg" fontWeight="700" color="#111827">User Management</Text>
            <Text fontSize="sm" color="#9CA3AF">{totalUsers} total users</Text>
          </Box>
          <InputGroup maxW="280px" size="sm">
            <InputLeftElement><Icon as={FaSearch} color="#9CA3AF" boxSize={3} /></InputLeftElement>
            <Input placeholder="Search by name or email..." value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
              bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg"
              color="#374151" _placeholder={{ color: '#9CA3AF' }} fontSize="sm"
              _focus={{ borderColor: '#6366F1', boxShadow: '0 0 0 1px #6366F1' }} />
          </InputGroup>
        </Flex>

        {/* Table */}
        <Box overflowX="auto">
          <Table size="sm">
            <Thead bg="#F9FAFB">
              <Tr>
                {['ID', 'User', 'Email', 'Tier', 'Status', 'Exercises', 'Joined', 'Actions'].map(h => (
                  <Th key={h} color="#6B7280" fontSize="xs" fontWeight="700" textTransform="uppercase"
                    letterSpacing="0.05em" py={3} borderColor="#F3F4F6">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={8} textAlign="center" py={10} borderColor="#F3F4F6">
                  <Spinner color="#6366F1" size="md" />
                </Td></Tr>
              ) : users.length === 0 ? (
                <Tr><Td colSpan={8} textAlign="center" py={10} color="#9CA3AF" borderColor="#F3F4F6">
                  No users found
                </Td></Tr>
              ) : (
                users.map(user => (
                  <Tr key={user.id} _hover={{ bg: '#F9FAFB' }} transition="background 0.15s">
                    <Td color="#9CA3AF" fontSize="xs" fontWeight="500" borderColor="#F3F4F6">#{user.id}</Td>
                    <Td borderColor="#F3F4F6">
                      <HStack spacing={2}>
                        <Text color="#111827" fontSize="sm" fontWeight="600">{user.username || '—'}</Text>
                        {user.is_admin && (
                          <Badge bg="#FEF3C7" color="#92400E" fontSize="2xs" px={1.5} borderRadius="md" fontWeight="700">
                            ADMIN
                          </Badge>
                        )}
                      </HStack>
                    </Td>
                    <Td color="#6B7280" fontSize="sm" borderColor="#F3F4F6">{user.email}</Td>
                    <Td borderColor="#F3F4F6">{tierBadge(user.subscription_tier)}</Td>
                    <Td borderColor="#F3F4F6">{statusBadge(user.subscription_status)}</Td>
                    <Td borderColor="#F3F4F6">
                      <Text color="#374151" fontSize="sm" fontWeight="600">{user.exercise_count}</Text>
                    </Td>
                    <Td color="#9CA3AF" fontSize="xs" borderColor="#F3F4F6">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </Td>
                    <Td borderColor="#F3F4F6">
                      <HStack spacing={1}>
                        <IconButton icon={<FaEdit />} size="xs" variant="ghost" color="#6366F1"
                          _hover={{ bg: '#EEF2FF' }} onClick={() => openEditModal(user)} aria-label="Edit" />
                        <IconButton icon={<FaTrash />} size="xs" variant="ghost" color="#EF4444"
                          _hover={{ bg: '#FEF2F2' }} onClick={() => { setDeleteUserId(user.id); onDeleteOpen() }}
                          isDisabled={user.is_admin} aria-label="Delete" />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        <Flex justify="space-between" align="center" px={5} py={3} borderTop="1px solid" borderColor="#F3F4F6" bg="#F9FAFB">
          <Text fontSize="xs" color="#9CA3AF">
            Showing {users.length} of {totalUsers} users
          </Text>
          <HStack spacing={2}>
            <IconButton icon={<FaChevronLeft />} size="xs" variant="ghost" color="#6B7280"
              isDisabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} aria-label="Previous" />
            <Text fontSize="xs" color="#6B7280" fontWeight="600">
              Page {currentPage} of {totalPages}
            </Text>
            <IconButton icon={<FaChevronRight />} size="xs" variant="ghost" color="#6B7280"
              isDisabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} aria-label="Next" />
          </HStack>
        </Flex>
      </Box>

      {/* Recent Events */}
      {stats.recent_events && stats.recent_events.length > 0 && (
        <Box mt={8} bg="white" borderRadius="2xl" border="1px solid" borderColor="#F3F4F6"
          boxShadow="0 1px 3px rgba(0,0,0,0.08)" overflow="hidden">
          <Box p={5} borderBottom="1px solid" borderColor="#F3F4F6">
            <Text fontSize="lg" fontWeight="700" color="#111827">Recent Activity</Text>
            <Text fontSize="sm" color="#9CA3AF">Subscription events log</Text>
          </Box>
          <VStack align="stretch" spacing={0} maxH="280px" overflowY="auto">
            {stats.recent_events.map((evt, i) => (
              <Flex key={evt.id} justify="space-between" align="center" px={5} py={3}
                borderBottom={i < stats.recent_events.length - 1 ? '1px solid' : 'none'}
                borderColor="#F3F4F6" _hover={{ bg: '#F9FAFB' }} transition="background 0.15s">
                <HStack spacing={3}>
                  <Box w="8px" h="8px" borderRadius="full"
                    bg={evt.event_type.includes('success') || evt.event_type.includes('activated') ? '#10B981' :
                      evt.event_type.includes('cancel') ? '#EF4444' : '#6366F1'} />
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color="#374151">{evt.event_type.replace(/_/g, ' ')}</Text>
                    <Text fontSize="xs" color="#9CA3AF">User #{evt.user_id}</Text>
                  </Box>
                </HStack>
                <HStack spacing={3}>
                  {evt.tier && tierBadge(evt.tier)}
                  {evt.amount && <Text fontSize="sm" fontWeight="700" color="#10B981">${evt.amount}</Text>}
                  <Text fontSize="xs" color="#9CA3AF">{new Date(evt.created_at).toLocaleString()}</Text>
                </HStack>
              </Flex>
            ))}
          </VStack>
        </Box>
      )}

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered size="lg" scrollBehavior="inside">
        <ModalOverlay bg="rgba(0,0,0,0.4)" backdropFilter="blur(4px)" />
        <ModalContent bg="white" borderRadius="2xl" boxShadow="xl">
          <ModalHeader color="#111827" fontWeight="700" pb={1}>
            Edit User #{selectedUser?.id}
            <Text fontSize="sm" fontWeight="400" color="#9CA3AF">{selectedUser?.email}</Text>
          </ModalHeader>
          <ModalCloseButton color="#9CA3AF" />
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="xs" fontWeight="700" color="#9CA3AF" textTransform="uppercase" letterSpacing="0.1em" alignSelf="start">Personal Info</Text>
              <Grid templateColumns="1fr 1fr" gap={3} w="full">
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Username</Text>
                  <Input value={editFields.username || ''} onChange={e => setEditFields(f => ({...f, username: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Email</Text>
                  <Input value={editFields.email || ''} onChange={e => setEditFields(f => ({...f, email: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Display Name</Text>
                  <Input value={editFields.name || ''} onChange={e => setEditFields(f => ({...f, name: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Goal</Text>
                  <Input value={editFields.goal || ''} onChange={e => setEditFields(f => ({...f, goal: e.target.value}))}
                    placeholder="e.g. Build muscle" bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Height (cm)</Text>
                  <Input type="number" value={editFields.height ?? ''} onChange={e => setEditFields(f => ({...f, height: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Weight (kg)</Text>
                  <Input type="number" value={editFields.weight ?? ''} onChange={e => setEditFields(f => ({...f, weight: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Rep Goal</Text>
                  <Input type="number" value={editFields.rep_goal ?? ''} onChange={e => setEditFields(f => ({...f, rep_goal: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Exercise Goal</Text>
                  <Input type="number" value={editFields.ex_goal ?? ''} onChange={e => setEditFields(f => ({...f, ex_goal: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
              </Grid>
              <Divider borderColor="#F3F4F6" />
              <Text fontSize="xs" fontWeight="700" color="#9CA3AF" textTransform="uppercase" letterSpacing="0.1em" alignSelf="start">Account Settings</Text>
              <Grid templateColumns="1fr 1fr" gap={3} w="full">
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Subscription Tier</Text>
                  <Select value={editTier} onChange={e => setEditTier(e.target.value)}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm"
                    _focus={{ borderColor: '#6366F1' }}>
                    <option value="free">Free</option>
                    <option value="pro">Pro ($9.99/mo)</option>
                    <option value="elite">Elite ($19.99/mo)</option>
                  </Select>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Sub Status</Text>
                  <Select value={editFields.subscription_status || 'inactive'}
                    onChange={e => setEditFields(f => ({...f, subscription_status: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm"
                    _focus={{ borderColor: '#6366F1' }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Admin Access</Text>
                  <Select value={editAdmin ? 'true' : 'false'}
                    onChange={e => setEditAdmin(e.target.value === 'true')}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm"
                    _focus={{ borderColor: '#6366F1' }}>
                    <option value="false">Regular User</option>
                    <option value="true">Admin</option>
                  </Select>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="#374151" mb={1}>Created At</Text>
                  <Input type="datetime-local" value={editFields.created_at || ''}
                    onChange={e => setEditFields(f => ({...f, created_at: e.target.value}))}
                    bg="#F9FAFB" border="1px solid" borderColor="#E5E7EB" borderRadius="lg" color="#374151" size="sm" _focus={{ borderColor: '#6366F1' }} />
                </Box>
              </Grid>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onEditClose} color="#6B7280" _hover={{ bg: '#F3F4F6' }}>Cancel</Button>
            <Button bg="#6366F1" color="white" _hover={{ bg: '#4F46E5' }} borderRadius="lg"
              onClick={handleUpdateUser}>Save Changes</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay bg="rgba(0,0,0,0.4)" backdropFilter="blur(4px)">
          <AlertDialogContent bg="white" borderRadius="2xl" boxShadow="xl">
            <AlertDialogHeader color="#111827" fontWeight="700">Delete User</AlertDialogHeader>
            <AlertDialogBody color="#6B7280">
              This will permanently delete the user and all their data. This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={onDeleteClose} variant="ghost" color="#6B7280">Cancel</Button>
              <Button bg="#EF4444" color="white" _hover={{ bg: '#DC2626' }} borderRadius="lg"
                onClick={handleDelete}>Delete User</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default AdminDashboard
