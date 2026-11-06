import { readResidentialRequest, residentialRequestAreaText, residentialRequestBudgetText, residentialRequestLabel, RESIDENTIAL_REQUEST_TYPES, RESIDENTIAL_REQUEST_FEATURES, RESIDENTIAL_FLOOR_PREFERENCES } from "../utils/residentialRequest";
import { residentialFinancialRows } from "../utils/residentialOffer";
import {readLandRental,landLabel,LAND_PURPOSES,LAND_LEGAL,LAND_LOCATION,LAND_DURATION,LAND_CROPS,LAND_WATER,LAND_IRRIGATION,LAND_FEATURES,LAND_PAYMENT} from "../utils/landRental";
import { readShopRequest, shopOptionLabel, SHOP_TYPES, SHOP_ACTIVITIES, SHOP_FLOORS, SHOP_LOCATIONS, SHOP_FEATURES, SHOP_TRANSFER } from "../utils/shopRequest";
import {SHOP_OFFER_TYPES,SHOP_OFFER_ACTIVITIES,SHOP_OFFER_TRANSFERS,SHOP_OFFER_FLOORS,SHOP_OFFER_LOCATIONS,SHOP_OFFER_FEATURES,SHOP_RIGHTS,shopOfferLabel,shopFinancialHeadline,shopFinancialRows} from "../utils/shopOffer";
import { readShedRequest, shedOptionLabel, SHED_TYPES, SHED_ACTIVITIES, shedActivitiesFor, SHED_ALL_FEATURES, SHED_POWER, SHED_ACCESS, SHED_DURATIONS } from "../utils/shedRequest";
import { readParkingRequestUsage, parkingUsageLabel } from "../utils/parkingRequestUsage";
import { readParkingRequestDetails, PARKING_COVERS, PARKING_ACCESS } from "../utils/parkingRequestDetails";
import { PARKING_OFFER_USAGE, PARKING_OFFER_COVER, PARKING_OFFER_ACCESS, PARKING_OFFER_STYLE, PARKING_OFFER_SECURITY, parkingOfferLabel } from "../utils/parkingOffer";
import { STORAGE_TYPES, STORAGE_PURPOSES, STORAGE_ACCESS, STORAGE_VEHICLES, STORAGE_LOADING, STORAGE_FEATURES, storageOfferLabel } from "../utils/storageOffer";
import { INDUSTRIAL_TYPES, INDUSTRIAL_POWER, INDUSTRIAL_VEHICLES, INDUSTRIAL_FLOORS, INDUSTRIAL_HOURS, INDUSTRIAL_FEATURE_OPTIONS, industrialLabel } from "../utils/industrialOffer";
import {LAND_OFFER_TYPES,LAND_OFFER_PURPOSES,LAND_OFFER_ROADS,LAND_OFFER_LEGAL,LAND_OFFER_LOCATION,LAND_OFFER_SLOPES,LAND_OFFER_VEHICLES,LAND_OFFER_WATER,LAND_OFFER_FEATURES,LAND_OFFER_CROPS,LAND_OFFER_IRRIGATION,landOfferLabel} from "../utils/landOffer";
import { readWarehouseRequest, warehouseOptionLabel, WAREHOUSE_PURPOSES, WAREHOUSE_TYPES, WAREHOUSE_ACCESS, WAREHOUSE_DURATIONS, WAREHOUSE_FEATURES } from "../utils/warehouseRequest";
import { climateLabels } from "../components/ClimateFields";
import { readVillaRequest, villaRequestAreaText, villaRequestBudgetText, villaRequestLabel, VILLA_REQUEST_TYPES, VILLA_REQUEST_STAYS, VILLA_REQUEST_AMENITIES } from "../utils/villaRequest";
import { readGardenRequest, gardenRequestAreaText, gardenRequestBudgetText, gardenRequestLabel, GARDEN_REQUEST_PURPOSES, GARDEN_REQUEST_DURATIONS, GARDEN_REQUEST_FEATURES, GARDEN_REQUEST_WATER } from "../utils/gardenRequest";
import {gardenOfferLabel,gardenFinancialRows,GARDEN_OFFER_TYPES,GARDEN_OFFER_PURPOSES,GARDEN_OFFER_ROADS,GARDEN_OFFER_DURATIONS,GARDEN_OFFER_PRIVACY,GARDEN_OFFER_FEATURES} from "../utils/gardenOffer";
import {villaFinancialRows,villaOfferLabel,VILLA_OFFER_TYPES,VILLA_OFFER_STAYS,VILLA_OFFER_PRIVACY,VILLA_OFFER_EXTRAS,VILLA_LONG_MODES} from "../utils/villaOffer";
import VillaRentalBadges from "../components/VillaRentalBadges";
import ResidentialRentalBadges from "../components/ResidentialRentalBadges";
import { readOtherRequest, otherRequestAreaText, otherRequestBudgetText, otherRequestLabel, OTHER_REQUEST_DURATIONS, OTHER_REQUEST_FEATURES } from "../utils/otherRequest";
import { showInSiteAlert, showInSiteConfirm } from "../utils/inSiteDialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getCurrentSessionUser, subscribeToAuth } from "../services/authService";
import { deleteSpace, getSpaceContact } from "../services/spaceService";
import { addFavorite, getFavoriteStatus, removeFavorite } from "../services/favoriteService";
import { formatRialPrice } from "../utils/priceFormatter";

import TrustSafetyActions from "../components/TrustSafetyActions";
import NeshanApproximateMap from "../components/NeshanApproximateMap";
import "./ParkingDetails.css";


const CATEGORY_INFO = {
  parking: {
    label: "پارکینگ",
    icon: "🚘",
  },
  residential: {
    label: "مسکونی",
    icon: "🏠",
  },
  villa: {
    label: "ویلا",
    icon: "🏡",
  },
  storage: {
    label: "انبار",
    icon: "📦",
  },
  warehouse: {
    label: "سوله",
    icon: "🏭",
  },
  shop: {
    label: "مغازه",
    icon: "🏪",
  },
  garden: { label: "باغ", icon: "🌳" },
  land: {
    label: "زمین",
    icon: "🌱",
  },
  other: {
    label: "سایر فضاها",
    icon: "✨",
  },
};

function ShopMoneyRows({ items, compact = false }) {
  return <div className={`parking-details-shop-money${compact ? " parking-details-shop-money--compact" : ""}`} aria-label="شرایط مالی آگهی">
    {items.map(({ label, amount }) => <div className="parking-details-shop-money__row" key={label}>
      <span className="parking-details-shop-money__label">{label}</span>
      <bdi className="parking-details-shop-money__amount">{amount}</bdi>
    </div>)}
  </div>;
}

