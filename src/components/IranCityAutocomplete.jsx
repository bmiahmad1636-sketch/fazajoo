import { useMemo, useState } from "react";
import IRAN_CITIES from "../data/iran-cities-official-1404.json";
import "./IranCityAutocomplete.css";

function normalize(value = "") {
  return String(value)
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200C\u200D\u200E\u200F]/g, " ")
    .replace(/\s+/g, " ");
}

const CITY_NAMES = [...new Set(
  IRAN_CITIES.map((item) => normalize(item?.name || item?.cityName || "")).filter(Boolean)
)].sort((a, b) => a.localeCompare(b, "fa"));

export default function IranCityAutocomplete({ value = "", onChange, onSelect, disabled = false, error = false, appearance = "add" }) {
  const [open, setOpen] = useState(false);
  const query = normalize(value);
  const prefix = appearance === "edit" ? "edit-parking" : "add-parking";

  const matches = useMemo(() => {
    if (!query) return CITY_NAMES.slice(0, 80);
    const starts = [];
    const contains = [];
    for (const name of CITY_NAMES) {
      const n = normalize(name);
      if (n.startsWith(query)) starts.push(name);
      else if (n.includes(query)) contains.push(name);
      if (starts.length + contains.length >= 80) break;
    }
    return [...starts, ...contains].slice(0, 80);
  }, [query]);

  const setValue = (nextValue) => {
    onChange?.({ target: { name: "city", value: nextValue } });
  };

  return (
    <div className="iran-city-autocomplete" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <div className={[`${prefix}-input`, error ? `${prefix}-input--error` : ""].filter(Boolean).join(" ")}>
        <span className={`${prefix}-input__icon`}>⌖</span>
        <input
          id="city"
          name="city"
          type="text"
          autoComplete="off"
          placeholder="نام شهر را بنویس یا انتخاب کن"
          value={value}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && CITY_NAMES.includes(query)) {
              event.preventDefault();
              setOpen(false);
              onSelect?.(query);
            }
          }}
        />
      </div>

      {open && !disabled && (
        <div className="iran-city-autocomplete__menu" role="listbox">
          {matches.length ? (
            matches.map((name) => (
              <button
                type="button"
                key={name}
                className="iran-city-autocomplete__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValue(name);
                  setOpen(false);
                  onSelect?.(name);
                }}
              >
                {name}
              </button>
            ))
          ) : (
            <div className="iran-city-autocomplete__empty">شهری با این نام پیدا نشد.</div>
          )}
        </div>
      )}
    </div>
  );
}
