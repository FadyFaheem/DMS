import { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface TabDef {
  label: string;
  path: string;
  perm?: string;
  adminOnly?: boolean;
}

interface SectionDef {
  label: string;
  basePath: string;
  adminOnly?: boolean;
  perm?: string;
  tabs?: TabDef[];
}

// Edit this to define your app's top-level navigation. Each section becomes a
// button in the top AppBar; its tabs become left-sidebar items when that
// section is active. Permissions are checked via `hasPerm()`.
const SECTIONS: SectionDef[] = [
  {
    label: 'Dashboard',
    basePath: '/',
    tabs: [{ label: 'Overview', path: '/' }],
  },
  {
    label: 'Admin',
    basePath: '/admin',
    adminOnly: true,
    tabs: [
      { label: 'Users', path: '/admin' },
    ],
  },
];

const APP_NAME = 'Web Template';
const SIDEBAR_OPEN = 200;
const SIDEBAR_COLLAPSED = 48;

export default function AppLayout() {
  const { user, isAdmin, logout, hasPerm, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const hasAnyAccess = isAdmin || Object.values(permissions).some(Boolean);

  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => {
      if (s.adminOnly && !isAdmin) return false;
      if (s.perm && !hasPerm(s.perm)) return false;
      return true;
    }),
    [isAdmin, hasPerm],
  );

  const activeSection = useMemo(() => {
    for (const section of [...visibleSections].reverse()) {
      if (
        location.pathname === section.basePath ||
        location.pathname.startsWith(section.basePath + '/')
      ) {
        return section;
      }
      if (section.tabs?.some((t) =>
        location.pathname === t.path || location.pathname.startsWith(t.path + '/'),
      )) {
        return section;
      }
    }
    return visibleSections[0];
  }, [location.pathname, visibleSections]);

  const activeTabs = useMemo(
    () => (activeSection?.tabs ?? []).filter((t) => {
      if (t.perm && !hasPerm(t.perm)) return false;
      if (t.adminOnly && !isAdmin) return false;
      return true;
    }),
    [activeSection, hasPerm, isAdmin],
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  const userMenuItems = [
    { label: 'Change Password', action: () => navigate('/change-password') },
    { label: 'Logout', action: logout },
  ];

  const initials = user?.username
    ? user.username.slice(0, 1).toUpperCase()
    : '?';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      <AppBar position="static" sx={{ flexShrink: 0 }}>
        <Container maxWidth={false}>
          <Toolbar disableGutters>
            <DashboardIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              component="span"
              onClick={() => navigate('/')}
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.15rem',
                color: 'inherit',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {APP_NAME}
            </Typography>

            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="navigation menu"
                onClick={() => setMobileDrawerOpen(true)}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            <DashboardIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
            <Typography
              variant="h5"
              noWrap
              component="span"
              onClick={() => navigate('/')}
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.15rem',
                color: 'inherit',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {APP_NAME}
            </Typography>

            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {visibleSections.map((section) => {
                const isActive = activeSection === section;
                return (
                  <Button
                    key={section.basePath}
                    onClick={() => navigate(section.basePath)}
                    sx={{
                      my: 2,
                      color: 'primary.contrastText',
                      display: 'block',
                      fontWeight: isActive ? 700 : 400,
                      borderBottom: isActive ? '2px solid' : '2px solid transparent',
                      borderColor: isActive ? 'secondary.main' : 'transparent',
                      borderRadius: 0,
                    }}
                  >
                    {section.label}
                  </Button>
                );
              })}
            </Box>

            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title={user?.username ?? 'Account'}>
                <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} sx={{ p: 0 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>{initials}</Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar-user"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorElUser)}
                onClose={() => setAnchorElUser(null)}
              >
                {userMenuItems.map((item) => (
                  <MenuItem
                    key={item.label}
                    onClick={() => {
                      setAnchorElUser(null);
                      item.action();
                    }}
                  >
                    <Typography textAlign="center">{item.label}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {!hasAnyAccess ? (
        <Box sx={{ display: 'grid', placeItems: 'center', flex: 1, minHeight: 0 }}>
          <Paper sx={{ p: 5, maxWidth: 460, textAlign: 'center' }}>
            <LockOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              No Access
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your account does not have any permissions assigned. Contact an administrator to get access.
            </Typography>
            <Button variant="outlined" onClick={logout}>
              Log Out
            </Button>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Drawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 },
            }}
          >
            <Box sx={{ py: 1 }}>
              {visibleSections.map((section) => {
                const isSectionActive = activeSection === section;
                const sectionTabs = (section.tabs ?? []).filter((t) => !t.perm || hasPerm(t.perm));
                return (
                  <Box key={section.basePath}>
                    <ListItemButton
                      onClick={() => handleNavClick(section.basePath)}
                      selected={isSectionActive && sectionTabs.length === 0}
                      sx={{ py: 1, px: 2 }}
                    >
                      <ListItemText
                        primary={section.label}
                        primaryTypographyProps={{ fontWeight: 700, variant: 'body1' }}
                      />
                    </ListItemButton>
                    {isSectionActive && sectionTabs.length > 0 && (
                      <List disablePadding>
                        {sectionTabs.map((tab) => (
                          <ListItemButton
                            key={tab.path}
                            selected={tab.path === location.pathname}
                            onClick={() => handleNavClick(tab.path)}
                            sx={{ py: 0.5, pl: 4 }}
                          >
                            <ListItemText
                              primary={tab.label}
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: tab.path === location.pathname ? 700 : 400,
                              }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    )}
                    <Divider />
                  </Box>
                );
              })}
            </Box>
          </Drawer>

          {!isMobile && activeTabs.length > 0 && (
            <Box
              sx={{
                width: sidebarOpen ? SIDEBAR_OPEN : SIDEBAR_COLLAPSED,
                flexShrink: 0,
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: 'grey.50',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease',
              }}
            >
              <List disablePadding sx={{ flex: 1 }}>
                {activeTabs.map((tab) => {
                  const isActive = tab.path === location.pathname;
                  return (
                    <Tooltip
                      key={tab.path}
                      title={sidebarOpen ? '' : tab.label}
                      placement="right"
                      enterDelay={500}
                      enterNextDelay={300}
                    >
                      <ListItemButton
                        selected={isActive}
                        onClick={() => navigate(tab.path)}
                        sx={{
                          py: 1,
                          px: sidebarOpen ? 2 : 0,
                          justifyContent: sidebarOpen ? 'flex-start' : 'center',
                        }}
                      >
                        {sidebarOpen ? (
                          <ListItemText
                            primary={tab.label}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: isActive ? 700 : 400,
                              noWrap: true,
                            }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: isActive ? 700 : 400 }}
                          >
                            {tab.label.charAt(0)}
                          </Typography>
                        )}
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                <IconButton size="small" onClick={() => setSidebarOpen((v) => !v)}>
                  {sidebarOpen ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Box>
          )}

          <Box component="main" sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Outlet />
          </Box>
        </Box>
      )}
    </Box>
  );
}
