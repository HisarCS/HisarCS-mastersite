'use client';

import type { ChartSpec } from '@/lib/util/chartSpec';
import styles from './Markdown.module.css';

/** Series colors — site palette, accent first (matches the curated pages). */
const PALETTE = ['#e8542f', '#141414', '#28a06d', '#2f6fe8', '#9048c8', '#c4a11f'];

const W = 640;
const H = 300;
const PAD = { top: 20, right: 12, bottom: 48, left: 52 };

/** Round the axis max up to a friendly number (1/2/2.5/5 × 10^k). */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * base) return m * base;
  return 10 * base;
}

/**
 * The site's one chart style, drawn from a parsed ```chart fence. Grouped bars
 * or multi-series lines; y starts at zero (no truncated-axis charts); value
 * labels on bars when they fit; the caption (the chart's question) is rendered
 * by the caller.
 */
export function ChartSvg({ spec }: { spec: ChartSpec }) {
  const max = niceMax(Math.max(...spec.series.flatMap((s) => s.values)));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2))));

  const groupW = iw / spec.x.length;
  const showValueLabels = spec.type === 'bar' && spec.x.length * spec.series.length <= 12;

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 26}`}
      role="img"
      aria-label={spec.question}
      className={styles.chartSvg}
    >
      {/* gridlines + y labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            y1={y(t)}
            x2={W - PAD.right}
            y2={y(t)}
            stroke="#efeadd"
            strokeWidth="1"
          />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8a8578">
            {fmt(t)}
          </text>
        </g>
      ))}
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + ih}
        stroke="#e3ded2"
        strokeWidth="1.5"
      />
      <line
        x1={PAD.left}
        y1={PAD.top + ih}
        x2={W - PAD.right}
        y2={PAD.top + ih}
        stroke="#e3ded2"
        strokeWidth="1.5"
      />

      {/* x labels */}
      {spec.x.map((label, i) => (
        <text
          key={i}
          x={PAD.left + groupW * i + groupW / 2}
          y={H - PAD.bottom + 20}
          textAnchor="middle"
          fontSize="12"
          fill="#8a8578"
        >
          {label}
        </text>
      ))}

      {/* data */}
      {spec.type === 'bar'
        ? spec.series.map((s, si) => {
            const n = spec.series.length;
            const slot = (groupW * 0.72) / n;
            const start = groupW * 0.14;
            return s.values.map((v, xi) => {
              const bx = PAD.left + groupW * xi + start + slot * si;
              return (
                <g key={`${si}-${xi}`}>
                  <rect
                    x={bx + slot * 0.08}
                    y={y(v)}
                    width={slot * 0.84}
                    height={PAD.top + ih - y(v)}
                    rx="3"
                    fill={PALETTE[si % PALETTE.length]}
                  />
                  {showValueLabels && (
                    <text
                      x={bx + slot / 2}
                      y={y(v) - 5}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="700"
                      fill="#141414"
                    >
                      {fmt(v)}
                    </text>
                  )}
                </g>
              );
            });
          })
        : spec.series.map((s, si) => {
            const px = (xi: number) => PAD.left + groupW * xi + groupW / 2;
            const d = s.values.map((v, xi) => `${xi ? 'L' : 'M'}${px(xi)},${y(v)}`).join(' ');
            return (
              <g key={si}>
                <path d={d} fill="none" stroke={PALETTE[si % PALETTE.length]} strokeWidth="2.5" />
                {s.values.map((v, xi) => (
                  <circle
                    key={xi}
                    cx={px(xi)}
                    cy={y(v)}
                    r="3.5"
                    fill={PALETTE[si % PALETTE.length]}
                  />
                ))}
              </g>
            );
          })}

      {/* legend */}
      {spec.series.map((s, si) => {
        const lx = PAD.left + si * 150;
        return (
          <g key={si}>
            <rect
              x={lx}
              y={H + 6}
              width="12"
              height="12"
              rx="2"
              fill={PALETTE[si % PALETTE.length]}
            />
            <text x={lx + 18} y={H + 16} fontSize="12" fill="#141414">
              {s.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
