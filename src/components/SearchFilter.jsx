import { useMemo } from "react";

function SearchFilter({
  parkings,
  searchText,
  setSearchText,
  selectedCity,
  setSelectedCity,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minArea,
  setMinArea,
  maxArea,
  setMaxArea,
}) {
  const cities = useMemo(() => {
    const cityList = parkings
      .map((parking) => parking.city?.trim())
      .filter(Boolean);

    return [...new Set(cityList)];
  }, [parkings]);

  const resetFilters = () => {
    setSearchText("");
    setSelectedCity("");
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
  };

  const hasActiveFilters =
    searchText !== "" ||
    selectedCity !== "" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    minArea !== "" ||
    maxArea !== "";

  return (
    <section style={styles.wrapper}>
      <div style={styles.topLine} />

      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>
            جستجوی دقیق
          </span>

          <h2 style={styles.title}>
            جستجو و فیلتر آگهی‌ها
          </h2>

          <p style={styles.description}>
            با انتخاب شهر، قیمت و متراژ،
            آگهی مناسب‌تر را سریع‌تر پیدا کن.
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            style={styles.clearSmallButton}
          >
            پاک‌کردن همه
          </button>
        )}
      </div>

      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>
            <span style={styles.icon}>⌕</span>
            جستجو
          </span>

          <input
            type="text"
            placeholder="جستجو در عنوان یا توضیحات"
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>
            <span style={styles.icon}>📍</span>
            شهر
          </span>

          <select
            value={selectedCity}
            onChange={(event) =>
              setSelectedCity(event.target.value)
            }
            style={styles.input}
          >
            <option value="">همه شهرها</option>

            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>
            <span style={styles.icon}>↓</span>
            حداقل قیمت
          </span>

          <input
            type="number"
            placeholder="مثلاً ۵۰۰۰۰۰"
            value={minPrice}
            onChange={(event) =>
              setMinPrice(event.target.value)
            }
            min="0"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>
            <span style={styles.icon}>↑</span>
            حداکثر قیمت
          </span>

          <input
            type="number"
            placeholder="مثلاً ۲۰۰۰۰۰۰"
            value={maxPrice}
            onChange={(event) =>
              setMaxPrice(event.target.value)
            }
            min="0"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>
            <span style={styles.icon}>↔</span>
            حداقل متراژ
          </span>

          <input
            type="number"
            placeholder="مثلاً ۱۵"
            value={minArea}
            onChange={(event) =>
              setMinArea(event.target.value)
            }
            min="0"
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>
            <span style={styles.icon}>↔</span>
            حداکثر متراژ
          </span>

          <input
            type="number"
            placeholder="مثلاً ۱۰۰"
            value={maxArea}
            onChange={(event) =>
              setMaxArea(event.target.value)
            }
            min="0"
            style={styles.input}
          />
        </label>
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          style={{
            ...styles.clearButton,
            opacity: hasActiveFilters ? 1 : 0.38,
            cursor: hasActiveFilters
              ? "pointer"
              : "not-allowed",
          }}
        >
          <span>↻</span>
          پاک کردن فیلترها
        </button>
      </div>
    </section>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    maxWidth: "1180px",
    margin: "24px auto 30px",
    padding: "26px 28px",
    direction: "rtl",
    overflow: "hidden",
    border: "1px solid #eedfd3",
    borderRadius: "28px",
    backgroundColor: "rgba(255,255,255,0.97)",
    boxShadow:
      "0 20px 48px rgba(76,48,29,0.10)",
  },

  topLine: {
    position: "absolute",
    top: 0,
    right: "28px",
    left: "28px",
    height: "4px",
    borderRadius: "0 0 999px 999px",
    background:
      "linear-gradient(90deg,#d95f0b,#f47a1f,#ffae67)",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "22px",
  },

  eyebrow: {
    display: "inline-block",
    marginBottom: "5px",
    color: "#e66f15",
    fontSize: "13px",
    fontWeight: "900",
  },

  title: {
    margin: "0 0 6px",
    color: "#2f2925",
    fontSize: "30px",
    fontWeight: "950",
    lineHeight: "1.45",
  },

  description: {
    margin: 0,
    color: "#81736a",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.9",
  },

  clearSmallButton: {
    padding: "9px 14px",
    border: "1px solid rgba(217,95,11,0.17)",
    borderRadius: "12px",
    backgroundColor: "#fff2e7",
    color: "#d95f0b",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "850",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "16px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    color: "#4d443e",
    fontSize: "13px",
    fontWeight: "900",
  },

  icon: {
    width: "26px",
    height: "26px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    backgroundColor: "#fff0e3",
    color: "#e66f15",
    fontSize: "12px",
    fontWeight: "900",
  },

  input: {
    width: "100%",
    minHeight: "52px",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #eadfd7",
    borderRadius: "14px",
    outline: "none",
    backgroundColor: "#fffcfa",
    color: "#332d29",
    fontFamily: "inherit",
    fontSize: "15px",
    fontWeight: "600",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-start",
    marginTop: "18px",
  },

  clearButton: {
    width: "175px",
    minHeight: "48px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    border: "none",
    borderRadius: "15px",
    background:
      "linear-gradient(135deg,#403731,#27221f)",
    color: "#ffffff",
    boxShadow:
      "0 10px 22px rgba(45,36,31,0.18)",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: "900",
  },
};

export default SearchFilter;