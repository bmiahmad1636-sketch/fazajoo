const money = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
};

export const emptyVillaDetails = {
  bedrooms: "",
  capacity: "",
  extraGuestPrice: "",
  distanceToSea: "",
  distanceToForest: "",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  houseRules: "",
  pool: false,
  heatedPool: false,
  parking: false,
  yard: false,
  furnished: true,
  barbecue: false,
  airConditioning: false,
  heating: false,
  wifi: false,
  petFriendly: false,
};

export default function VillaFields({
  value = {},
  onChange,
  disabled = false,
}) {
  const form = {
    ...emptyVillaDetails,
    ...value,
  };

  const setField = (key, nextValue) => {
    onChange({
      ...form,
      [key]: nextValue,
    });
  };

  const amenities = [
    ["pool", "استخر"],
    ["heatedPool", "استخر آب‌گرم"],
    ["parking", "پارکینگ"],
    ["yard", "حیاط"],
    ["furnished", "مبله"],
    ["barbecue", "باربیکیو"],
    ["airConditioning", "سرمایش"],
    ["heating", "گرمایش"],
    ["wifi", "اینترنت / وای‌فای"],
    ["petFriendly", "امکان ورود حیوان خانگی"],
  ];

  return (
    <section className="residential-fields villa-fields">
      <div className="residential-fields__head">
        <span>🏡</span>
        <div>
          <strong>مشخصات ویلای تفریحی</strong>
          <small>
            اطلاعاتی که مسافر قبل از رزرو لازم دارد
          </small>
        </div>
      </div>

      <div className="residential-fields__grid">
        <label>
          تعداد اتاق خواب
          <input
            disabled={disabled}
            type="number"
            min="0"
            max="30"
            value={form.bedrooms}
            onChange={(event) =>
              setField("bedrooms", event.target.value)
            }
            placeholder="مثلاً ۳"
          />
        </label>

        <label>
          ظرفیت پایه (نفر)
          <input
            disabled={disabled}
            type="number"
            min="1"
            max="100"
            value={form.capacity}
            onChange={(event) =>
              setField("capacity", event.target.value)
            }
            placeholder="مثلاً ۸"
          />
        </label>

        <label>
          هزینه هر نفر اضافه (ریال)
          <input
            disabled={disabled}
            inputMode="numeric"
            value={money(form.extraGuestPrice)}
            onChange={(event) =>
              setField(
                "extraGuestPrice",
                event.target.value.replace(/\D/g, "")
              )
            }
            placeholder="اختیاری"
          />
        </label>

        <label>
          فاصله تا دریا
          <input
            disabled={disabled}
            type="text"
            value={form.distanceToSea}
            onChange={(event) =>
              setField("distanceToSea", event.target.value)
            }
            placeholder="مثلاً ۵ دقیقه یا ۲ کیلومتر"
          />
        </label>

        <label>
          فاصله تا جنگل
          <input
            disabled={disabled}
            type="text"
            value={form.distanceToForest}
            onChange={(event) =>
              setField("distanceToForest", event.target.value)
            }
            placeholder="مثلاً ۱۰ دقیقه"
          />
        </label>

        <label>
          ساعت تحویل ویلا
          <input
            disabled={disabled}
            type="time"
            value={form.checkInTime}
            onChange={(event) =>
              setField("checkInTime", event.target.value)
            }
          />
        </label>

        <label>
          ساعت تخلیه ویلا
          <input
            disabled={disabled}
            type="time"
            value={form.checkOutTime}
            onChange={(event) =>
              setField("checkOutTime", event.target.value)
            }
          />
        </label>
      </div>

      <div className="residential-fields__amenities">
        {amenities.map(([key, label]) => (
          <label key={key}>
            <input
              disabled={disabled}
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(event) =>
                setField(key, event.target.checked)
              }
            />
            <span>✓</span>
            {label}
          </label>
        ))}
      </div>

      <label style={{ display: "grid", gap: "8px", marginTop: "14px" }}>
        قوانین و توضیحات اقامت
        <textarea
          disabled={disabled}
          rows={4}
          value={form.houseRules}
          onChange={(event) =>
            setField("houseRules", event.target.value)
          }
          placeholder="مثلاً ساعت سکوت، مهمانی، ورود حیوان خانگی، استعمال دخانیات و..."
        />
      </label>
    </section>
  );
}