function ParkingDetails({
  parkings = [],
  deleteParking,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Start each advertisement details view at the top, including after editing.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  const [showPhone, setShowPhone] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(true);
  const [favoriteChanging, setFavoriteChanging] = useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [activeImageIndex, setActiveImageIndex] =
    useState(0);

  const [isGalleryOpen, setIsGalleryOpen] =
    useState(false);

  useEffect(() => {
    setUser(getCurrentSessionUser());
    setAuthLoading(false);
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const parking = useMemo(() => {
    return parkings.find(
      (item) =>
        String(item.id) === String(id)
    );
  }, [parkings, id]);

  // Read the same server-side favorite state used on the homepage cards.
  // Re-read when another card/page changes it, or authentication changes.
  useEffect(() => {
    let active = true;
    const refresh = async (sessionUser = getCurrentSessionUser()) => {
      if (!sessionUser || !id) {
        if (active) {
          setIsFavorite(false);
          setFavoriteLoading(false);
        }
        return;
      }
      if (active) setFavoriteLoading(true);
      try {
        const next = await getFavoriteStatus(id);
        if (active) setIsFavorite(next);
      } catch (error) {
        console.error("خطا در بررسی علاقه‌مندی:", error);
        if (active && error?.status === 401) setIsFavorite(false);
      } finally {
        if (active) setFavoriteLoading(false);
      }
    };
    refresh();
    const unsubscribeAuth = subscribeToAuth((sessionUser) => refresh(sessionUser));
    const handleFavoritesChanged = () => refresh();
    window.addEventListener("fazajoo:favorites-changed", handleFavoritesChanged);
    return () => {
      active = false;
      unsubscribeAuth();
      window.removeEventListener("fazajoo:favorites-changed", handleFavoritesChanged);
    };
  }, [id]);

  const handleFavorite = async () => {
    if (favoriteLoading || favoriteChanging || !id) return;
    if (!getCurrentSessionUser()) {
      showInSiteAlert("برای ذخیره آگهی ابتدا وارد حساب شوید.");
      navigate("/login");
      return;
    }
    setFavoriteChanging(true);
    try {
      if (isFavorite) {
        await removeFavorite(id);
        setIsFavorite(false);
      } else {
        await addFavorite(id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("خطا در تغییر علاقه‌مندی:", error);
      if (error?.status === 401) {
        showInSiteAlert("نشست شما منقضی شده است. دوباره وارد شوید.");
        navigate("/login");
      } else {
        showInSiteAlert(error?.message || "تغییر علاقه‌مندی انجام نشد. دوباره تلاش کنید.");
      }
    } finally {
      setFavoriteChanging(false);
    }
  };

  const galleryImages = useMemo(() => {
    const images = Array.isArray(parking?.imageUrls)
      ? parking.imageUrls.filter(Boolean)
      : [];

    const mainImage = parking?.imageUrl || "";
    if (mainImage) {
      return [mainImage, ...images.filter((url) => url !== mainImage)];
    }

    return images;
  }, [parking]);

  useEffect(() => {
    setActiveImageIndex(0);
    setShowPhone(false);
    setContactPhone("");
    setIsGalleryOpen(false);
  }, [parking?.id]);

  const activeImage =
    galleryImages[activeImageIndex] || galleryImages[0] || "";

  const showPreviousImage = useCallback(() => {
    if (galleryImages.length < 2) return;
    setActiveImageIndex((current) =>
      (current - 1 + galleryImages.length) % galleryImages.length
    );
  }, [galleryImages.length]);

  const showNextImage = useCallback(() => {
    if (galleryImages.length < 2) return;
    setActiveImageIndex((current) =>
      (current + 1) % galleryImages.length
    );
  }, [galleryImages.length]);

  useEffect(() => {
    if (!isGalleryOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsGalleryOpen(false);
      if (event.key === "ArrowRight") showPreviousImage();
      if (event.key === "ArrowLeft") showNextImage();
    };

    document.body.classList.add("parking-gallery-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("parking-gallery-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGalleryOpen, showPreviousImage, showNextImage]);

  const isOwner =
    Boolean(user) &&
    Boolean(parking?.ownerId) &&
    user.uid === parking.ownerId;

  const listingType =
    parking?.listingType || "offer";

  const isWanted =
    listingType === "wanted";

  const category =
    parking?.category || "parking";

  const shopPriceRows = !isWanted && category === "shop"
    ? shopFinancialRows(parking?.spaceAttributes)
    : [];
  const gardenPriceRows = !isWanted && category === "garden"
    ? gardenFinancialRows(parking?.spaceAttributes,parking?.price,parking?.priceType)
    : [];
  const villaPriceRows = !isWanted && category === "villa" ? villaFinancialRows(parking?.spaceAttributes,parking?.price,parking?.priceType) : [];
  const residentialPriceRows = !isWanted && category === "residential"
    ? residentialFinancialRows(parking?.residentialDetails,parking?.spaceAttributes) : [];

  // Wanted-land requirements are stored in description metadata.
  const wantedResidential = isWanted && category === "residential" ? readResidentialRequest(parking?.description || "") : null;
  const residentialWantedData = wantedResidential?.hasMetadata ? wantedResidential.data : null;
  const residentialAreaText = residentialWantedData ? residentialRequestAreaText(residentialWantedData) : "";
  const residentialBudgetText = residentialWantedData ? residentialRequestBudgetText(residentialWantedData) : "";
  const wantedVilla = isWanted && category === "villa" ? readVillaRequest(parking?.description || "") : null;
  const villaWantedData = wantedVilla?.hasMetadata ? wantedVilla.data : null;
  const villaAreaText = villaWantedData ? villaRequestAreaText(villaWantedData) : "";
  const villaBudgetText = villaWantedData ? villaRequestBudgetText(villaWantedData) : "";
  const wantedGarden = isWanted && category === "garden" ? readGardenRequest(parking?.description || "") : null;
  const gardenWantedData = wantedGarden?.hasMetadata ? wantedGarden.data : null;
  const gardenAreaText = gardenWantedData ? gardenRequestAreaText(gardenWantedData) : "";
  const gardenBudgetText = gardenWantedData ? gardenRequestBudgetText(gardenWantedData) : "";
  const wantedOther = isWanted && category === "other" ? readOtherRequest(parking?.description || "", parking?.area, parking?.price, parking?.priceType) : null;
  const otherWantedData = wantedOther?.hasMetadata ? wantedOther.data : null;
  const otherAreaText = otherWantedData ? (otherRequestAreaText(otherWantedData) || "توافقی / نامشخص") : "";
  const otherBudgetText = otherWantedData ? otherRequestBudgetText(otherWantedData) : "";
  const wantedLand = isWanted && category === "land"
    ? readLandRental(parking?.description || "")
    : null;
  const landFields = wantedLand?.hasMetadata ? wantedLand.data : null;
  const landUnit = landFields?.areaUnit === "hectare" ? "هکتار" : "مترمربع";
  const landMin = Number(String(landFields?.minArea || "").replace(/[,٬\s]/g, "")) || 0;
  const landMax = Number(String(landFields?.maxArea || "").replace(/[,٬\s]/g, "")) || 0;
  const landAreaText = landMin && landMax
    ? `${landMin.toLocaleString("fa-IR")} تا ${landMax.toLocaleString("fa-IR")} ${landUnit}`
    : landMin ? `از ${landMin.toLocaleString("fa-IR")} ${landUnit}`
    : landMax ? `تا ${landMax.toLocaleString("fa-IR")} ${landUnit}` : "";
  const landPeriodLabels = { daily: "روزانه", monthly: "ماهانه", seasonal: "فصلی", yearly: "سالانه" };
  const landBudget = landFields ? [
    ...(["deposit", "both"].includes(landFields.paymentType) && Number(landFields.deposit) > 0
      ? [`پول پیش تا ${Number(landFields.deposit).toLocaleString("fa-IR")} ریال`] : []),
    ...(["rent", "both"].includes(landFields.paymentType) && Number(landFields.rent) > 0
      ? [`اجاره تا ${Number(landFields.rent).toLocaleString("fa-IR")} ریال / ${landPeriodLabels[landFields.rentPeriod] || "دوره توافقی"}`] : []),
    ...(landFields.paymentType === "crop_share" ? ["مشارکت در محصول"] : []),
  ].join(" • ") : "";

  const categoryInfo =
    CATEGORY_INFO[category] ||
    CATEGORY_INFO.other;

  const visibleCategory =
    category === "other"
      ? String(
          parking?.customCategory ||
            parking?.categoryLabel ||
            "سایر فضاها"
        ).trim()
      : String(
          parking?.categoryLabel ||
            categoryInfo.label
        ).trim();

  const categoryIcon =
    categoryInfo.icon;

  const listingTypeLabel =
    isWanted
      ? "دنبال فضا"
      : "فضا برای اجاره";

  const status = parking?.status || "active";

  const isRented = status === "rented";
  const isInactive = status === "inactive";

  const statusLabel = isWanted
    ? isRented
      ? "فضا پیدا شد"
      : isInactive
        ? "غیرفعال"
        : "درخواست فعال"
    : isRented
      ? "اجاره داده شد"
      : isInactive
        ? "غیرفعال"
        : "در دسترس";

  const statusDescription = isWanted
    ? isRented
      ? "نیاز متقاضی برطرف شده است"
      : isInactive
        ? "این درخواست موقتاً غیرفعال است"
        : "متقاضی هنوز در جستجوی فضاست"
    : isRented
      ? "این فضا اجاره داده شده است"
      : isInactive
        ? "این آگهی موقتاً غیرفعال است"
        : "آماده استفاده";

  const ownerDisplayName = parking?.ownerIsApprovedAgent
    ? "مشاور املاک تأییدشده"
    : isWanted
      ? "متقاضی فضاجو"
      : "آگهی‌دهنده فضاجو";

  const residential = parking?.residentialDetails || {};
  const villa = parking?.villaDetails || {};
  const garden = parking?.gardenDetails || {};
  const shop = parking?.shopDetails || {};
  const hasShopAmenities = Boolean(shop.waterSupply || shop.electricitySupply || shop.threePhase || shop.cityGas || shop.landline || shop.restroom || (shop.heatingSystems||[]).length || (shop.coolingSystems||[]).length);
  const residentialTypeLabels = {
    apartment: "آپارتمان", house: "خانه", villa: "خانه ویلایی",
    suite: "سوئیت", penthouse: "پنت‌هاوس", room: "اتاق", other: "سایر مسکونی",
  };

  const handlePhoneToggle = async () => {
    if (showPhone) {
      setShowPhone(false);
      return;
    }

    if (!user) {
      showInSiteAlert("برای مشاهده شماره تماس ابتدا وارد حساب شوید.");
      navigate("/login");
      return;
    }

    if (contactPhone) {
      setShowPhone(true);
      return;
    }

    try {
      setContactLoading(true);
      const phone = await getSpaceContact(parking.id);
      setContactPhone(phone);
      setShowPhone(true);
    } catch (error) {
      showInSiteAlert(error?.message || "دریافت شماره تماس انجام نشد.");
    } finally {
      setContactLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      showInSiteAlert("برای حذف آگهی ابتدا وارد حساب شوید.");

      navigate("/login");
      return;
    }

    if (!isOwner) {
      showInSiteAlert("شما اجازه حذف این آگهی را ندارید.");

      return;
    }

    const confirmDelete = await showInSiteConfirm(
      "آیا از حذف این آگهی مطمئن هستید؟",
      "حذف آگهی"
    );

    if (!confirmDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteSpace(id);

      if (
        typeof deleteParking ===
        "function"
      ) {
        deleteParking(id);
      }

      showInSiteAlert("آگهی با موفقیت حذف شد.", "حذف آگهی");

      navigate("/parking");
    } catch (error) {
      console.error(error);

      showInSiteAlert("خطا در حذف آگهی.", "حذف آگهی");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!user) {
      showInSiteAlert("برای ویرایش آگهی ابتدا وارد حساب شوید.");

      navigate("/login");
      return;
    }

    if (!isOwner) {
      showInSiteAlert("شما اجازه ویرایش این آگهی را ندارید.");

      return;
    }

    navigate(
      `/edit-parking/${id}`
    );
  };

  const handleShare = async () => {
    const shareData = {
      title:
        parking?.title ||
        `آگهی ${visibleCategory}`,
      text: isWanted
        ? `این درخواست ${visibleCategory} را در فضاجو ببین.`
        : `این آگهی ${visibleCategory} را در فضاجو ببین.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(
          shareData
        );

        return;
      }

      await navigator.clipboard.writeText(
        window.location.href
      );

      showInSiteAlert("لینک آگهی کپی شد.", "اشتراک‌گذاری");
    } catch (error) {
      if (
        error?.name !==
        "AbortError"
      ) {
        console.error(error);

        showInSiteAlert("امکان اشتراک‌گذاری لینک وجود ندارد.", "اشتراک‌گذاری");
      }
    }
  };

  if (!parking) {
    return (
      <main className="parking-details-not-found">
        <div className="parking-details-not-found__card">
          <div className="parking-details-not-found__icon">
            🔍
          </div>

          <span>
            نتیجه‌ای پیدا نشد
          </span>

          <h1>
            این آگهی در دسترس نیست
          </h1>

          <p>
            ممکن است آگهی حذف شده
            باشد یا نشانی آن درست
            نباشد.
          </p>

          <Link
            to="/parking"
            className="parking-details-not-found__button"
          >
            بازگشت به آگهی‌ها
            <span>←</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="parking-details-page">
      <section className="parking-details-hero">
        <div className="parking-details-hero__glow parking-details-hero__glow--one" />
        <div className="parking-details-hero__glow parking-details-hero__glow--two" />

        <div className="container">
          <div className="parking-details-toolbar">
            <Link
              to="/parking"
              className="parking-details-toolbar__back"
            >
              <span>→</span>
              بازگشت به آگهی‌ها
            </Link>

            <div className="parking-details-toolbar__actions">
              <button
                type="button"
                onClick={handleShare}
              >
                <span>↗</span>
                اشتراک‌گذاری
              </button>

              <button
                type="button"
                onClick={handleFavorite}
                disabled={favoriteLoading || favoriteChanging}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                className={isFavorite ? "parking-details-favorite--active" : ""}
              >
                <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
                {favoriteChanging ? "در حال ثبت..." : isFavorite ? "ذخیره‌شده" : "ذخیره آگهی"}
              </button>
            </div>
          </div>

          <div className="parking-details-hero__content">
            <div>
              <div className="parking-details-hero__badges">
                <span
                  className={`parking-details-badge ${
                    isRented
                      ? "parking-details-badge--rented"
                      : isInactive
                        ? "parking-details-badge--inactive"
                        : "parking-details-badge--available"
                  }`}
                >
                  <span />
                  {statusLabel}
                </span>

                <span className="parking-details-badge parking-details-badge--type">
                  {categoryIcon} {visibleCategory}
                </span>

                <span className="parking-details-badge parking-details-badge--type">
                  {isWanted ? "🔎" : "🏠"} {listingTypeLabel}
                </span>
              </div>

              <h1>
                {parking.title ||
                  (isWanted
                    ? `دنبال ${visibleCategory}`
                    : `${visibleCategory} برای اجاره`)}
              </h1>

              <p>
                <span>📍</span>

                {parking.city ||
                  "شهر ثبت نشده"}
              </p>
              {!isWanted && category === "villa" && <VillaRentalBadges attributes={parking?.spaceAttributes} />}
              {!isWanted && category === "residential" && <ResidentialRentalBadges attributes={parking?.spaceAttributes} />}
              {isWanted && category === "residential" && wantedResidential?.termDeclared &&
                <span className="fj-vr-badge" aria-label="مدت درخواست مسکونی">درخواست {residentialWantedData.rentalTerm === "short" ? "کوتاه‌مدت" : "بلندمدت"}</span>}
            </div>

            <div className={`parking-details-hero__price${(shopPriceRows.length || gardenPriceRows.length || residentialPriceRows.length || villaPriceRows.length) ? " parking-details-hero__price--shop" : ""}`}>
              <span>
                {isWanted ? "بودجه" : "قیمت آگهی"}
              </span>

              {shopPriceRows.length ? (
                <ShopMoneyRows items={shopPriceRows} />
              ) : gardenPriceRows.length ? (
                <ShopMoneyRows items={gardenPriceRows} />
              ) : residentialPriceRows.length ? (
                <ShopMoneyRows items={residentialPriceRows} />
              ) : villaPriceRows.length ? (
                <ShopMoneyRows items={villaPriceRows} />
              ) : (
                <strong>
                  {(!isWanted && category === "shop" ? shopFinancialHeadline(parking?.spaceAttributes) : "") || otherBudgetText || gardenBudgetText || villaBudgetText || landBudget || residentialBudgetText || formatRialPrice(parking.price, {
                    priceType: parking.priceType || "monthly",
                    fallback: "توافقی",
                  })}
                </strong>
              )}

              <small>
                {isWanted
                  ? "بودجه ثبت‌شده توسط متقاضی"
                  : "مبلغ ثبت‌شده توسط آگهی‌دهنده"}
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="parking-details-content">
        <div className="container">
          <div className="parking-details-layout">
            <div className="parking-details-main">
              {!isWanted && (
                <>
              <article
                className={[
                  "parking-details-gallery",
                  !activeImage
                    ? "parking-details-gallery--empty"
                    : "",
                  isWanted
                    ? "parking-details-gallery--wanted"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {activeImage ? (
                  <>
                    <button
                      type="button"
                      className="parking-details-gallery__image-button"
                      onClick={() => setIsGalleryOpen(true)}
                      aria-label="نمایش تصویر در اندازه بزرگ"
                    >
                      <img
                        src={activeImage}
                        alt={parking.title || `تصویر ${visibleCategory}`}
                      />
                    </button>

                    {galleryImages.length > 1 && (
                      <>
                        <button type="button" className="parking-details-gallery__nav parking-details-gallery__nav--prev" onClick={(event) => { event.stopPropagation(); showPreviousImage(); }} aria-label="عکس قبلی">‹</button>
                        <button type="button" className="parking-details-gallery__nav parking-details-gallery__nav--next" onClick={(event) => { event.stopPropagation(); showNextImage(); }} aria-label="عکس بعدی">›</button>
                        <div className="parking-details-gallery__counter">
                          {(activeImageIndex + 1).toLocaleString("fa-IR")} / {galleryImages.length.toLocaleString("fa-IR")}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="parking-details-gallery__placeholder">
                    <span>{isWanted ? "🔎" : categoryIcon}</span>
                    <strong>
                      {isWanted
                        ? `درخواست ${visibleCategory}`
                        : `تصویر ${visibleCategory}`}
                    </strong>
                    {!isWanted && (
                      <p>تصویری برای این آگهی ثبت نشده است.</p>
                    )}
                  </div>
                )}

                <div className="parking-details-gallery__overlay">
                  <span>
                    {galleryImages.length > 1
                      ? `${galleryImages.length.toLocaleString("fa-IR")} عکس آگهی`
                      : "تصویر آگهی"}
                  </span>
                </div>
              </article>

              {isGalleryOpen && activeImage && (
                <div className="parking-details-lightbox" role="dialog" aria-modal="true" aria-label="نمایش بزرگ تصاویر" onClick={() => setIsGalleryOpen(false)}>
                  <button type="button" className="parking-details-lightbox__close" onClick={() => setIsGalleryOpen(false)} aria-label="بستن">×</button>
                  {galleryImages.length > 1 && (
                    <button type="button" className="parking-details-lightbox__nav parking-details-lightbox__nav--prev" onClick={(event) => { event.stopPropagation(); showPreviousImage(); }} aria-label="عکس قبلی">‹</button>
                  )}
                  <img src={activeImage} alt={parking.title || `تصویر ${visibleCategory}`} onClick={(event) => event.stopPropagation()} />
                  {galleryImages.length > 1 && (
                    <button type="button" className="parking-details-lightbox__nav parking-details-lightbox__nav--next" onClick={(event) => { event.stopPropagation(); showNextImage(); }} aria-label="عکس بعدی">›</button>
                  )}
                  <div className="parking-details-lightbox__counter">{(activeImageIndex + 1).toLocaleString("fa-IR")} از {galleryImages.length.toLocaleString("fa-IR")}</div>
                </div>
              )}

              {galleryImages.length > 1 && (
                <div className="parking-details-thumbnails" aria-label="گالری تصاویر آگهی">
                  {galleryImages.map((url, index) => (
                    <button
                      type="button"
                      key={`${url}-${index}`}
                      className={
                        index === activeImageIndex
                          ? "parking-details-thumbnail parking-details-thumbnail--active"
                          : "parking-details-thumbnail"
                      }
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`نمایش عکس ${(index + 1).toLocaleString("fa-IR")}`}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}

                </>
              )}

              {!isWanted && parking.video?.url && (
                <article className="parking-details-section parking-details-video-section">
                  <div className="parking-details-section__heading">
                    <div className="parking-details-section__icon">▶</div>
                    <div>
                      <span>ویدئوی آگهی</span>
                      <h2>بازدید کوتاه از فضا</h2>
                    </div>
                  </div>
                  <div className="parking-details-video">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      poster={parking.video.posterUrl || undefined}
                      src={parking.video.url}
                    />
                    <p>ویدئو به‌صورت خودکار پخش نمی‌شود تا مصرف اینترنت و هزینه سرویس کنترل شود.</p>
                  </div>
                </article>
              )}

              <article className="parking-details-section">
                <div className="parking-details-section__heading">
                  <div className="parking-details-section__icon">
                    ✨
                  </div>

                  <div>
                    <span>
                      مشخصات اصلی
                    </span>

                    <h2>
                      {isWanted
                        ? `نیازمندی ${visibleCategory}`
                        : `اطلاعات ${visibleCategory}`}
                    </h2>
                  </div>
                </div>

                <div className="parking-details-features">
                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--purple">
                      📍
                    </span>

                    <div>
                      <span>
                        شهر
                      </span>

                      <strong>
                        {parking.city ||
                          "ثبت نشده"}
                      </strong>
                    </div>
                  </div>

                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--cyan">
                      ↔
                    </span>

                    <div>
                      <span>
                        {isWanted ? "متراژ مدنظر" : "متراژ"}
                      </span>

                      <strong>
                        {otherAreaText || gardenAreaText || villaAreaText || residentialAreaText || landAreaText || (parking.area
                          ? `${parking.area} متر`
                          : "ثبت نشده")}
                      </strong>
                    </div>
                  </div>

                  <div className="parking-details-feature">
                    <span className="parking-details-feature__icon parking-details-feature__icon--green">
                      🛡
                    </span>

                    <div>
                      <span>
                        وضعیت
                      </span>

                      <strong>
                        {statusDescription}
                      </strong>
                    </div>
                  </div>

                  <div className={`parking-details-feature${(shopPriceRows.length || gardenPriceRows.length || residentialPriceRows.length || villaPriceRows.length) ? " parking-details-feature--shop-money" : ""}`}>
                    <span className="parking-details-feature__icon parking-details-feature__icon--orange">
                      💰
                    </span>

                    <div>
                      <span>
                        {isWanted ? "بودجه" : "قیمت"}
                      </span>

                      {shopPriceRows.length ? (
                        <ShopMoneyRows items={shopPriceRows} compact />
                      ) : gardenPriceRows.length ? (
                        <ShopMoneyRows items={gardenPriceRows} compact />
                      ) : residentialPriceRows.length ? (
                        <ShopMoneyRows items={residentialPriceRows} compact />
                      ) : villaPriceRows.length ? (
                        <ShopMoneyRows items={villaPriceRows} compact />
                      ) : (
                        <strong>
                          {otherBudgetText || gardenBudgetText || villaBudgetText || landBudget || residentialBudgetText || formatRialPrice(parking.price, {
                            priceType: parking.priceType || "monthly",
                            fallback: "توافقی",
                          })}
                        </strong>
                      )}
                    </div>
                  </div>
                </div>
              </article>

              {isWanted && category === "warehouse" && readShedRequest(parking.description).data.spaceType && (() => {
                const data = readShedRequest(parking.description).data;
                const details = [
                  ["نوع فضا", shedOptionLabel(SHED_TYPES, data.spaceType)],
                  ["فعالیت", data.activity === "other" ? data.otherActivity : shedOptionLabel([...shedActivitiesFor(data.spaceType), ...SHED_ACTIVITIES], data.activity)],
                  ["متراژ موردنیاز", [data.minArea && `از ${data.minArea}`, data.maxArea && `تا ${data.maxArea}`].filter(Boolean).join(" ") ? `${[data.minArea && `از ${data.minArea}`, data.maxArea && `تا ${data.maxArea}`].filter(Boolean).join(" ")} مترمربع` : "تعیین نشده"],
                  ["حداقل ارتفاع مفید", data.minHeight ? `${data.minHeight} متر` : "تعیین نشده"],
                  ["برق", shedOptionLabel(SHED_POWER, data.power)],
                  ...(data.power === "three" && data.powerCapacity ? [["توان برق", `${data.powerCapacity} کیلووات`]] : []),
                  ["دسترسی", shedOptionLabel(SHED_ACCESS, data.access)],
                  ["مدت اجاره", shedOptionLabel(SHED_DURATIONS, data.duration)],
                  ["امکانات ضروری", (data.features || []).map(id => shedOptionLabel(SHED_ALL_FEATURES, id)).join("، ") || "مورد خاصی ثبت نشده"],
                  ["شرایط خاص", data.requirements || "ثبت نشده"],
                ];
                return <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🏭</div><div><span>درخواست اجاره سوله یا کارگاه</span><h2>مشخصات فضای موردنیاز</h2></div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: "12px 0" }}>
                    {details.map(([label, value]) => <div key={label} style={{ padding: 12, border: "1px solid #eee1d6", borderRadius: 12 }}><small style={{ display: "block", color: "#786b60" }}>{label}</small><strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong></div>)}
                  </div>
                </article>;
              })()}

              {isWanted && category === "storage" && readWarehouseRequest(parking.description).data.purpose && (() => {
                const data = readWarehouseRequest(parking.description).data;
                const details = [
                  ["کاربری", data.purpose === "other" ? data.otherPurpose : warehouseOptionLabel(WAREHOUSE_PURPOSES, data.purpose)],
                  ["نوع فضا", warehouseOptionLabel(WAREHOUSE_TYPES, data.spaceType)],
                  ["متراژ موردنیاز", [data.minArea && `از ${data.minArea}`, data.maxArea && `تا ${data.maxArea}`].filter(Boolean).join(" ") ? `${[data.minArea && `از ${data.minArea}`, data.maxArea && `تا ${data.maxArea}`].filter(Boolean).join(" ")} مترمربع` : "تعیین نشده"],
                  ["دسترسی", warehouseOptionLabel(WAREHOUSE_ACCESS, data.access)],
                  ["مدت اجاره", warehouseOptionLabel(WAREHOUSE_DURATIONS, data.duration)],
                  ["امکانات", (data.features || []).map(id => warehouseOptionLabel(WAREHOUSE_FEATURES, id)).join("، ") || "مورد خاصی ثبت نشده"],
                  ["شرایط خاص", data.requirements || "ثبت نشده"],
                ];
                return <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">📦</div><div><span>درخواست اجاره انبار</span><h2>مشخصات انبار موردنیاز</h2></div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: "12px 0" }}>
                    {details.map(([label, value]) => <div key={label} style={{ padding: 12, border: "1px solid #eee1d6", borderRadius: 12 }}><small style={{ display: "block", color: "#786b60" }}>{label}</small><strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong></div>)}
                  </div>
                </article>;
              })()}

              {isWanted && category === "parking" && (() => {
                const data = readParkingRequestDetails(parking.description).data;
                const label = (options, id) => options.find(([key]) => key === id)?.[1] || "فرقی ندارد";
                const rows = [
                  ["متراژ موردنیاز", [data.minArea && `از ${data.minArea}`, data.maxArea && `تا ${data.maxArea}`].filter(Boolean).join(" ") ? `${[data.minArea && `از ${data.minArea}`, data.maxArea && `تا ${data.maxArea}`].filter(Boolean).join(" ")} مترمربع` : parking.area ? `${parking.area} مترمربع` : "تعیین نشده"],
                  ["نوع پارکینگ", label(PARKING_COVERS, data.cover)],
                  ["زمان دسترسی", label(PARKING_ACCESS, data.access)],
                  ["شرایط خاص", data.requirements || "ثبت نشده"],
                ];
                return <article className="parking-details-section"><div className="parking-details-section__heading"><div className="parking-details-section__icon">🚘</div><div><span>درخواست پارکینگ</span><h2>مشخصات پارکینگ موردنیاز</h2></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, padding: "12px 0" }}>{rows.map(([name, value]) => <div key={name} style={{ padding: 12, border: "1px solid #eee1d6", borderRadius: 12 }}><small style={{ display: "block", color: "#786b60" }}>{name}</small><strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong></div>)}</div></article>;
              })()}
              {isWanted && category === "other" && otherWantedData && (
                <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">✨</div>
                    <div><span>درخواست فضای خاص</span><h2>فضای موردنیاز متقاضی</h2></div>
                  </div>
                  <div style={{padding:"12px 0",lineHeight:1.95}}>
                    <strong style={{display:"block",marginBottom:8}}>چه فضایی و برای چه کاری؟</strong>
                    <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",margin:0}}>{otherWantedData.requestText}</p>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:16}}>
                      {[
                        ["نام فضا",parking.customCategory || parking.categoryLabel],
                        ["مساحت",otherAreaText],["بودجه",otherBudgetText],
                        ["مدت",otherWantedData.duration !== "flexible" ? otherRequestLabel(OTHER_REQUEST_DURATIONS,otherWantedData.duration) : ""],
                        ["امکانات",(otherWantedData.features || []).map((x)=>otherRequestLabel(OTHER_REQUEST_FEATURES,x)).filter(Boolean).join("، ")],
                        ["شرایط تکمیلی",otherWantedData.requirements],
                        ["توضیحات قدیمی",wantedOther.description],
                      ].filter(([,text])=>text).map(([name,text])=><div key={name} style={{padding:12,border:"1px solid #eee1d6",borderRadius:12}}>
                        <small style={{display:"block",color:"#786b60"}}>{name}</small>
                        <strong style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{text}</strong>
                      </div>)}
                    </div>
                  </div>
                </article>
              )}
              {isWanted && category === "parking" && readParkingRequestUsage(parking.description).usage && (
                <article className="parking-details-section">
                  <div className="parking-details-section__heading">
                    <div className="parking-details-section__icon">🚘</div>
                    <div><span>کاربری درخواستی</span><h2>{parkingUsageLabel(readParkingRequestUsage(parking.description).usage, readParkingRequestUsage(parking.description).otherUsage)}</h2></div>
                  </div>
                </article>
              )}

              {category === "parking" && !isWanted && parking?.spaceAttributes?.schemaVersion === 1 && parking.spaceAttributes.category === "parking" && (() => {
                const d = parking.spaceAttributes.values || {};
                const rows = [
                  ["مناسب برای", parkingOfferLabel(PARKING_OFFER_USAGE,d.vehicleUsage)],
                  ["نوع پارکینگ", parkingOfferLabel(PARKING_OFFER_COVER,d.cover)],
                  ["زمان دسترسی", parkingOfferLabel(PARKING_OFFER_ACCESS,d.access)],
                  ["نحوه پارک", parkingOfferLabel(PARKING_OFFER_STYLE,d.parkingStyle)],
                  ["ارتفاع مفید ورودی", d.entranceHeightCm ? `${Number(d.entranceHeightCm).toLocaleString("fa-IR")} سانتی‌متر` : ""],
                  ["کاربری خاص", d.vehicleUsage === "other" ? d.usageNotes : ""],
                ].filter(([,v])=>Boolean(v));
                const amenities = (Array.isArray(d.securityFeatures) ? d.securityFeatures : []).map(id=>parkingOfferLabel(PARKING_OFFER_SECURITY,id)).filter(Boolean);
                return (rows.length || amenities.length) ? <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🚘</div><div><span>اطلاعات واقعی عرضه</span><h2>ویژگی‌های پارکینگ</h2></div></div>
                  <div className="parking-details-residential__grid">{rows.map(([k,v])=><span key={k}><small>{k}</small><strong>{v}</strong></span>)}</div>
                  {amenities.length > 0 && <div className="parking-details-residential__amenities">{amenities.map(a=><b key={a}>✓ {a}</b>)}</div>}
                </article> : null;
              })()}

              {category === "storage" && !isWanted && parking?.spaceAttributes?.schemaVersion === 1 && parking.spaceAttributes.category === "storage" && (() => {
                const d = parking.spaceAttributes.values || {};
                const rows = [
                  ["نوع انبار", storageOfferLabel(STORAGE_TYPES,d.spaceType)],
                  ["مناسب نگهداری", (Array.isArray(d.allowedPurposes)?d.allowedPurposes:[]).map(v=>storageOfferLabel(STORAGE_PURPOSES,v)).filter(Boolean).join("، ")],
                  ["زمان دسترسی", storageOfferLabel(STORAGE_ACCESS,d.access)],
                  ["ارتفاع مفید", d.spaceType !== "outdoor" && Number(d.heightM)>0 ? `${Number(d.heightM).toLocaleString("fa-IR")} متر` : ""],
                  ["ورود خودرو", storageOfferLabel(STORAGE_VEHICLES,d.vehicleAccess)],
                  ["نحوه بارگیری", storageOfferLabel(STORAGE_LOADING,d.loadingMethod)],
                  ["نوع کالای خاص", (d.allowedPurposes||[]).includes("other") ? d.otherPurpose : ""],
                ].filter(([,v])=>Boolean(v));
                const amenities = (Array.isArray(d.features)?d.features:[]).filter(v=>v!=="truck"&&v!=="ground").map(v=>storageOfferLabel(STORAGE_FEATURES,v)).filter(Boolean);
                return rows.length || amenities.length ? <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">📦</div><div><span>اطلاعات واقعی عرضه</span><h2>ویژگی‌های انبار</h2></div></div>
                  <div className="parking-details-residential__grid">{rows.map(([name,text])=><span key={name}><small>{name}</small><strong>{text}</strong></span>)}</div>
                  {amenities.length>0 && <div className="parking-details-residential__amenities">{amenities.map((text)=><b key={text}>✓ {text}</b>)}</div>}
                </article> : null;
              })()}

              {category === "warehouse" && !isWanted && parking?.spaceAttributes?.schemaVersion === 1 && parking.spaceAttributes.category === "warehouse" && (() => {
                const d = parking.spaceAttributes.values || {};
                const rows = [
                  ["نوع فضای موجود", industrialLabel(INDUSTRIAL_TYPES,d.spaceType)],
                  ["فعالیت‌های قابل انجام", (Array.isArray(d.allowedActivities)?d.allowedActivities:[]).map(id=>shedOptionLabel(shedActivitiesFor(d.spaceType),id)).filter(v=>v!=="مشخص نشده").join("، ")],
                  ["فعالیت خاص", (d.allowedActivities||[]).includes("other") ? d.otherActivity : ""],
                  ["برق موجود", industrialLabel(INDUSTRIAL_POWER,d.power)],
                  ["توان برق سه‌فاز", Number(d.powerCapacityKw)>0 && ["three","both"].includes(d.power) ? `${Number(d.powerCapacityKw).toLocaleString("fa-IR")} کیلووات` : ""],
                  ["ارتفاع مفید", Number(d.heightM)>0 ? `${Number(d.heightM).toLocaleString("fa-IR")} متر` : ""],
                  ["دسترسی باربری", industrialLabel(INDUSTRIAL_VEHICLES,d.vehicleAccess)],
                  ["نوع کف", industrialLabel(INDUSTRIAL_FLOORS,d.flooring)],
                  ["ساعت استفاده", industrialLabel(INDUSTRIAL_HOURS,d.operationHours)],
                  ["ظرفیت جرثقیل", Number(d.craneCapacityTons)>0 && (d.features||[]).includes("crane") ? `${Number(d.craneCapacityTons).toLocaleString("fa-IR")} تن` : ""],
                ].filter(([,text])=>Boolean(text));
                const amenities = (Array.isArray(d.features)?d.features:[]).map(id=>industrialLabel(INDUSTRIAL_FEATURE_OPTIONS,id)).filter(Boolean);
                return rows.length || amenities.length ? <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🏭</div><div><span>اطلاعات واقعی عرضه</span><h2>ویژگی‌های سوله و کارگاه</h2></div></div>
                  <div className="parking-details-residential__grid">{rows.map(([name,text])=><span key={name}><small>{name}</small><strong>{text}</strong></span>)}</div>
                  {amenities.length>0 && <div className="parking-details-residential__amenities">{amenities.map(text=><b key={text}>✓ {text}</b>)}</div>}
                </article> : null;
              })()}

              {category === "land" && !isWanted && parking?.spaceAttributes?.schemaVersion === 1 && parking.spaceAttributes.category === "land" && (()=>{
                const v=parking.spaceAttributes.values || {};
                const pick=(list,id)=>landOfferLabel(list,id);
                const rows=[
                  ["وضعیت زمین",pick(LAND_OFFER_TYPES,v.landType)],
                  ["کاربردهای اعلام‌شده",(Array.isArray(v.allowedPurposes)?v.allowedPurposes:[]).map(x=>pick(LAND_OFFER_PURPOSES,x)).filter(Boolean).join("، ")],
                  ["توضیح کاربرد دیگر",(v.allowedPurposes||[]).includes("other")?v.otherPurpose:""],
                  ["راه دسترسی",pick(LAND_OFFER_ROADS,v.accessRoad)],
                  ["کاربری طبق مدارک (اظهار مالک)",pick(LAND_OFFER_LEGAL,v.legalUse)],
                  ["موقعیت بافت",pick(LAND_OFFER_LOCATION,v.locationType)],
                  ["شیب زمین",pick(LAND_OFFER_SLOPES,v.slope)],
                  ["ورود خودرو",pick(LAND_OFFER_VEHICLES,v.vehicleAccess)],
                  ["بر زمین",Number(v.frontageM)>0?`${Number(v.frontageM).toLocaleString("fa-IR")} متر`:""],
                  ["مبلغ پول پیش",Number(v.depositRial)>0?`${Number(v.depositRial).toLocaleString("fa-IR")} ریال`:""],
                  ["منابع آب",(Array.isArray(v.waterSources)?v.waterSources:[]).map(x=>pick(LAND_OFFER_WATER,x)).filter(Boolean).join("، ")],
                  ["روش آبیاری",pick(LAND_OFFER_IRRIGATION,v.irrigation)],
                  ["نوع کشت",(Array.isArray(v.crops)?v.crops:[]).map(x=>pick(LAND_OFFER_CROPS,x)).filter(Boolean).join("، ")],
                ].filter(([,text])=>Boolean(text));
                const amenities=(Array.isArray(v.features)?v.features:[]).map(x=>pick(LAND_OFFER_FEATURES,x)).filter(Boolean);
                return rows.length||amenities.length?<article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🌱</div><div><span>مشخصات اعلام‌شده توسط مالک</span><h2>ویژگی‌های واقعی زمین</h2></div></div>
                  <div className="parking-details-residential__grid">{rows.map(([name,text])=><span key={name}><small>{name}</small><strong>{text}</strong></span>)}</div>
                  {amenities.length>0&&<div className="parking-details-residential__amenities">{amenities.map(text=><b key={text}>✓ {text}</b>)}</div>}
                  <p style={{fontSize:12,lineHeight:1.9,color:"#786a60"}}>کاربردهای اعلام‌شده، به معنی تأیید کاربری قانونی یا مجوز فعالیت نیست.</p>
                </article>:null;
              })()}

              {!(["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"].includes(category) && !isWanted && !String(parking.description || "").trim()) && !(isWanted && (["storage", "warehouse", "parking", "shop", "land"].includes(category) || (category === "residential" && residentialWantedData) || (category === "villa" && villaWantedData) || (category === "garden" && gardenWantedData) || (category === "other" && otherWantedData))) && (
              <article className="parking-details-section parking-details-section--description">
                <div className="parking-details-section__heading">
                  <div className="parking-details-section__icon parking-details-section__icon--description">
                    ☰
                  </div>

                  <div>
                    <span>
                      درباره آگهی
                    </span>

                    

            <h2>
                      {isWanted
                        ? `توضیحات نیاز به ${visibleCategory}`
                        : category === "parking" ? "نکات تکمیلی پارکینگ" : category === "storage" ? "نکات تکمیلی انبار" : category === "warehouse" ? "نکات تکمیلی سوله یا کارگاه" : category === "land" ? "نکات تکمیلی زمین" : category === "garden" ? "نکات تکمیلی باغ" : `توضیحات ${visibleCategory}`}
                    </h2>
                  </div>
                </div>

              {category === "residential" && (
                <div className="parking-details-residential">
                  <h3>🏠 مشخصات ملک مسکونی</h3>
                  <div className="parking-details-residential__grid">
                    <span><small>نوع ملک</small><strong>{residential.propertyType === "other" && parking?.spaceAttributes?.category === "residential" && parking?.spaceAttributes?.values?.otherType ? parking.spaceAttributes.values.otherType : residentialTypeLabels[residential.propertyType] || "مسکونی"}</strong></span>
                    {residentialPriceRows.map(({label,amount}) => <span key={label}><small>{label}</small><strong>{amount}</strong></span>)}
                    {Number(residential.bedrooms || 0) > 0 && <span><small>اتاق</small><strong>{Number(residential.bedrooms).toLocaleString("fa-IR")}</strong></span>}
                    {["apartment","penthouse"].includes(residential.propertyType) && residential.floor && <span><small>طبقه</small><strong>{residential.floor}</strong></span>}
                    {Number(residential.totalFloors || 0) > 0 && <span><small>تعداد طبقات ساختمان</small><strong>{Number(residential.totalFloors).toLocaleString("fa-IR")}</strong></span>}
                    {["apartment","penthouse"].includes(residential.propertyType) && Number(residential.unitsPerFloor || 0) > 0 && <span><small>واحد در هر طبقه</small><strong>{Number(residential.unitsPerFloor).toLocaleString("fa-IR")}</strong></span>}
                    {residential.buildYear > 0 && <span><small>سال ساخت</small><strong>{String(residential.buildYear).replace(/\D/g, "").replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}</strong></span>}
                  </div>
                  <div className="parking-details-residential__amenities">
                    {["apartment", "penthouse"].includes(residential.propertyType) && residential.elevator && <b>✓ آسانسور</b>}
                    {residential.parking && <b>✓ پارکینگ</b>}
                    {residential.storage && <b>✓ انباری</b>}
                    {residential.furnished && <b>✓ مبله</b>}
                    {["apartment", "penthouse", "house"].includes(residential.propertyType) && residential.balcony && <b>✓ بالکن</b>}
                    {residential.propertyType === "penthouse" && residential.roofGarden && <b>✓ روف‌گاردن / تراس اختصاصی</b>}
                    {!isWanted && parking?.spaceAttributes?.category === "residential" && parking?.spaceAttributes?.values?.features?.includes("yard") && <b>✓ حیاط</b>}
                    {residential.renovated && <b>✓ بازسازی‌شده</b>}
                    {residential.convertible && <b>✓ قابل تبدیل رهن و اجاره</b>}
                  </div>
                  {residential.propertyType === "villa" && residential.buildingUse && <div className="parking-details-residential__grid"><span><small>نوع استفاده ساختمان</small><strong>{residential.buildingUse === "single" ? "مستقل و یکپارچه" : "دارای واحدهای مستقل"}</strong></span></div>}
                  <div className="parking-details-residential__amenities">
                    {Array.isArray(residential.heatingSystems) && residential.heatingSystems.map(key => climateLabels[key] && <b key={`heat-${key}`}>♨ {climateLabels[key]}</b>)}
                    {Array.isArray(residential.coolingSystems) && residential.coolingSystems.map(key => climateLabels[key] && <b key={`cool-${key}`}>❄ {climateLabels[key]}</b>)}
                  </div>
                </div>
              )}

              {isWanted && category === "residential" && residentialWantedData && (() => {
                const d = residentialWantedData;
                const type = d.propertyType === "other" ? (d.otherType || "سایر مسکونی") : residentialRequestLabel(RESIDENTIAL_REQUEST_TYPES, d.propertyType);
                const rows = [
                  ["نوع فضای درخواستی", type],
                  ["بازه متراژ", residentialAreaText],
                  ["حداقل اتاق", d.minBedrooms !== "" ? `${Number(d.minBedrooms).toLocaleString("fa-IR")} اتاق` : ""],
                  ["طبقه دلخواه", ["apartment", "penthouse"].includes(d.propertyType) && d.floorPreference !== "any" ? residentialRequestLabel(RESIDENTIAL_FLOOR_PREFERENCES, d.floorPreference) : ""],
                  ["بودجه", residentialBudgetText],
                  ["امکانات ضروری", (d.features || []).map((key) => residentialRequestLabel(RESIDENTIAL_REQUEST_FEATURES, key)).filter(Boolean).join("، ")],
                  ["شرایط خاص", d.requirements],
                  ["توضیحات قبلی", wantedResidential?.description],
                ];
                return <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🏠</div><div><span>درخواست فضای مسکونی</span><h2>مشخصات خانه موردنیاز</h2></div></div>
                  <div className="parking-details-residential__grid">
                    {rows.filter(([, value]) => value).map(([label, value]) => <span key={label}><small>{label}</small><strong style={{whiteSpace:"pre-wrap"}}>{value}</strong></span>)}
                  </div>
                </article>;
              })()}
              {isWanted && category === "villa" && villaWantedData && (() => {
                const d = villaWantedData;
                const rows = [
                  ["نوع اقامتگاه", d.accommodationType === "other" ? d.otherType : villaRequestLabel(VILLA_REQUEST_TYPES, d.accommodationType)],
                  ["نوع اقامت", villaRequestLabel(VILLA_REQUEST_STAYS, d.stayType)],
                  ["ظرفیت موردنیاز", d.guests ? `${Number(d.guests).toLocaleString("fa-IR")} نفر` : ""],
                  ["حداقل اتاق‌خواب", d.minBedrooms !== "" ? `${Number(d.minBedrooms).toLocaleString("fa-IR")} اتاق` : ""],
                  ["مساحت", d.minArea || d.maxArea ? villaAreaText : ""],
                  ["بودجه", villaBudgetText],
                  ["امکانات ضروری", (d.amenities || []).map((key) => villaRequestLabel(VILLA_REQUEST_AMENITIES, key)).filter(Boolean).join("، ")],
                  ["حریم خصوصی", d.privacyRequired ? "ضروری است" : ""],
                  ["شرایط خاص", d.requirements],
                  ["توضیحات درخواست قدیمی", wantedVilla?.description],
                ];
                return <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🏡</div><div><span>درخواست فضای تفریحی</span><h2>ویلا و اقامتگاه موردنیاز</h2></div></div>
                  <div className="parking-details-residential__grid">
                    {rows.filter(([, value]) => value).map(([label, value]) => <span key={label}><small>{label}</small><strong style={{whiteSpace:"pre-wrap"}}>{value}</strong></span>)}
                  </div>
                </article>;
              })()}
              {isWanted && category === "land" && readLandRental(parking.description).hasMetadata && (()=>{const d=readLandRental(parking.description).data;const rows=[["هدف اصلی",landLabel(LAND_PURPOSES,d.primaryPurpose)],["توضیح سایر موارد",d.primaryPurpose==="other"?d.otherPurpose:""],["سایر کاربردهای ثبت‌شده قبلی",(d.purposes||[]).filter(x=>x!==d.primaryPurpose).map(x=>landLabel(LAND_PURPOSES,x)).join("، ")],["کاربری قانونی",landLabel(LAND_LEGAL,d.legalUse)],["موقعیت",landLabel(LAND_LOCATION,d.locationType)],["مساحت",`${d.minArea||"؟"} تا ${d.maxArea||"؟"} ${d.areaUnit==="hectare"?"هکتار":"مترمربع"}`],["مدت",landLabel(LAND_DURATION,d.duration)],["قرارداد",landLabel(LAND_PAYMENT,d.paymentType)],["پول پیش",d.deposit?`${Number(d.deposit).toLocaleString("fa-IR")} ریال`:"تعیین نشده"],["اجاره",d.rent?`${Number(d.rent).toLocaleString("fa-IR")} ریال`:"تعیین نشده"],["ویژگی‌ها",(d.features||[]).map(x=>landLabel(LAND_FEATURES,x)).join("، ")],["نوع کشت",(d.crops||[]).map(x=>landLabel(LAND_CROPS,x)).join("، ")],["منابع آب",(d.waterSources||[]).map(x=>landLabel(LAND_WATER,x)).join("، ")],["روش آبیاری",landLabel(LAND_IRRIGATION,d.irrigation)],["حقابه و نوبت آب",d.waterRight],["فصل کشت",d.season],["مشارکت در محصول",d.cropShareNotes],["جزئیات کاربرد",Object.entries(d.purposeDetails?.[d.primaryPurpose]||{}).map(([k,v])=>Array.isArray(v)?v.join("، "):v).filter(Boolean).join("، ")],["شرایط خاص",d.requirements]];return <article className="parking-details-section"><div className="parking-details-section__heading"><div className="parking-details-section__icon">🌱</div><div><span>{isWanted?"درخواست زمین":"عرضه زمین"}</span><h2>مشخصات تخصصی اجاره زمین</h2></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,padding:"12px 0"}}>{rows.filter(([,v])=>v&&v!=="تعیین نشده").map(([name,v])=><div key={name} style={{padding:12,border:"1px solid #eee1d6",borderRadius:12}}><small style={{display:"block",color:"#786b60"}}>{name}</small><strong style={{whiteSpace:"pre-wrap"}}>{v}</strong></div>)}</div><p style={{fontSize:13}}>کاربرد پیشنهادی به معنی تأیید مجوز قانونی نیست.</p></article>})()}
              {category === "shop" && isWanted && (()=>{const d=readShopRequest(parking.description).data;const rows=[
                ["نوع فضای تجاری",shopOptionLabel(SHOP_TYPES,d.spaceType)],["فعالیت",d.activity==="other"?d.otherActivity:shopOptionLabel(SHOP_ACTIVITIES,d.activity)],
                ["متراژ موردنیاز",[d.minArea&&`از ${d.minArea}`,d.maxArea&&`تا ${d.maxArea}`].filter(Boolean).join(" ")||"تعیین نشده"],
                ["طبقه",shopOptionLabel(SHOP_FLOORS,d.floor)],["موقعیت",shopOptionLabel(SHOP_LOCATIONS,d.locationPreference)],
                ["حداقل بر مغازه",d.frontage?`${d.frontage} متر`:"تعیین نشده"],["نوع واگذاری",shopOptionLabel(SHOP_TRANSFER,d.transferType)],
                ["حداکثر پول پیش",d.deposit?`${Number(d.deposit).toLocaleString("fa-IR")} ریال`:"تعیین نشده"],
                ["حداکثر اجاره ماهانه",d.monthlyRent?`${Number(d.monthlyRent).toLocaleString("fa-IR")} ریال`:"تعیین نشده"],
                ["بودجه واگذاری حق",d.keyMoney?`${Number(d.keyMoney).toLocaleString("fa-IR")} ریال`:"تعیین نشده"],
                ["نوع حق",({key_money:"سرقفلی",business_right:"حق کسب یا پیشه یا تجارت",unsure:"نیازمند بررسی حقوقی"})[d.rightsType]||"تعیین نشده"],
                ["امکانات",(d.features||[]).map(id=>shopOptionLabel(SHOP_FEATURES,id)).join("، ")||"مورد خاصی ثبت نشده"],["شرایط خاص",d.requirements||"ثبت نشده"]
              ];return <article className="parking-details-section"><div className="parking-details-section__heading"><div className="parking-details-section__icon">🏪</div><div><span>درخواست فضای تجاری</span><h2>مشخصات مغازه موردنیاز</h2></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,padding:"12px 0"}}>{rows.map(([label,value])=><div key={label} style={{padding:12,border:"1px solid #eee1d6",borderRadius:12}}><small style={{display:"block",color:"#786b60"}}>{label}</small><strong style={{whiteSpace:"pre-wrap"}}>{value}</strong></div>)}</div></article>})()}
              {category === "shop" && !isWanted && parking?.spaceAttributes?.schemaVersion===1 && parking.spaceAttributes.category==="shop" && (()=>{
                const v=parking.spaceAttributes.values||{};
                const txt=(list,id)=>shopOfferLabel(list,id);
                const irr=n=>Number(n)>0?`${Number(n).toLocaleString("fa-IR")} ریال`:"";
                const rows=[
                  ["نوع فضای تجاری",txt(SHOP_OFFER_TYPES,v.spaceType)],
                  ["نوع دیگر",v.spaceType==="other"?v.otherSpaceType:""],
                  ["فعالیت‌های قابل ارائه",(v.allowedActivities||[]).map(id=>txt(SHOP_OFFER_ACTIVITIES,id)).filter(Boolean).join("، ")],
                  ["فعالیت دیگر",(v.allowedActivities||[]).includes("other")?v.otherActivity:""],
                  ["نوع واگذاری",txt(SHOP_OFFER_TRANSFERS,v.transferType)],
                  ["طبقه",txt(SHOP_OFFER_FLOORS,v.floor)],
                  ["موقعیت واحد",txt(SHOP_OFFER_LOCATIONS,v.locationPreference)],
                  ["برِ مغازه",Number(v.frontageM)>0?`${Number(v.frontageM).toLocaleString("fa-IR")} متر`:""],
                  ["نوع حق",v.transferType==="key_money"?txt(SHOP_RIGHTS,v.rightsType):""],
                  ["مبلغ ودیعه / رهن",["rent","full_deposit"].includes(v.transferType)?irr(v.depositRial):""],
                  ["اجاره ماهانه",v.transferType==="rent"?irr(v.monthlyRentRial):""],
                  ["مبلغ واگذاری حق",v.transferType==="key_money"?irr(v.keyMoneyRial):""],
                ].filter(([,label])=>Boolean(label));
                const amenities=(v.features||[]).map(id=>txt(SHOP_OFFER_FEATURES,id)).filter(Boolean);
                return rows.length||amenities.length?<article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🏪</div><div><span>مشخصات اعلام‌شده توسط مالک</span><h2>ویژگی‌های واقعی فضای تجاری</h2></div></div>
                  <div className="parking-details-residential__grid">{rows.map(([label,text])=><span key={label}><small>{label}</small><strong>{text}</strong></span>)}</div>
                  {amenities.length>0&&<div className="parking-details-residential__amenities">{amenities.map(text=><b key={text}>✓ {text}</b>)}</div>}
                  <p style={{fontSize:12,lineHeight:1.9,color:"#786a60"}}>فعالیت‌های اعلام‌شده، مجوز صنفی یا اعتبار حق سرقفلی را تأیید نمی‌کند. اطلاعات مالی انواع واگذاری قابل جمع با یکدیگر نیستند.</p>
                </article>:null;
              })()}
              {category === "shop" && !isWanted && hasShopAmenities && (
                <div className="parking-details-residential">
                  <h3>🏪 امکانات مغازه</h3>
                  <div className="parking-details-residential__grid">
                    {[["waterSupply","آب"],["electricitySupply","برق"]].map(([key,title]) => shop[key] && <span key={key}><small>{title}</small><strong>{({independent:"مستقل",shared:"مشترک",none:"ندارد"})[shop[key]]}</strong></span>)}
                  </div>
                  <div className="parking-details-residential__amenities">
                    {shop.threePhase && <b>✓ برق سه‌فاز</b>}{shop.cityGas && <b>✓ گاز شهری</b>}{shop.landline && <b>✓ تلفن ثابت</b>}{shop.restroom && <b>✓ سرویس بهداشتی</b>}
                  </div>
                  <div className="parking-details-residential__amenities">
                    {Array.isArray(shop.heatingSystems) && shop.heatingSystems.map(key => climateLabels[key] && <b key={`heat-${key}`}>♨ {climateLabels[key]}</b>)}
                    {Array.isArray(shop.coolingSystems) && shop.coolingSystems.map(key => climateLabels[key] && <b key={`cool-${key}`}>❄ {climateLabels[key]}</b>)}
                  </div>
                </div>
              )}

              {isWanted && category === "garden" && gardenWantedData && (() => {
                const d = gardenWantedData;
                const rows = [
                  ["هدف اجاره", d.purpose === "other" ? d.otherPurpose : gardenRequestLabel(GARDEN_REQUEST_PURPOSES, d.purpose)],
                  ["مساحت", gardenAreaText], ["بودجه", gardenBudgetText],
                  ["مدت", gardenRequestLabel(GARDEN_REQUEST_DURATIONS, d.duration)],
                  ["ویژگی‌های ضروری", (d.features || []).map(id => gardenRequestLabel(GARDEN_REQUEST_FEATURES, id)).filter(Boolean).join("، ")],
                  ["درختان یا نوع کشت", d.treesNote],
                  ["ترجیح منبع آب", ["orchard", "gardening"].includes(d.purpose) && d.waterPreference !== "any" ? gardenRequestLabel(GARDEN_REQUEST_WATER, d.waterPreference) : ""],
                  ["ظرفیت مهمان‌ها", d.eventGuests ? `${Number(d.eventGuests).toLocaleString("fa-IR")} نفر` : ""],
                  ["حریم خصوصی", d.privacyRequired ? "ضروری است" : ""],
                  ["شرایط خاص", d.requirements],
                  ["یادداشت قبلی", wantedGarden.description],
                ].filter(([, v]) => Boolean(v));
                return <article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🌳</div><div><span>درخواست باغ</span><h2>مشخصات باغ موردنیاز</h2></div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, padding: "12px 0" }}>
                    {rows.map(([label, val]) => <div key={label} style={{ border: "1px solid #eee1d6", borderRadius: 12, padding: 12 }}><small style={{ display: "block", color: "#786b60" }}>{label}</small><strong style={{ whiteSpace: "pre-wrap" }}>{val}</strong></div>)}
                  </div>
                  <p style={{ fontSize: 13 }}>نوع استفاده به معنی تأیید مجوز قانونی نیست.</p>
                </article>;
              })()}
              {!isWanted && category === "garden" && parking?.spaceAttributes?.schemaVersion === 1 && parking?.spaceAttributes?.category === "garden" && (() => {
                const v=parking.spaceAttributes.values||{};
                const label=(opts,x)=>gardenOfferLabel(opts,x);
                const rows=[
                  ["نوع واقعی باغ",label(GARDEN_OFFER_TYPES,v.gardenType)],
                  ["استفاده‌های قابل واگذاری",(Array.isArray(v.allowedPurposes)?v.allowedPurposes:[]).map(x=>x==="other"&&v.otherPurpose?`سایر: ${v.otherPurpose}`:label(GARDEN_OFFER_PURPOSES,x)).filter(Boolean).join("، ")],
                  ["نوع راه دسترسی",label(GARDEN_OFFER_ROADS,v.accessRoad)],
                  ["مدت قابل واگذاری",label(GARDEN_OFFER_DURATIONS,v.rentalDuration)],
                  ["حریم خصوصی",label(GARDEN_OFFER_PRIVACY,v.privacy)],
                  ["ظرفیت مهمان",Array.isArray(v.allowedPurposes)&&v.allowedPurposes.includes("event")&&Number(v.eventCapacity)>0?`${Number(v.eventCapacity).toLocaleString("fa-IR")} نفر`:""],
                ].filter(([,val])=>Boolean(val));
                const amenities=(Array.isArray(v.features)?v.features:[]).map(x=>label(GARDEN_OFFER_FEATURES,x)).filter(Boolean);
                return rows.length||amenities.length?<article className="parking-details-section">
                  <div className="parking-details-section__heading"><div className="parking-details-section__icon">🌿</div><div><span>اطلاعات ثبت‌شده توسط مالک</span><h2>کاربردها و شرایط واگذاری باغ</h2></div></div>
                  <div className="parking-details-residential__grid">{rows.map(([name,text])=><span key={name}><small>{name}</small><strong>{text}</strong></span>)}</div>
                  {amenities.length>0&&<div className="parking-details-residential__amenities">{amenities.map(t=><b key={t}>✓ {t}</b>)}</div>}
                  <p style={{fontSize:12,color:"#786a60",lineHeight:1.9}}>استفاده برای مراسم یا هر فعالیت دیگر، به معنی داشتن مجوز قانونی نیست.</p>
                </article>:null;
              })()}
              {category === "garden" && (!isWanted || !gardenWantedData) && (
                <div className="parking-details-residential">
                  <h3>🌳 مشخصات باغ</h3>
                  <div className="parking-details-residential__grid">
                    {garden.trees && <span><small>درختان و پوشش گیاهی</small><strong>{garden.trees}</strong></span>}
                    {garden.waterSource && <span><small>منبع آب</small><strong>{({well:"چاه",canal:"قنات / کانال",network:"آب شبکه",share:"حقابه",none:"فاقد منبع مشخص"})[garden.waterSource] || garden.waterSource}</strong></span>}
                    {garden.irrigation && <span><small>آبیاری</small><strong>{({drip:"قطره‌ای",flood:"غرقابی",sprinkler:"بارانی",other:"سایر"})[garden.irrigation] || garden.irrigation}</strong></span>}
                    {garden.accessRoad && !(parking?.spaceAttributes?.schemaVersion===1 && parking?.spaceAttributes?.category==="garden" && parking?.spaceAttributes?.values?.accessRoad) && <span><small>راه دسترسی</small><strong>{garden.accessRoad}</strong></span>}
                  </div>
                  <div className="parking-details-residential__amenities">
                    {garden.water && <b>✓ آب</b>}{garden.electricity && <b>✓ برق</b>}{garden.fenced && <b>✓ حصارکشی</b>}{garden.building && <b>✓ ساختمان / اتاقک</b>}{garden.cityGas && <b>✓ گاز شهری</b>}{garden.landline && <b>✓ تلفن ثابت</b>}{garden.furnished && <b>✓ مبله</b>}
                  </div>
                  {garden.building && <div className="parking-details-residential__amenities">
                    {Array.isArray(garden.heatingSystems) && garden.heatingSystems.map(key => climateLabels[key] && <b key={`heat-${key}`}>♨ {climateLabels[key]}</b>)}
                    {Array.isArray(garden.coolingSystems) && garden.coolingSystems.map(key => climateLabels[key] && <b key={`cool-${key}`}>❄ {climateLabels[key]}</b>)}
                  </div>}
                </div>
              )}

              {category === "villa" && (
                <div className="parking-details-residential">
                  <h3>🏡 مشخصات ویلای تفریحی / مسکونی</h3>

                  {!isWanted && parking?.spaceAttributes?.schemaVersion===1 && parking?.spaceAttributes?.category==="villa" && (()=>{
                    const v=parking.spaceAttributes.values||{};
                    const rows=[
                      ["نوع اقامتگاه",v.accommodationType==="other"?v.otherType:villaOfferLabel(VILLA_OFFER_TYPES,v.accommodationType)],
                      ["نوع واگذاری",v.rentalTerm==="long"?"اجاره بلندمدت":"اقامت کوتاه‌مدت"],
                      ["نوع قرارداد",v.rentalTerm==="long"?villaOfferLabel(VILLA_LONG_MODES,v.financialMode):""],
                      ["شیوه‌های اقامت",v.rentalTerm==="long"?"":(v.availableStays||[]).map(id=>villaOfferLabel(VILLA_OFFER_STAYS,id)).filter(Boolean).join("، ")],
                      ["حریم خصوصی",villaOfferLabel(VILLA_OFFER_PRIVACY,v.privacy)],
                    ].filter(([,txt])=>txt);
                    return <><div className="parking-details-residential__grid">{rows.map(([label,txt])=><span key={label}><small>{label}</small><strong>{txt}</strong></span>)}</div>
                     <div className="parking-details-residential__amenities">{(v.features||[]).filter(id=>["indoor_pool","gazebo"].includes(id)).map(id=><b key={id}>✓ {villaOfferLabel(VILLA_OFFER_EXTRAS,id)}</b>)}</div></>;
                  })()}
                  <div className="parking-details-residential__grid">
                    <span>
                      <small>اتاق خواب</small>
                      <strong>{Number(villa.bedrooms || 0).toLocaleString("fa-IR")}</strong>
                    </span>
                    {Number(villa.capacity || 0)>0 && <span>
                      <small>ظرفیت</small>
                      <strong>{Number(villa.capacity || 0).toLocaleString("fa-IR")} نفر</strong>
                    </span>}

                    {Number(villa.extraGuestPrice || 0) > 0 && (
                      <span>
                        <small>هر نفر اضافه</small>
                        <strong>{Number(villa.extraGuestPrice).toLocaleString("fa-IR")} ریال</strong>
                      </span>
                    )}

                    {villa.distanceToSea && (
                      <span>
                        <small>فاصله تا دریا</small>
                        <strong>{villa.distanceToSea}</strong>
                      </span>
                    )}

                    {villa.distanceToForest && (
                      <span>
                        <small>فاصله تا جنگل</small>
                        <strong>{villa.distanceToForest}</strong>
                      </span>
                    )}

                    {villa.checkInTime && (
                      <span>
                        <small>تحویل ویلا</small>
                        <strong>{villa.checkInTime}</strong>
                      </span>
                    )}

                    {villa.checkOutTime && (
                      <span>
                        <small>تخلیه ویلا</small>
                        <strong>{villa.checkOutTime}</strong>
                      </span>
                    )}
                  </div>

                  <div className="parking-details-residential__amenities">
                    {villa.pool && <b>✓ استخر</b>}
                    {villa.heatedPool && <b>✓ استخر آب‌گرم</b>}
                    {villa.parking && <b>✓ پارکینگ</b>}
                    {villa.yard && <b>✓ حیاط</b>}
                    {villa.furnished && <b>✓ مبله</b>}
                    {villa.barbecue && <b>✓ باربیکیو</b>}
                    {villa.airConditioning && <b>✓ سرمایش</b>}
                    {villa.heating && <b>✓ گرمایش</b>}
                    {villa.wifi && <b>✓ وای‌فای</b>}
                    {villa.petFriendly && <b>✓ ورود حیوان خانگی</b>}
                  </div>
                  <div className="parking-details-residential__amenities">
                    {Array.isArray(villa.heatingSystems) && villa.heatingSystems.map(key => climateLabels[key] && <b key={`heat-${key}`}>♨ {climateLabels[key]}</b>)}
                    {Array.isArray(villa.coolingSystems) && villa.coolingSystems.map(key => climateLabels[key] && <b key={`cool-${key}`}>❄ {climateLabels[key]}</b>)}
                  </div>

                  {villa.houseRules && (
                    <div style={{ marginTop: "14px" }}>
                      <h3 style={{ marginBottom: "8px" }}>
                        📋 قوانین و توضیحات اقامت
                      </h3>
                      <p
                        className="parking-details-description"
                        style={{ whiteSpace: "pre-line", margin: 0 }}
                      >
                        {villa.houseRules}
                      </p>
                    </div>
                  )}
                </div>
              )}

                <p className="parking-details-description">
                  {(isWanted && category === "parking" ? readParkingRequestUsage(parking.description).description : isWanted && category === "storage" ? readWarehouseRequest(parking.description).description : category === "land" ? readLandRental(parking.description).description : parking.description) ||
                    "توضیحی برای این آگهی ثبت نشده است."}
                </p>
              </article>
              )}

              <article className="parking-details-location">
                <div>
                  <span>
                    {parking.location?.lat != null && parking.location?.lng != null ? "موقعیت تقریبی" : "محدوده مکانی"}
                  </span>

                  <h2>
                    {parking.city ||
                      "شهر ثبت نشده"}
                  </h2>

                  <p>
                    {parking.location?.lat == null || parking.location?.lng == null
                      ? `برای این ${visibleCategory} نقطه‌ای روی نقشه ثبت نشده است؛ برای اطلاع از محدوده دقیق با ${isWanted ? "متقاضی" : "آگهی‌دهنده"} تماس بگیرید.`
                      : isWanted
                        ? `محدوده دقیق موردنظر برای ${visibleCategory} را از طریق تماس با متقاضی دریافت کنید.`
                        : `موقعیت دقیق ${visibleCategory} را از طریق تماس با آگهی‌دهنده دریافت کنید.`}
                  </p>
                </div>

                <div className="parking-details-location__visual" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path
                      d="M12 21s6-5.15 6-11a6 6 0 1 0-12 0c0 5.85 6 11 6 11Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10" r="2.15" fill="currentColor" />
                  </svg>
                </div>

                {parking.location?.lat != null &&
                  parking.location?.lng != null && (
                    <NeshanApproximateMap
                      location={parking.location}
                      city={parking.city}
                    />
                  )}
              </article>
            </div>

            <aside className="parking-details-sidebar">
              <div className="parking-contact-card">
                <div className="parking-contact-card__header">
                  <span className="parking-contact-card__eyebrow">
                    {isWanted
                      ? "ارتباط با متقاضی"
                      : "ارتباط با آگهی‌دهنده"}
                  </span>

                  <h2>
                    {isWanted
                      ? isRented
                        ? "این درخواست تأمین شده"
                        : isInactive
                          ? "این درخواست غیرفعال است"
                          : "این نیاز را می‌توانی تأمین کنی؟"
                      : isRented
                        ? `این ${visibleCategory} اجاره داده شده`
                        : isInactive
                          ? "این آگهی غیرفعال است"
                          : `این ${visibleCategory} را پسندیدی؟`}
                  </h2>

                  <p>
                    {isWanted
                      ? isRented
                        ? "متقاضی فضای موردنظرش را پیدا کرده است."
                        : isInactive
                          ? "این درخواست فعلاً توسط ثبت‌کننده غیرفعال شده است."
                          : `اگر ${visibleCategory} مناسب داری، برای هماهنگی با متقاضی تماس بگیر یا پیام بده.`
                      : isRented
                        ? "این فضا دیگر برای اجاره در دسترس نیست."
                        : isInactive
                          ? "این آگهی فعلاً توسط صاحب آن غیرفعال شده است."
                          : "برای دریافت اطلاعات بیشتر و هماهنگی، شماره تماس را مشاهده کن."}
                  </p>
                </div>

                {isRented || isInactive ? (
                  <div className="parking-contact-card__unavailable">
                    <span>{isRented ? "✅" : "⏸"}</span>

                    <p>
                      {isWanted
                        ? isRented
                          ? "این درخواست تأمین شده و امکان تماس یا شروع گفتگوی جدید برای آن غیرفعال است."
                          : "این درخواست موقتاً غیرفعال است و امکان تماس یا شروع گفتگوی جدید برای آن وجود ندارد."
                        : isRented
                          ? "این فضا اجاره داده شده و امکان تماس یا شروع گفتگوی جدید برای آن غیرفعال است."
                          : "این آگهی موقتاً غیرفعال است و امکان تماس یا شروع گفتگوی جدید برای آن وجود ندارد."}
                    </p>
                  </div>
                ) : (
                  <div className="parking-contact-card__phone">
                    <button
                      type="button"
                      className="parking-contact-card__phone-button"
                      onClick={handlePhoneToggle}
                      disabled={contactLoading}
                    >
                      <span>📞</span>

                      {contactLoading
                        ? "در حال دریافت شماره..."
                        : showPhone
                          ? "پنهان کردن شماره"
                          : isWanted
                            ? "نمایش شماره متقاضی"
                            : "نمایش شماره تماس"}
                    </button>

                    {showPhone && contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="parking-contact-card__phone-number"
                      >
                        <span>تماس مستقیم</span>
                        <strong>{contactPhone}</strong>
                      </a>
                    )}
                  </div>
                )}

                {!authLoading &&
                  !isOwner &&
                  !isRented &&
                  !isInactive && (
                    <Link
                      to={`/chat/${parking.id}`}
                      className="parking-contact-card__phone-button"
                      style={{
                        marginTop: "12px",
                        textDecoration: "none",
                      }}
                    >
                      <span>💬</span>
                      {isWanted
                        ? "ارسال پیام به متقاضی"
                        : "ارسال پیام به آگهی‌دهنده"}
                    </Link>
                  )}

                <div className="parking-contact-card__divider" />

                <div className="parking-contact-card__owner">
                  <div className="parking-contact-card__avatar">
                    {parking?.ownerIsApprovedAgent ? "✓" : isWanted ? "م" : "ف"}
                  </div>

                  <div>
                    <span>
                      {parking?.ownerIsApprovedAgent
                        ? "ثبت‌کننده تأییدشده"
                        : isWanted
                          ? "ثبت‌کننده درخواست"
                          : "ثبت‌کننده آگهی"}
                    </span>

                    <strong>
                      {ownerDisplayName}
                    </strong>
                  </div>
                </div>

                {parking?.ownerIsApprovedAgent && parking?.ownerId && (
                  <Link
                    to={`/agency-profile/${parking.ownerId}`}
                    className="parking-contact-card__agency-profile"
                  >
                    <span>🏢</span>
                    مشاهده پروفایل عمومی مشاور
                  </Link>
                )}

                {!authLoading && user && !isOwner && parking?.ownerId && (
                  <TrustSafetyActions
                    targetType="listing"
                    targetId={parking.id}
                    reportedUserId={parking.ownerId}
                  />
                )}

                <div className="parking-contact-card__notice">
                  <span>🛡</span>

                  <p>
                    {isWanted
                      ? "پیش از هماهنگی یا توافق، جزئیات درخواست را بررسی کنید."
                      : "پیش از پرداخت یا توافق، اطلاعات آگهی را بررسی کنید."}
                  </p>
                </div>
              </div>

              {!authLoading && isOwner && (
                <div className="parking-owner-card">
                  <div className="parking-owner-card__heading">
                    <span>⚙</span>

                    <div>
                      <strong>
                        {isWanted
                          ? "مدیریت درخواست"
                          : "مدیریت آگهی"}
                      </strong>

                      <small>
                        {isWanted
                          ? "این درخواست متعلق به شماست"
                          : "این آگهی متعلق به شماست"}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="parking-owner-card__edit"
                    onClick={handleEdit}
                  >
                    <span>✎</span>
                    {isWanted
                      ? "ویرایش درخواست"
                      : "ویرایش آگهی"}
                  </button>

                  <button
                    type="button"
                    className="parking-owner-card__delete"
                    onClick={
                      handleDelete
                    }
                    disabled={deleting}
                  >
                    <span>⌫</span>

                    {deleting
                      ? "در حال حذف..."
                      : isWanted
                        ? "حذف درخواست"
                        : "حذف آگهی"}
                  </button>
                </div>
              )}

              {!authLoading &&
                user &&
                !isOwner && (
                  <div className="parking-owner-note">
                    <span>ℹ</span>

                    <p>
                      {isWanted
                        ? "فقط ثبت‌کننده درخواست می‌تواند آن را ویرایش یا حذف کند."
                        : "فقط صاحب آگهی می‌تواند آن را ویرایش یا حذف کند."}
                    </p>
                  </div>
                )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ParkingDetails;