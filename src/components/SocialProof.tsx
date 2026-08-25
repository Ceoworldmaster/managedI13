import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

const stats = [
  { value: '50K+', label: 'Teams worldwide' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.9/5', label: 'Average rating' },
  { value: '200+', label: 'Integrations' },
];

const testimonials = [
  {
    quote:
      'Launchly transformed how our team collaborates. We went from 2-week releases to shipping every day. Absolutely worth every penny.',
    name: 'Sarah Chen',
    role: 'CTO at Nexova',
    initials: 'SC',
    color: '#6C63FF',
  },
  {
    quote:
      'The analytics dashboard alone saved us 10 hours a week in manual reporting. Our investors love the real-time insights.',
    name: 'Marcus Rivera',
    role: 'Product Lead at Flowstate',
    initials: 'MR',
    color: '#FF6584',
  },
  {
    quote:
      "We evaluated 12 tools before choosing Launchly. The integrations, security, and team features are simply unmatched.",
    name: 'Priya Kapoor',
    role: 'VP Engineering at Stackify',
    initials: 'PK',
    color: '#43B89C',
  },
];

function StarRating() {
  return (
    <Stack direction="row" spacing={0.5}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box key={i} component="span" sx={{ color: '#FFC107', fontSize: '1.1rem' }}>★</Box>
      ))}
    </Stack>
  );
}

export default function SocialProof() {
  return (
    <>
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          background: 'linear-gradient(135deg, #6C63FF 0%, #9D95FF 100%)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((s, i) => (
              <Grid key={s.label} size={{ xs: 6, md: 3 }}>
                <Stack alignItems="center" textAlign="center" spacing={0.5}>
                  <Typography
                    variant="h2"
                    fontWeight={800}
                    sx={{ color: 'white', fontSize: { xs: '2rem', md: '2.75rem' } }}
                  >
                    {s.value}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {s.label}
                  </Typography>
                  {i < stats.length - 1 && (
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{ display: { xs: 'none', md: 'block' }, borderColor: 'rgba(255,255,255,0.2)' }}
                    />
                  )}
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: { xs: 10, md: 14 }, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Stack alignItems="center" spacing={2} textAlign="center" sx={{ mb: 8 }}>
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2}>
              Testimonials
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
              Loved by teams everywhere
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            {testimonials.map((t) => (
              <Grid key={t.name} size={{ xs: 12, md: 4 }}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    transition: 'box-shadow 0.2s ease',
                    '&:hover': { boxShadow: '0 16px 48px rgba(0,0,0,0.08)' },
                  }}
                >
                  <StarRating />
                  <Typography variant="body1" color="text.secondary" lineHeight={1.8} sx={{ flexGrow: 1 }}>
                    "{t.quote}"
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        bgcolor: t.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {t.initials}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.role}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}
