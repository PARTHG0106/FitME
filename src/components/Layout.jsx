import { Box, Flex, VStack, IconButton, useColorMode, useDisclosure } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMenu, FiX, FiHome, FiUser, FiActivity, FiLogOut, FiUpload, FiAward, FiCalendar, FiBarChart2 } from 'react-icons/fi'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)

const SidebarItem = ({ icon: Icon, label, to, isActive }) => (
  <Link to={to}>
    <MotionFlex
      align="center"
      p={4}
      mx={2}
      borderRadius="lg"
      role="group"
      cursor="pointer"
      bg={isActive ? 'blue.500' : 'transparent'}
      color={isActive ? 'white' : 'gray.600'}
      _hover={{
        bg: isActive ? 'blue.600' : 'gray.100',
        color: isActive ? 'white' : 'gray.900',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition="all 0.2s"
    >
      <Icon size={20} />
      <Box ml={4} display={{ base: 'none', md: 'block' }}>
        {label}
      </Box>
    </MotionFlex>
  </Link>
)

const Layout = ({ children }) => {
  const { isOpen, onToggle } = useDisclosure()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    // Add your logout logic here
    navigate('/')
  }

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <MotionBox
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 20 }}
            position="fixed"
            left={0}
            top={0}
            bottom={0}
            w="250px"
            bg="white"
            boxShadow="lg"
            zIndex={20}
          >
            <VStack spacing={4} align="stretch" p={4}>
              <IconButton
                icon={<FiX />}
                variant="ghost"
                onClick={onToggle}
                alignSelf="flex-end"
              />
              <SidebarItem
                icon={FiHome}
                label="Dashboard"
                to="/dashboard"
                isActive={location.pathname === '/dashboard'}
              />
              <SidebarItem
                icon={FiActivity}
                label="Exercises"
                to="/exercises"
                isActive={location.pathname === '/exercises'}
              />
              <SidebarItem
                icon={FiUser}
                label="Profile"
                to="/profile"
                isActive={location.pathname === '/profile'}
              />
              <SidebarItem
                icon={FiUpload}
                label="Upload Exercise"
                to="/upload-exercise"
                isActive={location.pathname === '/upload-exercise'}
              />
              <SidebarItem
                icon={FiBarChart2}
                label="Recommendations"
                to="/recommendations"
                isActive={location.pathname === '/recommendations'}
              />
              <SidebarItem
                icon={FiAward}
                label="Leaderboard"
                to="/leaderboard"
                isActive={location.pathname === '/leaderboard'}
              />
              <SidebarItem
                icon={FiCalendar}
                label="Schedule"
                to="/schedule"
                isActive={location.pathname === '/schedule'}
              />
              <MotionFlex
                align="center"
                p={4}
                mx={2}
                borderRadius="lg"
                role="group"
                cursor="pointer"
                color="gray.600"
                _hover={{
                  bg: 'gray.100',
                  color: 'gray.900',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition="all 0.2s"
                onClick={handleLogout}
              >
                <FiLogOut size={20} />
                <Box ml={4} display={{ base: 'none', md: 'block' }}>
                  Logout
                </Box>
              </MotionFlex>
            </VStack>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <Box flex={1} ml={{ base: 0, md: isOpen ? '250px' : 0 }}>
        <MotionFlex
          p={4}
          align="center"
          justify="space-between"
          bg="white"
          boxShadow="sm"
        >
          <IconButton
            icon={<FiMenu />}
            variant="ghost"
            onClick={onToggle}
            aria-label="Toggle Sidebar"
          />
          {/* Add your header content here */}
        </MotionFlex>

        <Box p={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </Box>
      </Box>
    </Flex>
  )
}

export default Layout 