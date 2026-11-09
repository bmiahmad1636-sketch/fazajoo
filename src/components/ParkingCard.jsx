import { showInSiteAlert } from "../utils/inSiteDialog";
import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  getCurrentSessionUser,
  subscribeToAuth,
} from "../services/authService";

import {
  addFavorite,
  getFavoriteStatus,
  removeFavorite,
} from "../services/favoriteService";

import { formatRialPrice, normalizePriceNumber } from "../utils/priceFormatter";
import { readLandRental } from "../utils/landRental";
import { readResidentialRequest, residentialRequestAreaText, residentialRequestBudgetText } from "../utils/residentialRequest";
import { residentialFinancialHeadline, residentialFinancialRows } from "../utils/residentialOffer";
import { readVillaRequest, villaRequestAreaText, villaRequestBudgetText, villaRequestBudgetRows } from "../utils/villaRequest";
import { readGardenRequest, gardenRequestAreaText, gardenRequestBudgetText, gardenRequestBudgetRows } from "../utils/gardenRequest";
import { readOtherRequest, otherRequestAreaText, otherRequestBudgetText } from "../utils/otherRequest";
import { shopFinancialHeadline } from "../utils/shopOffer";
import { gardenFinancialHeadline, gardenFinancialRows } from "../utils/gardenOffer";
import { villaFinancialRows } from "../utils/villaOffer";
import VillaRentalBadges from "./VillaRentalBadges";
import ResidentialRentalBadges from "./ResidentialRentalBadges";
import OtherRentalBadges from "./OtherRentalBadges";
import GardenRentalBadges from "./GardenRentalBadges";
import {otherFinancialRows} from "../utils/otherOffer";

import "./ParkingCard.css";

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

