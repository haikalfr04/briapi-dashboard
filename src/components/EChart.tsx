import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

export type ChartClick = (p: echarts.ECElementEvent) => void;

interface Props {
  option: echarts.EChartsOption;
  /** Tanpa `height`, grafik mengisi penuh elemen induknya (induk harus punya tinggi). */
  height?: number;
  onClick?: ChartClick;
  ariaLabel: string;
}

export default function EChart({ option, height, onClick, ariaLabel }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const c = echarts.init(el.current!, undefined, { renderer: 'svg' });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    c.off('click');
    if (onClick) c.on('click', onClick);
  }, [onClick]);

  return (
    <div
      ref={el}
      className={height ? undefined : 'echart-fill'}
      style={height ? { height } : undefined}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
