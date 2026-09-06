import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import type { AcademicWeek } from '../lib/supabase';

interface Props {
  weeks: AcademicWeek[];
  selectedWeekId: number | null;
  onChange: (weekId: number) => void;
  /** Show the "current week" quick-jump button (default true). */
  showJumpToCurrent?: boolean;
}

export default function WeekSelector({ weeks, selectedWeekId, onChange, showJumpToCurrent = true }: Props) {
  const sortedWeeks = useMemo(
    () => [...weeks].sort((a, b) => a.week_number - b.week_number),
    [weeks],
  );

  const currentIndex = sortedWeeks.findIndex((w) => w.id === selectedWeekId);
  const currentWeek = currentIndex >= 0 ? sortedWeeks[currentIndex] : null;

  const openWeek = sortedWeeks.find((w) => !w.is_closed);

  const goPrev = () => {
    if (currentIndex > 0) onChange(sortedWeeks[currentIndex - 1].id);
  };
  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < sortedWeeks.length - 1) onChange(sortedWeeks[currentIndex + 1].id);
  };

  if (!currentWeek) return null;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
        <IconButton size="small" onClick={goPrev} disabled={currentIndex <= 0}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={goNext} disabled={currentIndex >= sortedWeeks.length - 1}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>

      <FormControl size="small" sx={{ minWidth: 160, flex: 1 }}>
        <Select
          value={String(currentWeek.id)}
          onChange={(e) => onChange(Number(e.target.value))}
          sx={{ '& .MuiSelect-select': { py: 0.75, px: 1.5 } }}
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

      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, whiteSpace: 'nowrap' }}>
        {currentWeek.start_date} → {currentWeek.end_date}
      </Typography>

      {showJumpToCurrent && openWeek && openWeek.id !== currentWeek.id && (
        <IconButton
          size="small"
          onClick={() => onChange(openWeek.id)}
          title="Về tuần hiện tại"
          sx={{ flexShrink: 0, color: 'primary.main' }}
        >
          <TodayIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
