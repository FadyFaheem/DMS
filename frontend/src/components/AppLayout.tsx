import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useIsMobile } from '../hooks/useIsMobile';

interface TabDef {
  label: string;
  path: string;
}

interface SectionDef {
  label: string;
  basePath: string;
  tabs?: TabDef[];
}

// Edit this to define your app's top-level navigation. Each section becomes a
// button in the top AppBar; its tabs become left-sidebar items when that
// section is active.
const SECTIONS: SectionDef[] = [
  {
    label: 'Dashboard',
    basePath: '/',
    tabs: [{ label: 'Overview', path: '/' }],
  },
];

const APP_NAME = 'Web Template';
const SIDEBAR_OPEN = 200;
const SIDEBAR_COLLAPSED = 48;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const activeSection = useMemo(() => {
    for (const section of [...SECTIONS].reverse()) {
      if (
        location.pathname === section.basePath ||
        location.pathname.startsWith(section.basePath + '/')
      ) {
        return section;
      }
      if (
        section.tabs?.some(
          (t) => location.pathname === t.path || location.pathname.startsWith(t.path + '/'),
        )
      ) {
        return section;
      }
    }
    return SECTIONS[0];
  }, [location.pathname]);

  const activeTabs = activeSection?.tabs ?? [];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
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
              {SECTIONS.map((section) => {
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
          </Toolbar>
        </Container>
      </AppBar>

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
            {SECTIONS.map((section) => {
              const isSectionActive = activeSection === section;
              const sectionTabs = section.tabs ?? [];
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
                        <Typography variant="body2" sx={{ fontWeight: isActive ? 700 : 400 }}>
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
                {sidebarOpen ? (
                  <ChevronLeftIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Box>
        )}

        <Box
          component="main"
          sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: { xs: 1.5, sm: 2, md: 3 } }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
