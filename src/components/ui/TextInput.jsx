export default function TextInput({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-300">
      <span className="font-medium text-zinc-200">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-12 rounded-2xl border border-white/8 bg-white/4 px-4 text-sm text-white outline-none transition focus:border-amber-200/35 focus:bg-white/6"
      />
    </label>
  )
}
