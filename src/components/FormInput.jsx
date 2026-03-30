export default function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <div>
      {label && <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 p-3 focus:border-slate-500 focus:outline-none"
      />
    </div>
  );
}