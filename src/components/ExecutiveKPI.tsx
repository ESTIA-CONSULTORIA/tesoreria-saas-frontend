import { ReactNode } from 'react';

interface ExecutiveKPIProps {
  label: string;
  value: string | number;
  secondary?: string | number;
  context?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export default function ExecutiveKPI({
  label,
  value,
  secondary,
  context,
  trend,
  trendValue,
  icon,
  onClick,
}: ExecutiveKPIProps) {
  const getTrendColor = () => {
    if (trend === 'up') return '#2F855A';
    if (trend === 'down') return '#C53030';
    return '#A3A3A3';
  };

  return (
    <div
      onClick={onClick}
      className="p-5 cursor-pointer transition-colors"
      style={{
        backgroundColor: '#161616',
        border: '1px solid #2D2D2D',
        borderRadius: '6px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1F1F1F'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#161616'; }}
    >
      <div className="flex items-start justify-between mb-3">
        <p style={{ fontSize: '12px', color: '#A3A3A3', letterSpacing: '0.05em', fontWeight: 500 }}>
          {label.toUpperCase()}
        </p>
        {icon && <div style={{ color: '#7E7E7E' }}>{icon}</div>}
      </div>

      <div className="mb-2">
        <p style={{ fontSize: '28px', fontWeight: 600, color: '#F5F5F5', lineHeight: 1, fontFamily: 'monospace' }}>
          {typeof value === 'number' ? value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value}
        </p>
      </div>

      {(secondary || trendValue) && (
        <div className="flex items-center gap-2 mb-2">
          {trendValue && (
            <span style={{ fontSize: '13px', fontWeight: 500, color: getTrendColor() }}>
              {trendValue}
            </span>
          )}
          {secondary && (
            <span style={{ fontSize: '12px', color: '#7E7E7E' }}>
              {typeof secondary === 'number' ? secondary.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : secondary}
            </span>
          )}
        </div>
      )}

      {context && (
        <p style={{ fontSize: '11px', color: '#7E7E7E', lineHeight: 1.3 }}>
          {context}
        </p>
      )}
    </div>
  );
}
