import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => ReactNode;
}

interface ExecutiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  selectedRowId?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export default function ExecutiveTable<T extends { id?: string }>({
  data,
  columns,
  onRowClick,
  selectedRowId,
  loading,
  emptyMessage = 'No hay datos disponibles',
}: ExecutiveTableProps<T>) {
  if (loading) {
    return (
      <div style={{ 
        backgroundColor: '#161616', 
        border: '1px solid #2D2D2D', 
        borderRadius: '6px', 
        padding: '48px', 
        textAlign: 'center',
        color: '#A3A3A3',
      }}>
        Cargando...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ 
        backgroundColor: '#161616', 
        border: '1px solid #2D2D2D', 
        borderRadius: '6px', 
        padding: '48px', 
        textAlign: 'center',
        color: '#7E7E7E',
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#161616', 
      border: '1px solid #2D2D2D', 
      borderRadius: '6px', 
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #2D2D2D' }}>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                style={{
                  padding: '12px 16px',
                  textAlign: column.align || 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#7E7E7E',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const isSelected = selectedRowId === row.id;
            return (
              <tr
                key={row.id || index}
                onClick={() => onRowClick?.(row)}
                style={{
                  backgroundColor: isSelected ? '#222222' : index % 2 === 0 ? '#0A0A0A' : '#0F0F0F',
                  borderBottom: index < data.length - 1 ? '1px solid #2D2D2D' : 'none',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#1F1F1F';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#0A0A0A' : '#0F0F0F';
                }}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    style={{
                      padding: '12px 16px',
                      textAlign: column.align || 'left',
                      fontSize: '13px',
                      color: '#F5F5F5',
                      fontWeight: 400,
                    }}
                  >
                    {column.render 
                      ? column.render((row as any)[column.key], row)
                      : String((row as any)[column.key] || '')
                    }
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
