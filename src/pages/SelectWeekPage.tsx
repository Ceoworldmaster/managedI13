import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useWeek } from '../lib/weekContext';

export default function SelectWeekPage() {
  const { weeks, loading, selectedWeekId, confirmWeek } = useWeek();
  const [choice, setChoice] = useState<number | ''>('');

  const sortedWeeks = useMemo(() => [...weeks].sort((a, b) => a.week_number - b.week_number), [weeks]);

  // Seed the dropdown with the context's default (the currently open week)
  // once the week list has loaded.
  useEffect(() => {
    if (selectedWeekId && choice === '') setChoice(selectedWeekId);
  }, [selectedWeekId, choice]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <CalendarMonthIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight={700}>
                Chọn tuần học
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Toàn bộ điểm thi đua, báo cáo, chấm KTX và lao động đều được tổ chức theo tuần học.
                Hãy chọn tuần bạn muốn thao tác trước khi tiếp tục.
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : sortedWeeks.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Chưa có tuần học nào được thiết lập. Vui lòng liên hệ GVCN.
              </Typography>
            ) : (
              <>
                <FormControl fullWidth size="medium">
                  <InputLabel>Tuần học</InputLabel>
                  <Select
                    value={choice === '' ? '' : String(choice)}
                    label="Tuần học"
                    onChange={(e) => setChoice(Number(e.target.value))}
                  >
                    {sortedWeeks.map((w) => (
                      <MenuItem key={w.id} value={String(w.id)}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            Tuần {w.week_number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {w.start_date} → {w.end_date}
                          </Typography>
                          {w.is_closed && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              (đã đóng)
                            </Typography>
                          )}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={choice === ''}
                  onClick={() => choice !== '' && confirmWeek(choice)}
                >
                  Tiếp tục
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
