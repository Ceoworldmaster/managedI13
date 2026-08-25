import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import BoltIcon from '@mui/icons-material/Bolt';
import GroupsIcon from '@mui/icons-material/Groups';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import AutorenewIcon from '@mui/icons-material/Autorenew';

const features = [
  {
    icon: <BoltIcon />,
    title: 'Lightning Fast',
    description: 'Ship features in hours, not weeks. Our streamlined workflow helps teams move at startup speed.',
    color: '#6C63FF',
    bg: '#F0EEFF',
  },
  {
    icon: <GroupsIcon />,
    title: 'Team Collaboration',
    description: 'Real-time collaboration tools keep your entire team aligned, from ideation to deployment.',
    color: '#FF6584',
    bg: '#FFF0F3',
  },
  {
    icon: <BarChartIcon />,
    title: 'Advanced Analytics',
    description: 'Make data-driven decisions with powerful built-in analytics and custom reporting dashboards.',
    color: '#43B89C',
    bg: '#EDFAF6',
  },
  {
    icon: <SecurityIcon />,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SSO, and compliance tools keep your data and your customers safe.',
    color: '#FFA55A',
    bg: '#FFF4EB',
  },
  {
    icon: <IntegrationInstructionsIcon />,
    title: '200+ Integrations',
    description: 'Connect with the tools your team already uses — Slack, GitHub, Jira, Salesforce, and more.',
    color: '#5BB8F5',
    bg: '#EDF6FE',
  },
  {
    icon: <AutorenewIcon />,
    title: 'Automated Workflows',
    description: 'Set it and forget it. Automate repetitive tasks so your team can focus on what matters.',
    color: '#9C6FE0',
    bg: '#F4EEFF',
  },
];

export default function Features() {
  return (
    <Box sx={{ py: { xs: 10, md: 14 }, bgcolor: 'background.default' }}>
      <Container maxWidth="lg">
        <Stack alignItems="center" spacing={2} textAlign="center" sx={{ mb: 8 }}>
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2}>
            Features
          </Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
            Everything your team needs
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ maxWidth: 500 }}>
            Powerful features designed to help modern teams build, ship, and grow.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {features.map((f) => (
            <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 16px 48px rgba(0,0,0,0.08)`,
                  },
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Stack spacing={2.5}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 3,
                        bgcolor: f.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: f.color,
                      }}
                    >
                      {f.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {f.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                        {f.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
