import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
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
import ParkIcon from '@mui/icons-material/Park';
import PaidIcon from '@mui/icons-material/Paid';
import { useIsMobile } from '../hooks/useIsMobile';
import { useGame } from '../context/PlayerContext';

interface TabDef {
  label: string;
  path: string;
}

interface SectionDef {
  label: string;
  basePath: string;
  tabs?: TabDef[];
}

// Top-level navigation. Each section is a top-bar button; its tabs become the
// contextual left sidebar.
const SECTIONS: SectionDef[] = [
  { label: 'Park', basePath: '/', tabs: [{ label: 'Overview', path: '/' }] },
  { label: 'Habitats', basePath: '/habitats' },
  { label: 'Research', basePath: '/research' },
  { label: 'Production', basePath: '/production' },
  { label: 'Profile', basePath: '/profile' },
];

const APP_NAME = 'Dino Park Manager';
const SIDEBAR_OPEN = 200;
const SIDEBAR_COLLAPSED = 48;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { player } = useGame();

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
            <ParkIcon sx={{ mr: 1 }} />
            <Typography
              variant="h6"
              noWrap
              onClick={() => navigate('/')}
              sx={{
                mr: 3,
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.1rem',
                color: 'inherit',
                cursor: 'pointer',
                display: { xs: 'none', sm: 'block' },
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

            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {SECTIONS.map((section) => (
                <Button
                  key={section.basePath}
                  onClick={() => navigate(section.basePath)}
                  sx={{
                    my: 2,
                    color: 'primary.contrastText',
                    display: 'block',
                    fontWeight: activeSection === section ? 700 : 400,
                    borderBottom: '2px solid',
                    borderColor: activeSection === section ? 'secondary.main' : 'transparent',
                    borderRadius: 0,
                  }}
                >
                  {section.label}
                </Button>
              ))}
            </Box>

            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
            <Chip
              icon={<PaidIcon />}
              color="secondary"
              label={(player?.currency ?? 0).toLocaleString()}
              sx={{ fontWeight: 700 }}
            />
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
            {SECTIONS.map((section) => (
              <Box key={section.basePath}>
                <ListItemButton
                  onClick={() => handleNavClick(section.basePath)}
                  sx={{ py: 1, px: 2 }}
                >
                  <ListItemText
                    primary={section.label}
                    primaryTypographyProps={{ fontWeight: 700 }}
                  />
                </ListItemButton>
                <Divider />
              </Box>
            ))}
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
                  <Tooltip key={tab.path} title={sidebarOpen ? '' : tab.label} placement="right">
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
                          }}
                        />
                      ) : (
                        <Typography variant="body2">{tab.label.charAt(0)}</Typography>
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
