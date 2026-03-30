export default function FormSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Choisir",
  valueKey = "id",
  labelKey = "name",
}) {
  return (
    <div>
      {label && <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 p-3 focus:border-slate-500 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item[valueKey]} value={item[valueKey]}>
            {item[labelKey]}
          </option>
        ))}
      </select>
    </div>
  );
}