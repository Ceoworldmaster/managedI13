import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { isStudentRole } from '../lib/auth';
import { useWeek } from '../lib/weekContext';
import { supabase, type Profile, type PointLog, type Team, type DormRoom } from '../lib/supabase';
import StudentDetailDialog from '../components/StudentDetailDialog';
import WeeklyTrendChart, { type WeeklyTrendPoint } from '../components/WeeklyTrendChart';
import WeekSelector from '../components/WeekSelector';

interface StudentScore {
  profile: Profile;
  totalPoints: number;
  deductionCount: number;
}

export default function DashboardPage() {
  const { weeks, selectedWeekId, selectedWeek: currentWeek, setSelectedWeekId } = useWeek();
  const [students, setStudents] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dormRooms, setDormRooms] = useState<DormRoom[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [detailStudent, setDetailStudent] = useState<Profile | null>(null);
  const [trend, setTrend] = useState<WeeklyTrendPoint[]>([]);

  const loadData = useCallback(async () => {
    const [studentsRes, teamsRes, dormRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('teams').select('*').order('id'),
      supabase.from('dorm_rooms').select('*').order('room_number'),
    ]);

    // GVCN (giáo viên chủ nhiệm) is a teacher account, not a student — exclude
    // it from the roster used for rankings.
    if (studentsRes.data) setStudents((studentsRes.data as Profile[]).filter(isStudentRole));
    if (teamsRes.data) setTeams(teamsRes.data as Team[]);
    if (dormRes.data) setDormRooms(dormRes.data as DormRoom[]);
  }, []);

  const loadPointLogs = useCallback(async () => {
    if (!selectedWeekId) return;
    const { data } = await supabase
      .from('point_logs')
      .select('*, student:profiles!point_logs_student_id_fkey(*), recorder:profiles!point_logs_recorder_id_fkey(full_name), rule:rules(*)')
      .eq('week_id', selectedWeekId)
      .order('created_at', { ascending: false });
    if (data) setPointLogs(data as unknown as PointLog[]);
  }, [selectedWeekId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadPointLogs(); }, [loadPointLogs]);

  const loadTrend = useCallback(async () => {
    if (weeks.length === 0 || students.length === 0) return;
    const { data } = await supabase
      .from('point_logs')
      .select('week_id, points, type')
      .in('week_id', weeks.map((w) => w.id));
    const logs = (data as { week_id: number; points: number; type: 'cong' | 'tru' }[]) || [];
    const recentWeeks = [...weeks].sort((a, b) => a.week_number - b.week_number).slice(-8);
    const points: WeeklyTrendPoint[] = recentWeeks.map((w) => {
      const weekLogs = logs.filter((l) => l.week_id === w.id);
      const net = weekLogs.reduce((sum, l) => sum + (l.type === 'tru' ? -Math.abs(l.points) : l.points), 0);
      const violations = weekLogs.filter((l) => l.type === 'tru').length;
      const avgScore = students.length > 0 ? 100 + net / students.length : 100;
      return { weekNumber: w.week_number, avgScore, violations };
    });
    setTrend(points);
  }, [weeks, students]);

  useEffect(() => { loadTrend(); }, [loadTrend]);

  const computeScores = (filterFn?: (p: Profile) => boolean): StudentScore[] => {
    const filtered = filterFn ? students.filter(filterFn) : students;
    return filtered.map((s) => {
      const logs = pointLogs.filter((l) => l.student_id === s.id);
      const total = logs.reduce((sum, l) => sum + (l.type === 'tru' ? -Math.abs(l.points) : l.points), 0);
      const deductionCount = logs.filter((l) => l.type === 'tru').length;
      return { profile: s, totalPoints: 100 + total, deductionCount };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const allScores = computeScores();
  const teamScores = teams.map((team) => ({ team, scores: computeScores((p) => p.team_id === team.id) }));
  const dormScores = dormRooms.map((room) => ({ room, scores: computeScores((p) => p.dorm_room_id === room.id) }));

  const supportStudents = [...allScores].sort((a, b) => a.totalPoints - b.totalPoints).filter((s) => s.deductionCount > 0).slice(0, 10);

  const classAvg = allScores.length > 0 ? (allScores.reduce((sum, s) => sum + s.totalPoints, 0) / allScores.length).toFixed(1) : '0';
  const totalViolations = pointLogs.filter((l) => l.type === 'tru').length;

  const kpiCards = [
    { label: 'Điểm TB lớp', value: classAvg, icon: <TrendingUpIcon />, color: 'primary.main', bgColor: '#EFF6FF' },
    { label: 'Lượt vi phạm', value: totalViolations, icon: <TrendingDownIcon />, color: 'error.main', bgColor: '#FEF2F2' },
    { label: 'Học sinh cần hỗ trợ', value: supportStudents.length, icon: <WarningAmberIcon />, color: 'warning.main', bgColor: '#FFFBEB' },
    { label: 'Tuần hiện tại', value: currentWeek ? `Tuần ${currentWeek.week_number}` : '-', icon: <AssessmentIcon />, color: 'success.main', bgColor: '#F0FDF4' },
  ];

  const tabFilters: { label: string; scores: StudentScore[] }[] = [
    { label: 'Tất cả', scores: allScores },
    ...teamScores.map((t) => ({ label: t.team.name, scores: t.scores })),
    ...dormScores.map((d) => ({ label: d.room.room_number, scores: d.scores })),
  ];

  const currentTab = tabFilters[tabValue] || tabFilters[0];

  const getPointColor = (score: number) => {
    if (score >= 100) return 'success';
    if (score >= 85) return 'warning';
    return 'error';
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Tổng quan
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentWeek ? `Tuần ${currentWeek.week_number} (${currentWeek.start_date} - ${currentWeek.end_date})` : 'Chưa có tuần học'}
        </Typography>
      </Box>

      {weeks.length > 0 && (
        <WeekSelector weeks={weeks} selectedWeekId={selectedWeekId} onChange={setSelectedWeekId} />
      )}

      {/* KPI Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {kpiCards.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ p: { xs: 1.75, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={{ xs: 1.25, sm: 2 }}>
                  <Box
                    sx={{
                      width: { xs: 38, sm: 44 },
                      height: { xs: 38, sm: 44 },
                      borderRadius: 2,
                      bgcolor: kpi.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: kpi.color,
                      flexShrink: 0,
                      '& .MuiSvgIcon-root': { fontSize: { xs: 18, sm: 24 } },
                    }}
                  >
                    {kpi.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      {kpi.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {kpi.label}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Weekly Trend Chart */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <ShowChartIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Xu hướng theo tuần
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Điểm trung bình lớp và số lượt vi phạm trong 8 tuần gần nhất
          </Typography>
          <WeeklyTrendChart data={trend} />
        </CardContent>
      </Card>

      {/* Competition Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
              {tabFilters.map((tab, i) => (
                <Tab key={i} label={tab.label} sx={{ textTransform: 'none', fontSize: '0.85rem' }} />
              ))}
            </Tabs>
          </Box>
          <Box sx={{ px: 2, pt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Nhấp vào một học sinh để xem chi tiết lỗi &amp; điểm cộng
            </Typography>
          </Box>
          <TableContainer className="mobile-card-table">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Hạng</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Học sinh</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Mã HS</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Điểm thi đua</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Lượt vi phạm</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentTab.scores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Chưa có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  currentTab.scores.map((s, i) => (
                    <TableRow
                      key={s.profile.id}
                      hover
                      onClick={() => setDetailStudent(s.profile)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell data-label="Hạng">
                        <Chip
                          size="small"
                          label={i + 1}
                          color={i < 3 ? 'primary' : 'default'}
                          variant={i < 3 ? 'filled' : 'outlined'}
                          sx={{ minWidth: 28 }}
                        />
                      </TableCell>
                      <TableCell data-label="Học sinh">
                        <Typography variant="body2" fontWeight={500}>
                          {s.profile.full_name}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Mã HS">
                        <Typography variant="body2" color="text.secondary">
                          {s.profile.student_code}
                        </Typography>
                      </TableCell>
                      <TableCell data-label="Điểm thi đua">
                        <Chip
                          size="small"
                          label={s.totalPoints}
                          color={getPointColor(s.totalPoints) as 'success' | 'warning' | 'error'}
                          sx={{ fontWeight: 700, minWidth: 48 }}
                        />
                      </TableCell>
                      <TableCell data-label="Lượt vi phạm">
                        <Typography variant="body2" color={s.deductionCount > 0 ? 'error.main' : 'text.secondary'}>
                          {s.deductionCount}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Support Table */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <WarningAmberIcon color="warning" />
            <Typography variant="h6" fontWeight={600}>
              Học sinh cần hỗ trợ
            </Typography>
          </Stack>
          <TableContainer className="mobile-card-table">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Học sinh</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Điểm</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vi phạm</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supportStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Không có học sinh cần hỗ trợ
                    </TableCell>
                  </TableRow>
                ) : (
                  supportStudents.map((s) => (
                    <TableRow
                      key={s.profile.id}
                      hover
                      onClick={() => setDetailStudent(s.profile)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell data-label="Học sinh">{s.profile.full_name}</TableCell>
                      <TableCell data-label="Điểm">
                        <Chip size="small" label={s.totalPoints} color="error" sx={{ fontWeight: 700, minWidth: 40 }} />
                      </TableCell>
                      <TableCell data-label="Vi phạm">{s.deductionCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <StudentDetailDialog student={detailStudent} onClose={() => setDetailStudent(null)} />
    </Stack>
  );
}
