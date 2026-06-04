import { ACCOUNT_COLORS } from '../../utils/constants'

export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap mt-1">
      {ACCOUNT_COLORS.map(c => (
        <div
          key={c}
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full cursor-pointer transition-all"
          style={{
            background: c,
            border: c === value ? '2px solid var(--color-text)' : '2px solid transparent',
          }}
        />
      ))}
    </div>
  )
}
