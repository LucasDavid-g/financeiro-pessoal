// Card
export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children }) {
  return <div className="flex items-center justify-between mb-4">{children}</div>
}

export function CardTitle({ children }) {
  return <span className="text-[13px] font-medium text-[var(--color-text2)]">{children}</span>
}

// Metric Card
export function MetricCard({ label, value, sub, accent = 'green', valueColor }) {
  const accents = {
    green: '#1D9E75',
    red:   '#E24B4A',
    amber: '#BA7517',
    blue:  '#378ADD',
  }
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accents[accent] }} />
      <div className="text-[11px] text-[var(--color-text3)] uppercase tracking-[0.4px] mb-2">{label}</div>
      <div
        className="text-xl font-medium font-mono tracking-tight leading-none"
        style={{ color: valueColor || 'var(--color-text)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-[var(--color-text3)] mt-1">{sub}</div>}
    </div>
  )
}

// Button
export function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) {
  const variants = {
    primary: 'bg-[#1D9E75] text-white hover:opacity-90',
    ghost:   'bg-transparent border border-[var(--color-border2)] text-[var(--color-text2)] hover:bg-[var(--color-bg2)]',
    icon:    'bg-transparent text-[var(--color-text3)] hover:bg-[var(--color-bg2)] hover:text-[var(--color-text)] p-1.5 rounded-md',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 font-[DM_Sans] cursor-pointer transition-all disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function BtnSm({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[12px] text-[var(--color-text2)] border border-[var(--color-border2)] rounded-full px-3 py-1.5 bg-transparent hover:bg-[var(--color-bg2)] cursor-pointer font-[DM_Sans] transition-colors"
    >
      {children}
    </button>
  )
}

// Badge
export function Badge({ children, variant = 'green' }) {
  const variants = {
    green: 'bg-[#E1F5EE] text-[#085041]',
    red:   'bg-[#FCEBEB] text-[#791F1F]',
    amber: 'bg-[#FAEEDA] text-[#412402]',
    blue:  'bg-[#E6F1FB] text-[#0C447C]',
  }
  return (
    <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

// Alert
export function Alert({ children, variant = 'ok' }) {
  const variants = {
    ok:     'bg-[#E1F5EE] text-[#085041]',
    warn:   'bg-[#FAEEDA] text-[#412402]',
    danger: 'bg-[#FCEBEB] text-[#791F1F]',
    info:   'bg-[#E6F1FB] text-[#0C447C]',
  }
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium mb-3 ${variants[variant]}`}>
      {children}
    </div>
  )
}

// ProgressBar
export function ProgressBar({ pct, color = '#1D9E75', height = 4 }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: 'var(--color-bg2)' }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  )
}

// EmptyState
export function EmptyState({ children }) {
  return (
    <div className="text-center py-8 text-[13px] text-[var(--color-text3)]">
      {children}
    </div>
  )
}

// ItemRow
export function ItemRow({ icon, iconBg, iconColor, name, sub, value, valueClass = '', actions, extra }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-[var(--color-border)] last:border-0">
      {icon && (
        <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 text-[14px]"
          style={{ background: iconBg, color: iconColor }}>
          <i className={`ti ${icon}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{name}</div>
        {sub && <div className="text-[11px] text-[var(--color-text3)] mt-0.5">{sub}</div>}
        {extra}
      </div>
      {value && <div className={`text-[13px] font-medium font-mono flex-shrink-0 ${valueClass}`}>{value}</div>}
      {actions && <div className="flex gap-0.5 flex-shrink-0">{actions}</div>}
    </div>
  )
}

// Modal
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--color-bg)] rounded-[20px_20px_0_0] p-6 w-full max-w-[480px] max-h-[88vh] overflow-y-auto">
        <div className="w-9 h-1 bg-[var(--color-border2)] rounded-full mx-auto -mt-3 mb-5" />
        {title && <h3 className="text-[15px] font-medium mb-5">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

// FormGroup
export function FormGroup({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11px] text-[var(--color-text3)] mb-1 uppercase tracking-[0.3px]">{label}</label>
      {children}
    </div>
  )
}

// SortBtn
export function SortBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 border rounded-full text-[11px] font-[DM_Sans] cursor-pointer transition-colors
        ${active
          ? 'bg-[var(--color-bg2)] text-[var(--color-text)] font-medium border-[var(--color-border2)]'
          : 'bg-transparent text-[var(--color-text3)] border-[var(--color-border)]'
        }`}
    >
      {children}
    </button>
  )
}
