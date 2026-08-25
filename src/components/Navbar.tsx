import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import MenuIcon from '@mui/icons-material/Menu';

function ElevationScroll({ children }: { children: React.ReactElement }) {
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 0 });
  if (!trigger) return children;
  return React.cloneElement(children, { elevation: 2 } as object);
}

const navLinks = ['Features', 'Pricing', 'About', 'Blog'];

export default function Navbar() {
  return (
    <ElevationScroll>
      <AppBar
        position="fixed"
        color="transparent"
        sx={{
          backdropFilter: 'blur(16px)',
          bgcolor: 'rgba(248,249,254,0.85)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ maxWidth: 'xl', mx: 'auto', width: '100%', px: { xs: 2, md: 4 } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RocketLaunchIcon sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Launchly
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
            {navLinks.map((link) => (
              <Button key={link} color="inherit" sx={{ color: 'text.secondary', fontWeight: 500, borderRadius: 2 }}>
                {link}
              </Button>
            ))}
            <Button variant="outlined" color="primary" size="small" sx={{ ml: 1 }}>
              Log in
            </Button>
            <Button variant="contained" color="primary" size="small">
              Get started
            </Button>
          </Stack>

          <IconButton sx={{ display: { xs: 'flex', md: 'none' } }} color="default">
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
    </ElevationScroll>
  );
}
