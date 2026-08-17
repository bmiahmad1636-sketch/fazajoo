const { query } = require("../db/pool");

const SPACE_FIELDS = `
  s.id,
  s.listing_type,
  s.category,
  s.custom_category,
  s.category_label,
  s.status,
  s.title,
  s.city,
  s.area,
  s.price,
  s.phone,
  s.image_url,
  s.description,
  s.owner_id,
  s.created_at,
  s.updated_at
`;

function mapSpace(row) {
  return {
    id: row.id,
    listingType: row.listing_type,
    category: row.category,
    customCategory: row.custom_category || "",
    categoryLabel: row.category_label || "",
    status: row.status,
    title: row.title,
    city: row.city,
    area: Number(row.area || 0),
    price: row.price,
    phone: row.phone,
    imageUrl: row.image_url || "",
    description: row.description || "",
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(req, res) {
  try {
    const result = await query(
      `
        SELECT
          ${SPACE_FIELDS},
          f.created_at AS favorited_at
        FROM favorites f
        INNER JOIN spaces s
          ON s.id = f.space_id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      ok: true,
      favorites: result.rows.map((row) => ({
        ...mapSpace(row),
        favoritedAt: row.favorited_at,
      })),
    });
  } catch (error) {
    console.error("List favorites error:", error);
    return res.status(500).json({
      ok: false,
      message: "دریافت علاقه‌مندی‌ها انجام نشد.",
    });
  }
}

async function status(req, res) {
  try {
    const result = await query(
      `
        SELECT 1
        FROM favorites
        WHERE user_id = $1
          AND space_id = $2
        LIMIT 1
      `,
      [req.user.id, req.params.spaceId]
    );

    return res.json({
      ok: true,
      isFavorite: result.rowCount > 0,
    });
  } catch (error) {
    console.error("Favorite status error:", error);
    return res.status(500).json({
      ok: false,
      message: "بررسی علاقه‌مندی انجام نشد.",
    });
  }
}

async function add(req, res) {
  try {
    const space = await query(
      `SELECT id FROM spaces WHERE id = $1 LIMIT 1`,
      [req.params.spaceId]
    );

    if (!space.rowCount) {
      return res.status(404).json({
        ok: false,
        message: "آگهی پیدا نشد.",
      });
    }

    await query(
      `
        INSERT INTO favorites (user_id, space_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, space_id)
        DO NOTHING
      `,
      [req.user.id, req.params.spaceId]
    );

    return res.status(201).json({
      ok: true,
      isFavorite: true,
      message: "آگهی به علاقه‌مندی‌ها اضافه شد.",
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    return res.status(500).json({
      ok: false,
      message: "ذخیره علاقه‌مندی انجام نشد.",
    });
  }
}

async function remove(req, res) {
  try {
    await query(
      `
        DELETE FROM favorites
        WHERE user_id = $1
          AND space_id = $2
      `,
      [req.user.id, req.params.spaceId]
    );

    return res.json({
      ok: true,
      isFavorite: false,
      message: "آگهی از علاقه‌مندی‌ها حذف شد.",
    });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return res.status(500).json({
      ok: false,
      message: "حذف علاقه‌مندی انجام نشد.",
    });
  }
}

module.exports = {
  list,
  status,
  add,
  remove,
};