function ParkingCard({ parking }) {
  const navigate = useNavigate();

  const {
    id,
    title,
    city,
    area,
    price,
    priceType = "monthly",
    imageUrl,
    status = "active",
    listingType = "offer",
    category = "parking",
    categoryLabel,
    customCategory,
    residentialDetails = {},
  } = parking;

  const [, setUser] =
    useState(null);

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [
    favoriteLoading,
    setFavoriteLoading,
  ] = useState(true);

  const [
    favoriteChanging,
    setFavoriteChanging,
  ] = useState(false);

  const isWanted =
    listingType === "wanted";
  const shopPriceText=!isWanted&&category==="shop"?shopFinancialHeadline(parking?.spaceAttributes):"";
  const gardenPriceText=!isWanted&&category==="garden"?gardenFinancialHeadline(parking?.spaceAttributes,price,priceType):"";
  const gardenPriceRows = gardenPriceText ? gardenFinancialRows(parking?.spaceAttributes,price,priceType) : [];
  const villaPriceRows = !isWanted && category === "villa" ? villaFinancialRows(parking?.spaceAttributes,price,priceType) : [];
  const residentialPriceRows = !isWanted && category === "residential" ? residentialFinancialRows(residentialDetails,parking?.spaceAttributes) : [];
  const otherPriceRows = !isWanted && category === "other" ? otherFinancialRows(parking?.spaceAttributes) : [];

  // Wanted land keeps its requirements in description metadata, not in
  // the generic area/price fields. Read only for this listing type.
  const wantedResidential = isWanted && category === "residential" ? readResidentialRequest(parking.description || "") : null;
  const residentialRequest = wantedResidential?.hasMetadata ? wantedResidential.data : null;
  const residentialAreaText = residentialRequest ? residentialRequestAreaText(residentialRequest) : "";
  const residentialBudgetText = residentialRequest ? residentialRequestBudgetText(residentialRequest) : "";
  const wantedVilla = isWanted && category === "villa" ? readVillaRequest(parking.description || "") : null;
  const villaData = wantedVilla?.hasMetadata ? wantedVilla.data : null;
  const villaAreaText = villaData ? villaRequestAreaText(villaData) : "";
  const villaBudgetText = villaData ? villaRequestBudgetText(villaData) : "";
  const villaWantedRows = villaData ? villaRequestBudgetRows(villaData) : [];
  const wantedGarden = isWanted && category === "garden" ? readGardenRequest(parking.description || "") : null;
  const gardenData = wantedGarden?.hasMetadata ? wantedGarden.data : null;
  const gardenAreaText = gardenData ? gardenRequestAreaText(gardenData) : "";
  const gardenBudgetText = gardenData ? gardenRequestBudgetText(gardenData) : "";
  const gardenWantedRows=gardenData?gardenRequestBudgetRows(gardenData):[];
  const wantedOther = isWanted && category === "other" ? readOtherRequest(parking.description || "", area, price, priceType) : null;
  const otherData = wantedOther?.hasMetadata ? wantedOther.data : null;
  const otherAreaText = otherData ? (otherRequestAreaText(otherData) || "توافقی / نامشخص") : "";
  const otherBudgetText = otherData ? otherRequestBudgetText(otherData) : "";
  const landRequest = isWanted && category === "land"
    ? readLandRental(parking.description || "")
    : null;
  const landData = landRequest?.hasMetadata ? landRequest.data : null;
  const landAreaUnit = landData?.areaUnit === "hectare" ? "هکتار" : "مترمربع";
  const landMinArea = normalizePriceNumber(landData?.minArea ?? parking.landRental?.minArea ?? parking.landRequest?.minArea);
  const landMaxArea = normalizePriceNumber(landData?.maxArea ?? parking.landRental?.maxArea ?? parking.landRequest?.maxArea);
  const landAreaText = landData && (landMinArea || landMaxArea)
    ? landMinArea && landMaxArea
      ? landMinArea === landMaxArea
        ? `${landMinArea.toLocaleString("fa-IR")} ${landAreaUnit}`
        : `${landMinArea.toLocaleString("fa-IR")} تا ${landMaxArea.toLocaleString("fa-IR")} ${landAreaUnit}`
      : landMinArea
        ? `از ${landMinArea.toLocaleString("fa-IR")} ${landAreaUnit}`
        : `تا ${landMaxArea.toLocaleString("fa-IR")} ${landAreaUnit}`
    : "";

  const landRentPeriods = {
    daily: "روزانه", monthly: "ماهانه", seasonal: "فصلی", yearly: "سالانه",
  };
  const landDeposit = normalizePriceNumber(landData?.deposit);
  const landRent = normalizePriceNumber(landData?.rent);
  const landPaymentType = landData?.paymentType;
  const landBudgetParts = landData ? [
    ...(["deposit", "both"].includes(landPaymentType) && landDeposit
      ? [`پول پیش تا ${landDeposit.toLocaleString("fa-IR")} ریال`]
      : []),
    ...(["rent", "both"].includes(landPaymentType) && landRent
      ? [`اجاره تا ${landRent.toLocaleString("fa-IR")} ریال / ${landRentPeriods[landData.rentPeriod] || "دوره نامشخص"}`]
      : []),
    ...(landPaymentType === "crop_share" ? ["مشارکت در محصول"] : []),
  ] : [];
  const landBudgetText = landBudgetParts.join(" • ");

  const categoryInfo =
    CATEGORY_INFO[category] ||
    CATEGORY_INFO.other;

  const visibleCategory =
    category === "other"
      ? customCategory?.trim() ||
        categoryLabel?.trim() ||
        "سایر فضاها"
      : categoryLabel?.trim() ||
        categoryInfo.label;

  const residentialPrice = category === "residential" && !isWanted
    ? residentialFinancialHeadline(residentialDetails, parking?.spaceAttributes)
    : "";

  const typeInfo = isWanted
    ? {
        label: "دنبال فضا",
        detail:
          "متقاضی این نوع فضاست",
        icon: "🔎",
        className:
          "parking-card__listing-type--wanted",
      }
    : {
        label: "فضا برای اجاره",
        detail:
          "مالک این فضا را عرضه کرده",
        icon: "🏠",
        className:
          "parking-card__listing-type--offer",
      };

  const getStatusInfo = () => {
    if (isWanted) {
      switch (status) {
        case "rented":
          return {
            label:
              "فضا پیدا شد",
            detail:
              "نیاز متقاضی برطرف شده",
            className:
              "parking-card__status--rented",
          };

        case "inactive":
          return {
            label:
              "غیرفعال",
            detail:
              "درخواست موقتاً غیرفعال است",
            className:
              "parking-card__status--inactive",
          };

        default:
          return {
            label:
              "درخواست فعال",
            detail:
              "هنوز در جستجوی فضاست",
            className:
              "parking-card__status--active",
          };
      }
    }

    switch (status) {
      case "rented":
        return {
          label:
            "اجاره داده شد",
          detail:
            "در حال حاضر در دسترس نیست",
          className:
            "parking-card__status--rented",
        };

      case "inactive":
        return {
          label:
            "غیرفعال",
          detail:
            "آگهی موقتاً غیرفعال است",
          className:
            "parking-card__status--inactive",
        };

      default:
        return {
          label:
            "در دسترس",
          detail:
            "آماده استفاده",
          className:
            "parking-card__status--active",
        };
    }
  };

  const statusInfo =
    getStatusInfo();

  useEffect(() => {
    let active = true;

    const loadFavoriteStatus = async (sessionUser) => {
      if (!active) {
        return;
      }

      setUser(sessionUser || null);

      if (!sessionUser || !id) {
        setIsFavorite(false);
        setFavoriteLoading(false);
        return;
      }

      setFavoriteLoading(true);

      try {
        const result = await getFavoriteStatus(id);

        if (active) {
          setIsFavorite(result);
        }
      } catch (error) {
        console.error(
          "خطا در بررسی علاقه‌مندی:",
          error
        );

        if (error?.status === 401 && active) {
          setUser(null);
          setIsFavorite(false);
        }
      } finally {
        if (active) {
          setFavoriteLoading(false);
        }
      }
    };

    loadFavoriteStatus(
      getCurrentSessionUser()
    );

    const unsubscribeAuth =
      subscribeToAuth((sessionUser) => {
        loadFavoriteStatus(sessionUser);
      });

    const handleFavoritesChanged = () => {
      loadFavoriteStatus(
        getCurrentSessionUser()
      );
    };

    window.addEventListener(
      "fazajoo:favorites-changed",
      handleFavoritesChanged
    );

    return () => {
      active = false;
      unsubscribeAuth();
      window.removeEventListener(
        "fazajoo:favorites-changed",
        handleFavoritesChanged
      );
    };
  }, [id]);

  const handleFavorite =
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const sessionUser =
        getCurrentSessionUser();

      if (!sessionUser) {
        showInSiteAlert("برای ذخیره آگهی ابتدا وارد حساب شوید.");

        navigate("/login");
        return;
      }

      if (
        favoriteChanging ||
        favoriteLoading
      ) {
        return;
      }

      setUser(sessionUser);
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
        console.error(
          "خطا در تغییر علاقه‌مندی:",
          error
        );

        if (error?.status === 401) {
          showInSiteAlert("نشست شما منقضی شده است. دوباره وارد شوید.");
          navigate("/login");
        } else {
          showInSiteAlert(error?.message || "ذخیره علاقه‌مندی انجام نشد. دوباره تلاش کنید.");
        }
      } finally {
        setFavoriteChanging(false);
      }
    };

  return (
    <article
      className={[
        "parking-card",
        isWanted
          ? "parking-card--wanted"
          : "parking-card--offer",
        status === "inactive"
          ? "parking-card--inactive"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Link
        to={`/parking/${id}`}
        className="parking-card__image-link"
        aria-label={`مشاهده آگهی ${
          title || visibleCategory
        }`}
      >
        <div className="parking-card__image-wrapper">
          {isWanted ? (
            <div className="parking-card__request-hero">
              <div className="parking-card__request-icon">
                🔎
              </div>

              <span className="parking-card__request-kicker">
                درخواست فضا
              </span>

              <strong className="parking-card__request-title">
                دنبال {visibleCategory}
              </strong>

              <span className="parking-card__request-city">
                در {city || "شهر ثبت نشده"}
              </span>
            </div>
          ) : imageUrl ? (
            <img
              className="parking-card__image"
              src={imageUrl}
              alt={
                title ||
                `تصویر ${visibleCategory}`
              }
              loading="lazy"
            />
          ) : (
            <div className="parking-card__placeholder">
              <div className="parking-card__placeholder-icon">
                {categoryInfo.icon}
              </div>

              <span>
                تصویر {visibleCategory}
              </span>
            </div>
          )}

          <div
            className={`parking-card__status ${statusInfo.className}`}
          >
            <span className="parking-card__status-dot" />

            {statusInfo.label}
          </div>

          <div className="parking-card__category">
            <span>
              {categoryInfo.icon}
            </span>

            {visibleCategory}
          </div>

          <div
            className={`parking-card__listing-type ${typeInfo.className}`}
          >
            <span>
              {typeInfo.icon}
            </span>

            {typeInfo.label}
          </div>
        </div>
      </Link>

      <div className="parking-card__content">
        <div className="parking-card__top">
          <div className="parking-card__heading">
            <div className="parking-card__type-caption">
              {typeInfo.detail}
            </div>

            <Link
              to={`/parking/${id}`}
              className="parking-card__title-link"
            >
              <h3 className="parking-card__title">
                {title ||
                  (isWanted
                    ? `دنبال ${visibleCategory}`
                    : `${visibleCategory} برای اجاره`)}
              </h3>
            </Link>

            <div className="parking-card__location">
              <span className="parking-card__location-icon">
                📍
              </span>

              <span>
                {city ||
                  "شهر ثبت نشده"}
              </span>
            </div>
            {!isWanted && category === "villa" && <VillaRentalBadges attributes={parking?.spaceAttributes} compact />}
            {!isWanted && category === "residential" && <ResidentialRentalBadges attributes={parking?.spaceAttributes} compact />}
            {!isWanted && category === "garden" && <GardenRentalBadges attributes={parking?.spaceAttributes} compact />}
            {isWanted && category === "garden" && gardenData?.rentalTerm && <span className="fj-vr-badge">درخواست {({short:"کوتاه‌مدت",seasonal:"فصلی",long:"بلندمدت"})[gardenData.rentalTerm]}</span>}
            {!isWanted && category === "other" && <OtherRentalBadges attributes={parking?.spaceAttributes} compact />}
            {isWanted && category === "other" && ["short","long"].includes(otherData?.rentalTerm) && <span className="fj-vr-badge">درخواست {otherData.rentalTerm==="short"?"کوتاه‌مدت":"بلندمدت"}</span>}
            {isWanted && category === "residential" && wantedResidential?.termDeclared &&
              <span className="fj-vr-badge" aria-label="مدت درخواست مسکونی">درخواست {residentialRequest.rentalTerm === "short" ? "کوتاه‌مدت" : "بلندمدت"}</span>}
          </div>

          <button
            type="button"
            className={`parking-card__favorite ${
              isFavorite
                ? "parking-card__favorite--active"
                : ""
            }`}
            onClick={
              handleFavorite
            }
            disabled={
              favoriteLoading ||
              favoriteChanging
            }
            aria-label={
              isFavorite
                ? "حذف از علاقه‌مندی‌ها"
                : "افزودن به علاقه‌مندی‌ها"
            }
            title={
              isFavorite
                ? "حذف از علاقه‌مندی‌ها"
                : "ذخیره آگهی"
            }
          >
            {favoriteChanging
              ? "…"
              : isFavorite
                ? "♥"
                : "♡"}
          </button>
        </div>

        <div className="parking-card__features">
          <div className="parking-card__feature">
            <span className="parking-card__feature-icon parking-card__feature-icon--purple">
              ↔
            </span>

            <div>
              <span className="parking-card__feature-label">
                {isWanted
                  ? "متراژ مدنظر"
                  : "متراژ"}
              </span>

              <strong>
                {(isWanted && category === "villa" && villaData ? (villaAreaText || "متراژ مشخص نشده") : otherAreaText || gardenAreaText || residentialAreaText || landAreaText || (area
                  ? `${Number(area).toLocaleString("fa-IR")} متر`
                  : "ثبت نشده"))}
              </strong>
            </div>
          </div>

          <div className="parking-card__feature">
            <span className="parking-card__feature-icon parking-card__feature-icon--cyan">
              {isWanted
                ? "🔎"
                : "🛡"}
            </span>

            <div>
              <span className="parking-card__feature-label">
                وضعیت
              </span>

              <strong>
                {
                  statusInfo.detail
                }
              </strong>
            </div>
          </div>
        </div>

        <div className="parking-card__divider" />

        <div className="parking-card__footer">
          <div className="parking-card__price">
            <span className="parking-card__price-label">
              {isWanted
                ? "بودجه"
                : "قیمت"}
            </span>

            {(gardenPriceRows.length || residentialPriceRows.length || gardenWantedRows.length || villaWantedRows.length || villaPriceRows.length || otherPriceRows.length) ? (
              <div className="parking-card__garden-money" aria-label={isWanted?"بودجه درخواست":"شرایط مالی آگهی"}>
                {(gardenPriceRows.length ? gardenPriceRows : gardenWantedRows.length ? gardenWantedRows : villaWantedRows.length ? villaWantedRows : villaPriceRows.length ? villaPriceRows : residentialPriceRows.length ? residentialPriceRows : otherPriceRows).map(({label,amount})=><div key={label} className="parking-card__garden-money-row"><span>{label}</span><bdi>{amount}</bdi></div>)}
              </div>
            ) : <strong>
              {landData
                ? (landBudgetText || "بودجه اعلام نشده")
                : (shopPriceText || gardenPriceText || otherBudgetText || gardenBudgetText || villaBudgetText || residentialBudgetText || residentialPrice ||
                  formatRialPrice(price, {
                    priceType,
                    fallback: "توافقی",
                  }))}
            </strong>}
          </div>

          <Link
            to={`/parking/${id}`}
            className="parking-card__details-button"
          >
            مشاهده جزئیات

            <span aria-hidden="true">
              ←
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ParkingCard;