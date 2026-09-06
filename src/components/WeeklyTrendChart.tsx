import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

export interface WeeklyTrendPoint {
  weekNumber: number;
  avgScore: number;
  violations: number;
}

interface Props {
  data: WeeklyTrendPoint[];
  height?: number;
}

/**
 * Small dependency-free SVG chart: a bar per week for violation count, with
 * a line overlay for the class's average competition score. Built with raw
 * SVG (no charting library) so it stays lightweight and themeable.
 */
export default function WeeklyTrendChart({ data, height = 220 }: Props) {
  const theme = useTheme();

  const { bars, linePoints, width } = useMemo(() => {
    const width = Math.max(320, data.length * 64);
    const padding = { top: 16, right: 16, bottom: 28, left: 8 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxViolations = Math.max(1, ...data.map((d) => d.violations));
    const scores = data.map((d) => d.avgScore);
    const minScore = Math.min(80, ...scores);
    const maxScore = Math.max(105, ...scores);
    const step = data.length > 0 ? chartW / data.length : chartW;

    const bars = data.map((d, i) => {
      const barH = (d.violations / maxViolations) * (chartH - 20);
      return {
        x: padding.left + i * step + step * 0.25,
        y: padding.top + chartH - barH,
        w: step * 0.5,
        h: barH,
        label: `T${d.weekNumber}`,
        value: d.violations,
      };
    });

    const linePoints = data.map((d, i) => {
      const x = padding.left + i * step + step * 0.5;
      const ratio = (d.avgScore - minScore) / (maxScore - minScore || 1);
      const y = padding.top + chartH - ratio * chartH;
      return { x, y, value: d.avgScore };
    });

    return { bars, linePoints, width };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
        Chưa có đủ dữ liệu để hiển thị biểu đồ
      </Box>
    );
  }

  const linePath = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const violationColor = theme.palette.error.main;
  const scoreColor = theme.palette.primary.main;
  const gridColor = theme.palette.divider;
  const textColor = theme.palette.text.secondary;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }}>
        {/* baseline */}
        <line x1={0} y1={height - 28} x2={width} y2={height - 28} stroke={gridColor} strokeWidth={1} />

        {bars.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={violationColor} opacity={0.75} />
            {b.value > 0 && (
              <text x={b.x + b.w / 2} y={b.y - 4} textAnchor="middle" fontSize={10} fill={violationColor}>
                {b.value}
              </text>
            )}
            <text x={b.x + b.w / 2} y={height - 12} textAnchor="middle" fontSize={11} fill={textColor}>
              {b.label}
            </text>
          </g>
        ))}

        <path d={linePath} fill="none" stroke={scoreColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {linePoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={scoreColor} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={10} fill={scoreColor} fontWeight={600}>
              {p.value.toFixed(0)}
            </text>
          </g>
        ))}
      </svg>
      <Box sx={{ display: 'flex', gap: 2.5, mt: 0.5, fontSize: '0.75rem', color: 'text.secondary', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: scoreColor }} /> Điểm TB lớp
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: violationColor, opacity: 0.75 }} /> Lượt vi phạm
        </Box>
      </Box>
    </Box>
  );
}
