import "./ResidentialFields.css";

export const HEATING_OPTIONS = [
  ["gasHeater", "بخاری گازی"], ["packageRadiator", "پکیج و رادیاتور"],
  ["centralHeating", "شوفاژ مرکزی"], ["floorHeating", "گرمایش از کف"],
  ["electricHeater", "بخاری برقی"], ["splitHeating", "اسپلیت گرمایشی"],
];
export const COOLING_OPTIONS = [
  ["waterCooler", "کولر آبی"], ["split", "کولر گازی / اسپلیت"],
  ["ductSplit", "داکت‌اسپلیت"], ["centralCooling", "چیلر / سرمایش مرکزی"],
  ["fan", "پنکه"],
];
export const climateLabels = Object.fromEntries([...HEATING_OPTIONS, ...COOLING_OPTIONS]);
export const validHeating = HEATING_OPTIONS.map(([key]) => key);
export const validCooling = COOLING_OPTIONS.map(([key]) => key);

export default function ClimateFields({ value = {}, onChange, disabled = false, compact = false }) {
  const set = (key, checked, kind) => {
    const existing = Array.isArray(value[kind]) ? value[kind] : [];
    onChange({ ...value, [kind]: checked ? [...new Set([...existing, key])] : existing.filter((item) => item !== key) });
  };
  return <div className="climate-fields">
    <strong>تجهیزات سرمایش و گرمایش</strong>
    <small>فقط تجهیزات واقعی را انتخاب کنید؛ می‌توانید چند مورد انتخاب کنید.</small>
    {[["heatingSystems", "سیستم گرمایش", HEATING_OPTIONS], ["coolingSystems", "سیستم سرمایش", COOLING_OPTIONS]].map(([kind, title, options]) =>
      <div key={kind} className="climate-fields__group">
        <b>{title}</b>
        <div className="residential-fields__amenities">
          {options.filter(([key]) => !compact || !["centralHeating", "floorHeating", "centralCooling"].includes(key)).map(([key, label]) =>
            <label key={key}><input type="checkbox" disabled={disabled} checked={Array.isArray(value[kind]) && value[kind].includes(key)} onChange={(event) => set(key, event.target.checked, kind)} /><span>✓</span>{label}</label>
          )}
        </div>
      </div>
    )}
  </div>;
}
