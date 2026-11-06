import { showInSiteAlert } from "../utils/inSiteDialog";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSpace } from "../services/spaceService";
import { getAuthToken } from "../services/authService";
import ImageUploader from "../components/ImageUploader";
import VideoUploader from "../components/VideoUploader";
import NeshanLocationPicker from "../components/NeshanLocationPicker";
import ParkingRequestUsageFields from "../components/ParkingRequestUsageFields";
import ParkingOfferFields from "../components/ParkingOfferFields";
import StorageOfferFields from "../components/StorageOfferFields";
import IndustrialOfferFields from "../components/IndustrialOfferFields";
import LandOfferFields from "../components/LandOfferFields";
import {LAND_OFFER_DEFAULT,validateLandOffer,makeLandAttributes,landOfferLabel,LAND_OFFER_TYPES,LAND_OFFER_ROADS} from "../utils/landOffer";
import { INDUSTRIAL_OFFER_DEFAULT, validateIndustrialOffer, makeIndustrialAttributes, industrialLabel, INDUSTRIAL_TYPES, INDUSTRIAL_POWER } from "../utils/industrialOffer";
import { STORAGE_OFFER_DEFAULT, validateStorageOffer, makeStorageAttributes, storageOfferLabel, STORAGE_TYPES, STORAGE_ACCESS } from "../utils/storageOffer";
import { PARKING_OFFER_DEFAULT, validateParkingOffer, makeParkingAttributes, parkingOfferLabel, PARKING_OFFER_USAGE, PARKING_OFFER_COVER, PARKING_OFFER_ACCESS } from "../utils/parkingOffer";
import ParkingRequestDetailsFields from "../components/ParkingRequestDetailsFields";
import { EMPTY_PARKING_REQUEST, parkingRequestDetailsValidation, writeParkingRequestDetails } from "../utils/parkingRequestDetails";
import WarehouseRequestFields from "../components/WarehouseRequestFields";
import ShedRequestFields from "../components/ShedRequestFields";
import { EMPTY_SHED_REQUEST, shedRequestValidation, writeShedRequest } from "../utils/shedRequest";
import { EMPTY_WAREHOUSE_REQUEST, warehouseRequestValidation, writeWarehouseRequest } from "../utils/warehouseRequest";
import { writeParkingRequestUsage } from "../utils/parkingRequestUsage";
import IranCityAutocomplete from "../components/IranCityAutocomplete";
import "../components/IranCityAutocomplete.css";
import ResidentialFields from "../components/ResidentialFields";
import ResidentialRequestFields from "../components/ResidentialRequestFields";
import { EMPTY_RESIDENTIAL_REQUEST, validateResidentialRequest, writeResidentialRequest, residentialRequestLegacyDetails, residentialRequestAreaText, residentialRequestBudgetText } from "../utils/residentialRequest";
import { emptyResidentialDetails } from "../components/residentialDetails";
import { RESIDENTIAL_OFFER_DEFAULT, validateResidentialOffer, makeResidentialAttributes, residentialListingPrice } from "../utils/residentialOffer";
import VillaFields from "../components/VillaFields";
import VillaRequestFields from "../components/VillaRequestFields";
import { EMPTY_VILLA_REQUEST, validateVillaRequest, writeVillaRequest, villaRequestAreaText, villaRequestBudgetText } from "../utils/villaRequest";
import GardenFields from "../components/GardenFields";
import GardenOfferFields from "../components/GardenOfferFields";
import { GARDEN_OFFER_DEFAULT, validateGardenOffer, validateGardenFinancialRent, gardenListingPrice, makeGardenAttributes } from "../utils/gardenOffer";
import GardenRequestFields from "../components/GardenRequestFields";
import OtherRequestFields from "../components/OtherRequestFields";
import { EMPTY_OTHER_REQUEST, validateOtherRequest, writeOtherRequest } from "../utils/otherRequest";
import { EMPTY_GARDEN_REQUEST, validateGardenRequest, writeGardenRequest, gardenRequestBudgetText, gardenRequestAreaText } from "../utils/gardenRequest";
import ShopOfferFields from "../components/ShopOfferFields";
import { SHOP_OFFER_DEFAULT, validateShopOffer, makeShopAttributes, shopListingPrice, shopFinancialHeadline, shopOfferLabel, SHOP_OFFER_TYPES, SHOP_OFFER_TRANSFERS } from "../utils/shopOffer";
import LandRentalFields from "../components/LandRentalFields";
import { EMPTY_LAND_RENTAL, landRentalValidation, writeLandRental } from "../utils/landRental";
import ShopRequestFields from "../components/ShopRequestFields";
import { EMPTY_SHOP_REQUEST, shopRequestValidation, writeShopRequest } from "../utils/shopRequest";
import { emptyShopDetails } from "../components/shopDetails";
import { emptyGardenDetails } from "../components/gardenDetails";
import { emptyVillaDetails } from "../components/villaDetails";
import "../components/ResidentialFields.css";

import "./AddParking.css";

const INITIAL_FORM = {
  listingType: "offer",
  parkingOffer: { ...PARKING_OFFER_DEFAULT, securityFeatures: [] },
  storageOffer: { ...STORAGE_OFFER_DEFAULT, allowedPurposes: [], features: [] },
  industrialOffer: { ...INDUSTRIAL_OFFER_DEFAULT, allowedActivities: [], features: [] },
  landOffer: {...LAND_OFFER_DEFAULT,allowedPurposes:[],features:[],waterSources:[]},
  gardenOffer: {...GARDEN_OFFER_DEFAULT,allowedPurposes:[],features:[]},
  parkingRequestUsage: "",
  parkingOtherUsage: "",
  parkingRequestDetails: { ...EMPTY_PARKING_REQUEST },
  warehouseRequest: { ...EMPTY_WAREHOUSE_REQUEST, features: [] },
  shedRequest: { ...EMPTY_SHED_REQUEST, features: [] },
  category: "parking",
  customCategory: "",
  title: "",
  city: "",
  area: "",
  price: "",
  priceType: "monthly",
  phone: "",
  imageUrl: "",
  imageUrls: [],
  video: null,
  description: "",
  residentialDetails: { ...emptyResidentialDetails },
  residentialOffer: { ...RESIDENTIAL_OFFER_DEFAULT, features: [] },
  residentialRequest: { ...EMPTY_RESIDENTIAL_REQUEST, features: [] },
  villaDetails: { ...emptyVillaDetails },
  villaRequest: { ...EMPTY_VILLA_REQUEST, amenities: [] },
  gardenDetails: { ...emptyGardenDetails },
  gardenRequest: { ...EMPTY_GARDEN_REQUEST, features: [] },
  otherRequest: { ...EMPTY_OTHER_REQUEST, features: [] },
  shopDetails: { ...emptyShopDetails },
  shopOffer: { ...SHOP_OFFER_DEFAULT, allowedActivities: [], features: [] },
  shopRequest: { ...EMPTY_SHOP_REQUEST, features: [] },
  landRental: { ...EMPTY_LAND_RENTAL, purposes: [], features: [], crops: [], waterSources: [], agriFacilities: [] },
  agencyNetworkConsent: false,
  location: { lat: null, lng: null },
};

const STEPS = [
  {
    id: 1,
    title: "نوع و مشخصات فضا",
    description: "نوع آگهی، دسته‌بندی، عنوان و شهر",
  },
  {
    id: 2,
    title: "تصویر آگهی",
    description: "افزودن تصویر فضای موردنظر",
  },
  {
    id: 3,
    title: "اطلاعات نهایی",
    description: "قیمت، تماس و توضیحات",
  },
];

const SPACE_CATEGORIES = [
  {
    value: "parking",
    label: "پارکینگ",
    icon: "🚘",
  },
  {
    value: "residential",
    label: "مسکونی",
    icon: "🏠",
  },
  {
    value: "villa",
    label: "ویلا",
    icon: "🏡",
  },
  {
    value: "storage",
    label: "انبار",
    icon: "📦",
  },
  {
    value: "warehouse",
    label: "سوله",
    icon: "🏭",
  },
  {
    value: "shop",
    label: "مغازه",
    icon: "🏪",
  },
  {
    value: "garden",
    label: "باغ",
    icon: "🌳",
  },
  {
    value: "land",
    label: "زمین",
    icon: "🌱",
  },
  {
    value: "other",
    label: "سایر فضاها",
    icon: "✨",
  },
];

const PRICE_TYPES = [
  { value: "daily", label: "روزانه / شبانه" },
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهانه" },
  { value: "yearly", label: "سالانه" },
  { value: "negotiable", label: "توافقی" },
];

function formatPriceInput(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}


function AddParking() {
  const navigate = useNavigate();

  // The title field sits below the first screen; avoid focusing it on mount.
  // React Router may also preserve the previous page's scroll position.
  // Reset only when entering this form, without altering in-form scrolling.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [form, setForm] = useState(INITIAL_FORM);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const publishingRef = useRef(false);
  const [errors, setErrors] = useState({});

  const isWantedAd = form.listingType === "wanted";
  const visibleSteps = isWantedAd ? STEPS.filter((step) => step.id !== 2) : STEPS;
  const displayedStep = isWantedAd && currentStep === 3 ? 2 : currentStep;
  const progress = (displayedStep / visibleSteps.length) * 100;

  const selectedCategory = useMemo(() => {
    return SPACE_CATEGORIES.find(
      (item) => item.value === form.category
    );
  }, [form.category]);

  const spaceLabel =
    form.category === "other"
      ? form.customCategory.trim() ||
        "فضای دیگر"
      : selectedCategory?.label ||
        "فضا";

  const listingTypeLabel = isWantedAd
    ? "دنبال فضا هستم"
    : "فضا برای اجاره دارم";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === "price" ? formatPriceInput(value) : value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  };

  const handleImageUpload = (imageUrls) => {
    const nextImages = Array.isArray(imageUrls) ? imageUrls : [];
    setForm((currentForm) => ({
      ...currentForm,
      imageUrls: nextImages,
      imageUrl:
        currentForm.imageUrl && nextImages.includes(currentForm.imageUrl)
          ? currentForm.imageUrl
          : nextImages[0] || "",
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      imageUrl: "",
    }));
  };

  const handleMainImageChange = (url) => {
    setForm((currentForm) => ({
      ...currentForm,
      imageUrl: url || "",
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!isWantedAd && form.category === "parking") {
        const error = validateParkingOffer(form.parkingOffer);
        if (error) newErrors.parkingOffer = error;
        if (!form.area || Number(form.area) <= 0) newErrors.area = "متراژ واقعی پارکینگ را وارد کنید.";
      }
      if (!isWantedAd && form.category === "storage") {
        const error = validateStorageOffer(form.storageOffer);
        if (error) newErrors.storageOffer = error;
        if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) newErrors.area = "متراژ واقعی انبار را وارد کنید.";
      }
      if (!isWantedAd && form.category === "warehouse") {
        const error = validateIndustrialOffer(form.industrialOffer);
        if (error) newErrors.industrialOffer = error;
        if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) newErrors.area = "متراژ واقعی سوله یا کارگاه را وارد کنید.";
      }
      if (!isWantedAd && form.category === "land") {
        const error = validateLandOffer(form.landOffer);
        if (error) newErrors.landOffer = error;
        if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) newErrors.area = "مساحت واقعی زمین را وارد کنید.";
      }
      if (!isWantedAd && form.category === "garden") {
        const error=validateGardenOffer(form.gardenOffer);
        if(error)newErrors.gardenOffer=error;
        if(!form.area||!Number.isFinite(Number(form.area))||Number(form.area)<=0)newErrors.area="مساحت واقعی باغ را وارد کنید.";
      }
      if (!isWantedAd && form.category === "shop") {
        const error = validateShopOffer(form.shopOffer);
        if (error) newErrors.shopOffer = error;
        if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) newErrors.area = "متراژ واقعی مغازه را وارد کنید.";
      }
      if (!isWantedAd && form.category === "residential") {
        const err = validateResidentialOffer(form.residentialOffer, form.residentialDetails, form.area);
        if (err) newErrors.residentialOffer = err;
        if (!form.area || Number(form.area) <= 0) newErrors.area = "متراژ واقعی ملک مسکونی را وارد کنید.";
      }
      if (isWantedAd && form.category === "residential") { const err = validateResidentialRequest(form.residentialRequest); if (err) newErrors.residentialRequest = err; }
      if (isWantedAd && form.category === "villa") { const err = validateVillaRequest(form.villaRequest); if (err) newErrors.villaRequest = err; }
      if (isWantedAd && form.category === "garden") { const err = validateGardenRequest(form.gardenRequest); if (err) newErrors.gardenRequest = err; }
      if (isWantedAd && form.category === "other") { const err = validateOtherRequest(form.otherRequest); if (err) newErrors.otherRequest = err; }
      if (isWantedAd && form.category === "land") { const err = landRentalValidation(form.landRental,isWantedAd); if (err) newErrors.landRental = err; }
      if (isWantedAd && form.category === "shop") { const err = shopRequestValidation(form.shopRequest); if (err) newErrors.shopRequest = err; }
      if (isWantedAd && form.category === "warehouse") {
        const shedError = shedRequestValidation(form.shedRequest);
        if (shedError) newErrors.shedRequest = shedError;
      }
      if (isWantedAd && form.category === "storage") {
        const warehouseError = warehouseRequestValidation(form.warehouseRequest);
        if (warehouseError) newErrors.warehouseRequest = warehouseError;
      }
      if (isWantedAd && form.category === "parking") {
        if (!form.parkingRequestUsage) newErrors.parkingRequestUsage = "کاربری موردنظر را انتخاب کنید.";
        else if (form.parkingRequestUsage === "other" && form.parkingOtherUsage.trim().length < 5) newErrors.parkingRequestUsage = "برای سایر کاربری‌ها حداقل ۵ حرف توضیح بنویسید.";
        const detailsError = parkingRequestDetailsValidation(form.parkingRequestDetails);
        if (detailsError) newErrors.parkingRequestDetails = detailsError;
      }
      if (
        form.category === "other" &&
        (!form.customCategory.trim() || (isWantedAd && form.customCategory.trim().length < 3))
      ) {
        newErrors.customCategory =
          "نوع فضای موردنظر را وارد کنید.";
      }

      if (!form.title.trim()) {
        newErrors.title =
          "عنوان آگهی را وارد کنید.";
      }

      if (!form.city.trim()) {
        newErrors.city =
          "شهر موردنظر را وارد کنید.";
      }

      if (
        form.area &&
        Number(form.area) <= 0
      ) {
        newErrors.area =
          "متراژ باید بیشتر از صفر باشد.";
      }
    }

    if (step === 2) {
      if (
        !isWantedAd &&
        !form.imageUrl
      ) {
        newErrors.imageUrl =
          "برای آگهی فضای قابل اجاره یک تصویر انتخاب کنید.";
      }
    }

    if (step === 3) {
      if (!isWantedAd && form.category === "garden") {
        const err=validateGardenFinancialRent(form.gardenOffer,form.price,form.priceType);
        if(err)newErrors.price=err;
      }
      if (form.category === "residential") {
        if (!isWantedAd && !String(form.residentialDetails?.deposit || "").trim() &&
            !String(form.residentialDetails?.monthlyRent || "").trim()) {
          newErrors.price = "حداقل مبلغ رهن یا اجاره را وارد کنید.";
        }
      } else if (!(isWantedAd && ["land", "shop", "villa", "garden", "other"].includes(form.category)) && !(!isWantedAd && ["shop", "garden"].includes(form.category)) && form.priceType !== "negotiable" && !form.price.trim()) {
        newErrors.price = isWantedAd ? "سقف بودجه موردنظرت را وارد کن." : "قیمت را وارد کنید.";
      }

      if (!form.phone.trim()) {
        newErrors.phone =
          "شماره تماس را وارد کنید.";
      } else if (
        !/^09\d{9}$/.test(
          form.phone.replace(/\s/g, "")
        )
      ) {
        newErrors.phone =
          "شماره موبایل معتبر وارد کنید.";
      }

      if (
        !(["parking", "storage", "warehouse", "land", "shop", "garden", "residential"].includes(form.category) && !isWantedAd) && !(isWantedAd && ["storage", "warehouse", "parking", "shop", "land", "residential", "villa", "garden", "other"].includes(form.category)) && form.description.trim().length <
        10
      ) {
        newErrors.description =
          "توضیحات باید حداقل ۱۰ کاراکتر باشد.";
      }
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  const goToNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((step) =>
      isWantedAd && step === 1 ? 3 : Math.min(step + 1, STEPS.length)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goToPreviousStep = () => {
    setErrors({});

    setCurrentStep((step) =>
      isWantedAd && step === 3 ? 1 : Math.max(step - 1, 1)
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const goToStep = (step) => {
    if (step >= currentStep) {
      return;
    }

    setErrors({});
    setCurrentStep(step);
  };

  // Publishing is deliberately disconnected from the form submit event.
  // Only the final-step Publish button can call this function.
  const saveParking = async () => {
    if (currentStep !== STEPS.length || publishingRef.current || loading) return;

    if (isWantedAd && ["residential", "villa", "garden", "other"].includes(form.category) && !validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(3)) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      showInSiteAlert("نشست حساب کاربری پیدا نشد. لطفاً یک‌بار دوباره وارد حساب شوید.");

      navigate("/login");
      return;
    }

    publishingRef.current = true;
    setLoading(true);

    try {
      await createSpace({
          listingType:
            form.listingType,

          category:
            form.category,

          customCategory:
            form.category === "other"
              ? form.customCategory.trim()
              : "",

          categoryLabel:
            spaceLabel,

          status: "active",

          title: form.title.trim(),
          city: form.city.trim(),

          area: isWantedAd && form.category === "land" ? Number(form.landRental.minArea || form.landRental.maxArea || 0) * (form.landRental.areaUnit === "hectare" ? 10000 : 1)
            : isWantedAd && form.category === "shop"
            ? Number(form.shopRequest.minArea || form.shopRequest.maxArea || 0)
            : isWantedAd && form.category === "parking"
            ? Number(form.parkingRequestDetails.minArea || form.parkingRequestDetails.maxArea || 0)
            : isWantedAd && form.category === "warehouse"
            ? Number(form.shedRequest.minArea || form.shedRequest.maxArea || 0)
            : isWantedAd && form.category === "storage"
            ? Number(form.warehouseRequest.minArea || form.warehouseRequest.maxArea || 0)
            : isWantedAd && form.category === "residential"
            ? Number(form.residentialRequest.minArea || form.residentialRequest.maxArea || 0)
            : isWantedAd && form.category === "villa"
            ? Number(form.villaRequest.minArea || form.villaRequest.maxArea || 0)
            : isWantedAd && form.category === "garden"
            ? Number(form.gardenRequest.minArea || form.gardenRequest.maxArea || 0)
            : isWantedAd && form.category === "other"
            ? Number(form.otherRequest.minArea || form.otherRequest.maxArea || 0)
            : form.area ? Number(form.area) : 0,

          price:
            isWantedAd && form.category === "land" ? "" : isWantedAd && form.category === "shop" ? "" : !isWantedAd && form.category === "shop" ? shopListingPrice(form.shopOffer).price : !isWantedAd && form.category === "garden" ? gardenListingPrice(form.gardenOffer,form.price,form.priceType).price : isWantedAd && form.category === "villa" ? String(form.villaRequest.maxBudget || "") : isWantedAd && form.category === "garden" ? String(form.gardenRequest.pricePeriod === "negotiable" ? "" : form.gardenRequest.maxBudget || "") : isWantedAd && form.category === "other" ? String(form.otherRequest.pricePeriod === "negotiable" ? "" : form.otherRequest.maxBudget || "") : !isWantedAd && form.category === "residential" ? residentialListingPrice(form.residentialOffer,form.residentialDetails).price : form.category === "residential"
              ? String(
                  isWantedAd ? (residentialRequestLegacyDetails(form.residentialRequest).monthlyRent || residentialRequestLegacyDetails(form.residentialRequest).deposit || "")
                    : (form.residentialDetails?.monthlyRent || form.residentialDetails?.deposit || "")
                )
              : form.priceType === "negotiable" ? "" : form.price.replace(/,/g, "").trim(),

          priceType:
            isWantedAd && form.category === "land" ? "negotiable" : isWantedAd && form.category === "shop" ? "negotiable" : !isWantedAd && form.category === "shop" ? shopListingPrice(form.shopOffer).priceType : !isWantedAd && form.category === "garden" ? gardenListingPrice(form.gardenOffer,form.price,form.priceType).priceType : isWantedAd && form.category === "villa" ? form.villaRequest.pricePeriod : isWantedAd && form.category === "garden" ? form.gardenRequest.pricePeriod : isWantedAd && form.category === "other" ? form.otherRequest.pricePeriod : !isWantedAd && form.category === "residential" ? residentialListingPrice(form.residentialOffer,form.residentialDetails).priceType : form.category === "residential"
              ? "monthly"
              : form.priceType,
          residentialDetails:
            form.category === "residential"
              ? (isWantedAd ? residentialRequestLegacyDetails(form.residentialRequest) : form.residentialDetails)
              : {},
          gardenDetails: form.category === "garden" && !isWantedAd ? form.gardenDetails : {},
          spaceAttributes: !isWantedAd && form.category === "parking" ? makeParkingAttributes(form.parkingOffer) : !isWantedAd && form.category === "storage" ? makeStorageAttributes(form.storageOffer) : !isWantedAd && form.category === "warehouse" ? makeIndustrialAttributes(form.industrialOffer) : !isWantedAd && form.category === "land" ? makeLandAttributes(form.landOffer) : !isWantedAd && form.category === "shop" ? makeShopAttributes(form.shopOffer) : !isWantedAd && form.category === "garden" ? makeGardenAttributes(form.gardenOffer) : !isWantedAd && form.category === "residential" ? makeResidentialAttributes(form.residentialOffer,form.residentialDetails) : null,
          shopDetails: form.category === "shop" ? form.shopDetails : {},
          villaDetails:
            form.category === "villa" && !isWantedAd
              ? form.villaDetails
              : {},
          phone: form.phone
            .replace(/\s/g, "")
            .trim(),

          imageUrl: isWantedAd && ["storage", "warehouse", "shop", "land", "residential", "villa", "garden", "other"].includes(form.category) ? "" : form.imageUrl,
          imageUrls: isWantedAd && ["storage", "warehouse", "shop", "land", "residential", "villa", "garden", "other"].includes(form.category) ? [] : form.imageUrls,
          video: isWantedAd && ["storage", "warehouse", "shop", "land", "residential", "villa", "garden", "other"].includes(form.category) ? null : form.video,

          description:
            isWantedAd && form.category === "residential" ? writeResidentialRequest(form.residentialRequest) :
            isWantedAd && form.category === "villa" ? writeVillaRequest(form.villaRequest) :
            isWantedAd && form.category === "garden" ? writeGardenRequest(form.gardenRequest) :
            isWantedAd && form.category === "other" ? writeOtherRequest(form.otherRequest) :
            isWantedAd && form.category === "land" ? writeLandRental(form.landRental, isWantedAd ? "" : form.description) :
            isWantedAd && form.category === "shop" ? writeShopRequest(form.shopRequest) :
            isWantedAd && form.category === "parking"
              ? writeParkingRequestDetails(form.parkingRequestDetails, form.parkingRequestUsage, form.parkingOtherUsage)
              : isWantedAd && form.category === "warehouse"
                ? writeShedRequest("", form.shedRequest)
              : isWantedAd && form.category === "storage"
                ? writeWarehouseRequest("", form.warehouseRequest)
                : form.description.trim(),

          agencyNetworkConsent: Boolean(form.agencyNetworkConsent),
          location: form.location,

        });

      showInSiteAlert("آگهی با موفقیت ثبت شد.", "ثبت آگهی");

      setForm(INITIAL_FORM);
      setErrors({});
      setCurrentStep(1);

      navigate("/parking");
    } catch (error) {
      console.error(error);

      showInSiteAlert("خطا در ثبت آگهی. دوباره تلاش کنید.", "ثبت آگهی");
    } finally {
      publishingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <main className="add-parking-page">
      <div className="add-parking-background">
        <span className="add-parking-orb add-parking-orb--one" />
        <span className="add-parking-orb add-parking-orb--two" />
        <span className="add-parking-orb add-parking-orb--three" />
      </div>

      <section className="add-parking-hero">
        <div className="container">
          <button
            type="button"
            className="add-parking-back"
            onClick={() =>
              navigate("/parking")
            }
          >
            <span>→</span>
            بازگشت به آگهی‌ها
          </button>

          <div className="add-parking-hero__content">
            <div>
              <span className="add-parking-eyebrow">
                ثبت آگهی جدید
              </span>

              <h1>
                فضای مناسب را در فضاجو
                پیدا کن یا معرفی کن
              </h1>

              <p>
                چه فضایی برای اجاره داشته باشی و چه دنبال فضای مناسب باشی،
                {isWantedAd ? "نیاز و بودجه‌ات را در دو مرحله کوتاه ثبت کن." : "اطلاعات را در سه مرحله کوتاه وارد کن و آگهی خودت را منتشر کن."}
              </p>
            </div>

            <div className="add-parking-hero__badge">
              <span>{isWantedAd ? "۲" : "۳"}</span>

              <div>
                <strong>
                  مرحله کوتاه
                </strong>

                <small>
                  تا انتشار آگهی
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="add-parking-content">
        <div className="container">
          <div className="add-parking-layout">
            <aside className="add-parking-sidebar">
              <div className="add-parking-progress-card">
                <div className="add-parking-progress-card__heading">
                  <div>
                    <span>
                      پیشرفت ثبت آگهی
                    </span>

                    <strong>
                      مرحله {displayedStep} از{" "}
                      {visibleSteps.length}
                    </strong>
                  </div>

                  <span className="add-parking-progress-card__percent">
                    {Math.round(progress)}٪
                  </span>
                </div>

                <div className="add-parking-progress">
                  <span
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="add-parking-steps">
                  {visibleSteps.map((step) => {
                    const isActive =
                      step.id === currentStep;

                    const isCompleted =
                      step.id < currentStep;

                    return (
                      <button
                        type="button"
                        key={step.id}
                        onClick={() =>
                          goToStep(step.id)
                        }
                        className={[
                          "add-parking-step",
                          isActive
                            ? "add-parking-step--active"
                            : "",
                          isCompleted
                            ? "add-parking-step--completed"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="add-parking-step__number">
                          {isCompleted
                            ? "✓"
                            : isWantedAd && step.id === 3 ? 2 : step.id}
                        </span>

                        <span className="add-parking-step__text">
                          <strong>
                            {isWantedAd && step.id === 3 ? "بودجه و راه ارتباط" : step.title}
                          </strong>

                          <small>
                            {isWantedAd && step.id === 3 ? "سقف بودجه، تماس و شرایط موردنیاز" : !isWantedAd && ["parking", "storage"].includes(form.category) && step.id === 3 ? "قیمت و راه ارتباطی" : step.description}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="add-parking-tip">
                <span className="add-parking-tip__icon">
                  ✦
                </span>

                <div>
                  <strong>
                    {isWantedAd ? "درخواست دقیق‌تر، نتیجه بهتر" : "آگهی کامل‌تر، بازدید بیشتر"}
                  </strong>

                  <p>
                    {isWantedAd
                      ? "شهر، محدوده مطلوب، سقف بودجه و شرایط ضروری را دقیق بنویس تا پیشنهادهای مناسب‌تری دریافت کنی."
                      : form.category === "parking" ? "تصویر واضح و مشخصات واقعی، اعتماد و کیفیت جست‌وجوی آگهی را بهتر می‌کند." : "تصویر واضح، عنوان دقیق و توضیحات کامل باعث اعتماد بیشتر کاربران می‌شود."}
                  </p>
                </div>
              </div>
            </aside>

            <div className="add-parking-form-card">
              <form
                onSubmit={(event) => event.preventDefault()}
                noValidate
              >
                <div className="add-parking-form-header">
                  <span className="add-parking-form-header__step">
                    مرحله {displayedStep}
                  </span>

                  <h2>
                    {
                      STEPS[currentStep - 1]
                        .title
                    }
                  </h2>

                  <p>
                    {
                      STEPS[currentStep - 1]
                        .description
                    }
                  </p>
                </div>

                {currentStep === 1 && (
                  <div className="add-parking-step-content add-parking-step-content--details">
                    <div className="add-parking-intro">
                      <span>
                        {selectedCategory?.icon || "✨"}
                      </span>

                      <div>
                        <strong>
                          نوع آگهی و فضای موردنظر
                        </strong>

                        <p>
                          اول مشخص کن فضا برای اجاره داری یا دنبال اجاره فضا هستی،
                          سپس نوع فضا را انتخاب کن.
                        </p>
                      </div>
                    </div>

                    <div className="add-parking-field">
                      <label>
                        نوع آگهی
                        <span>*</span>
                      </label>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(2, minmax(0, 1fr))",
                          gap: "9px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              listingType: "offer",
                            }))
                          }
                          disabled={loading}
                          style={{
                            minHeight: "48px",
                            padding: "8px 12px",
                            borderRadius: "16px",
                            border:
                              form.listingType === "offer"
                                ? "2px solid #f47a1f"
                                : "1px solid #eadfd7",
                            background:
                              form.listingType === "offer"
                                ? "#fff4ea"
                                : "white",
                            color: "#342d29",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: "900",
                          }}
                        >
                          🏠 فضا برای اجاره دارم
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              listingType: "wanted",
                            }))
                          }
                          disabled={loading}
                          style={{
                            minHeight: "48px",
                            padding: "8px 12px",
                            borderRadius: "16px",
                            border:
                              form.listingType === "wanted"
                                ? "2px solid #f47a1f"
                                : "1px solid #eadfd7",
                            background:
                              form.listingType === "wanted"
                                ? "#fff4ea"
                                : "white",
                            color: "#342d29",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: "900",
                          }}
                        >
                          🔎 دنبال فضا برای اجاره هستم
                        </button>
                      </div>
                    </div>

                    <div className="add-parking-field">
                      <label>
                        نوع فضا
                        <span>*</span>
                      </label>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "8px",
                        }}
                      >
                        {SPACE_CATEGORIES.map((category) => {
                          const isSelected =
                            form.category === category.value;

                          return (
                            <button
                              type="button"
                              key={category.value}
                              disabled={loading}
                              onClick={() => {
                                setForm((currentForm) => ({
                                  ...currentForm,
                                  category: category.value,
                                  customCategory:
                                    category.value === "other"
                                      ? currentForm.customCategory
                                      : "",
                                  priceType:
                                    category.value === "villa"
                                      ? "daily"
                                      : currentForm.category === "villa"
                                        ? "monthly"
                                        : currentForm.priceType,
                                }));

                                setErrors((currentErrors) => ({
                                  ...currentErrors,
                                  customCategory: "",
                                }));
                              }}
                              style={{
                                height: "44px",
                                minHeight: "44px",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "3px 7px",
                                borderRadius: "15px",
                                border: isSelected
                                  ? "2px solid #f47a1f"
                                  : "1px solid #eadfd7",
                                background: isSelected
                                  ? "#fff4ea"
                                  : "white",
                                color: "#342d29",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontWeight: "900",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "1rem",
                                  lineHeight: 1,
                                }}
                              >
                                {category.icon}
                              </span>

                              {category.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isWantedAd && !["storage", "warehouse", "parking", "shop", "land", "residential", "villa", "garden", "other"].includes(form.category) && (
                      <div className="add-parking-field" style={{ gridColumn: "1 / -1", padding: "14px 16px", border: "1px solid #f3d7c2", borderRadius: "14px", background: "#fff8f2", lineHeight: 1.9 }}>
                        <strong style={{ color: "#a94c0c" }}>
                          {form.category === "parking" ? "پارکینگ موردنیازت را ساده و دقیق معرفی کن" : "فضایی را که لازم داری توصیف کن"}
                        </strong>
                        <p style={{ margin: "4px 0 0" }}>
                          {form.category === "parking"
                            ? "کاربری موردنظر را انتخاب کن؛ بعد شهر، متراژ و محدوده دلخواه را بنویس. اگر مسقف بودن، ساعت دسترسی یا شرایط خاصی مهم است، در توضیحات ذکر کن."
                            : "شهر، متراژ تقریبی و نیازهای اصلی‌ات را مشخص کن. فقط شرایطی را بنویس که واقعاً برای انتخاب فضای مناسب اهمیت دارند."}
                        </p>
                        <small style={{ color: "#8c6854" }}>لازم نیست مشخصات یک ملک موجود را بدانی؛ فقط نیاز خودت را شرح بده.</small>
                      </div>
                    )}

                    {form.category === "parking" && !isWantedAd && (
                      <ParkingOfferFields value={form.parkingOffer} note={form.description} disabled={loading} error={errors.parkingOffer}
                        onNoteChange={(description) => setForm(current => ({ ...current, description }))}
                        onChange={(parkingOffer) => { setForm(current=>({...current,parkingOffer})); setErrors(current=>({...current,parkingOffer:""})); }} />
                    )}
                    {form.category === "storage" && !isWantedAd && (
                      <StorageOfferFields value={form.storageOffer} note={form.description} disabled={loading} error={errors.storageOffer}
                        onNoteChange={(description) => setForm(current => ({ ...current, description }))}
                        onChange={(storageOffer) => { setForm(current=>({...current,storageOffer})); setErrors(current=>({...current,storageOffer:""})); }} />
                    )}
                    {form.category === "warehouse" && !isWantedAd && (
                      <IndustrialOfferFields value={form.industrialOffer} note={form.description} disabled={loading} error={errors.industrialOffer}
                        onNoteChange={(description) => setForm(current => ({ ...current, description }))}
                        onChange={(industrialOffer) => { setForm(current=>({...current,industrialOffer})); setErrors(current=>({...current,industrialOffer:""})); }} />
                    )}
                    {form.category === "land" && !isWantedAd && (
                      <LandOfferFields value={form.landOffer} note={form.description} disabled={loading} error={errors.landOffer}
                        onNoteChange={(description)=>setForm(current=>({...current,description}))}
                        onChange={(landOffer)=>{setForm(current=>({...current,landOffer}));setErrors(current=>({...current,landOffer:""}));}}/>
                    )}
                    {form.category === "residential" && !isWantedAd && (
                      <ResidentialFields
            value={form.residentialDetails}
            offer={form.residentialOffer}
            note={form.description}
            disabled={loading}
            error={errors.residentialOffer}
            onNoteChange={(description) => setForm((current) => ({...current, description}))}
            onOfferChange={(residentialOffer) => { setForm((current) => ({...current, residentialOffer})); setErrors((current) => ({...current, residentialOffer: ""})); }}
            onChange={(residentialDetails) => { setForm((current) => ({...current, residentialDetails})); setErrors((current) => ({...current, residentialOffer: ""})); }}
          />
                    )}

                    {form.category === "villa" && !isWantedAd && (
                      <VillaFields
                        value={form.villaDetails}
                        disabled={loading}
                        onChange={(villaDetails) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            villaDetails,
                          }))
                        }
                      />
                    )}

                    {form.category === "shop" && !isWantedAd && <ShopOfferFields value={form.shopOffer} details={form.shopDetails} note={form.description} disabled={loading} error={errors.shopOffer}
                      onNoteChange={description=>setForm(current=>({...current,description}))}
                      onDetailsChange={shopDetails=>setForm(current=>({...current,shopDetails}))}
                      onChange={shopOffer=>{setForm(current=>({...current,shopOffer}));setErrors(current=>({...current,shopOffer:""}));}}/>}

                    {form.category === "garden" && !isWantedAd && <GardenOfferFields value={form.gardenOffer} details={form.gardenDetails} note={form.description} disabled={loading} error={errors.gardenOffer}
                      onNoteChange={description=>setForm(current=>({...current,description}))}
                      onDetailsChange={gardenDetails=>setForm(current=>({...current,gardenDetails}))}
                      onChange={gardenOffer=>{setForm(current=>({...current,gardenOffer,...(gardenOffer.financialMode==="full_deposit"?{price:"",priceType:"negotiable"}:current.gardenOffer.financialMode==="full_deposit"?{priceType:"monthly"}:{})}));setErrors(current=>({...current,gardenOffer:"",price:""}));}}/>}

                    {form.category === "other" && (
                      <div className="add-parking-field">
                        <label htmlFor="customCategory">
                          {isWantedAd ? "نام فضای موردنیاز" : "نوع فضای دیگر"}
                          <span>*</span>
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.customCategory
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ✨
                          </span>

                          <input
                            id="customCategory"
                            name="customCategory"
                            type="text"
                            placeholder={isWantedAd ? "مثلاً استودیو، سالن تمرین، پشت‌بام یا فضای چندمنظوره" : "مثلاً حیاط، زیرزمین، اتاق کار یا محوطه باز"}
                            value={form.customCategory}
                            onChange={handleChange}
                            disabled={loading}
                            maxLength={50}
                          />
                        </div>

                        {errors.customCategory && (
                          <span className="add-parking-error">
                            {errors.customCategory}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="add-parking-field">
                      <label htmlFor="title">
                        عنوان آگهی
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "add-parking-input",
                          errors.title
                            ? "add-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="add-parking-input__icon">
                          ✎
                        </span>

                        <input
                          id="title"
                          name="title"
                          type="text"
                          placeholder={
                            isWantedAd
                              ? `مثلاً دنبال ${spaceLabel} در مرکز شهر هستم`
                              : `مثلاً ${spaceLabel} مناسب در مرکز شهر`
                          }
                          value={form.title}
                          onChange={handleChange}
                          disabled={loading}
                          maxLength={80}
                        />
                      </div>

                      <div className="add-parking-field__meta">
                        {errors.title ? (
                          <span className="add-parking-error">
                            {errors.title}
                          </span>
                        ) : (
                          <span>
                            عنوانی کوتاه و
                            واضح انتخاب کن.
                          </span>
                        )}

                        <span>
                          {form.title.length}
                          /۸۰
                        </span>
                      </div>
                    </div>

                    <div className="add-parking-fields-grid">
                      <div className="add-parking-field">
                        <label htmlFor="city">
                          شهر
                          <span>*</span>
                        </label>

                        <IranCityAutocomplete
                          value={form.city}
                          onChange={handleChange}
                          disabled={loading}
                          error={Boolean(errors.city)}
                        />

                        {errors.city && (
                          <span className="add-parking-error">
                            {errors.city}
                          </span>
                        )}
                      </div>

                      {!((isWantedAd && form.category === "land") || (isWantedAd && ["storage", "warehouse", "parking", "shop", "residential", "villa", "garden", "other"].includes(form.category))) && (
                      <div className="add-parking-field">
                        <label htmlFor="area">
                          {!isWantedAd && form.category === "storage" ? "متراژ واقعی انبار" : !isWantedAd && form.category === "warehouse" ? "متراژ واقعی سوله یا کارگاه" : !isWantedAd && form.category === "land" ? "مساحت واقعی زمین (مترمربع)" : "متراژ"}
                          {!isWantedAd && ["storage", "warehouse", "land"].includes(form.category) && <span>*</span>}
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.area
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ↔
                          </span>

                          <input
                            id="area"
                            name="area"
                            type="number"
                            min="1"
                            placeholder="مثلاً ۱۵"
                            value={form.area}
                            onChange={
                              handleChange
                            }
                            disabled={loading}
                          />

                          <span className="add-parking-input__suffix">
                            متر
                          </span>
                        </div>

                        {errors.area && (
                          <span className="add-parking-error">
                            {errors.area}
                          </span>
                        )}
                      </div>
                      )}
                    </div>

                    {isWantedAd && form.category === "parking" && (
                      <>
                        <div className="add-parking-field" style={{ gridColumn: "1 / -1", padding: "14px 16px", border: "1px solid #f3d7c2", borderRadius: 14, background: "#fff8f2", lineHeight: 1.9 }}>
                          <strong style={{ color: "#a94c0c" }}>پارکینگ موردنیازت را معرفی کن</strong>
                          <p style={{ margin: "4px 0 0" }}>کاربری، محدوده متراژ، مسقف یا روباز بودن و دسترسی را مشخص کن. شرایط خاص اختیاری است.</p>
                        </div>
                        {isWantedAd && form.category === "parking" && (
                      <ParkingRequestUsageFields
                        usage={form.parkingRequestUsage}
                        otherUsage={form.parkingOtherUsage}
                        disabled={loading}
                        error={errors.parkingRequestUsage}
                        onChange={({ usage, otherUsage }) => {
                          setForm((current) => ({ ...current, parkingRequestUsage: usage, parkingOtherUsage: otherUsage }));
                          setErrors((current) => ({ ...current, parkingRequestUsage: "" }));
                        }}
                      />
                    )}
                        <ParkingRequestDetailsFields value={form.parkingRequestDetails} disabled={loading} error={errors.parkingRequestDetails} onChange={(parkingRequestDetails) => { setForm(current => ({ ...current, parkingRequestDetails })); setErrors(current => ({ ...current, parkingRequestDetails: "" })); }} />
                      </>
                    )}

                    {isWantedAd && form.category === "other" && (
                      <OtherRequestFields value={form.otherRequest} disabled={loading} error={errors.otherRequest}
                        onChange={(otherRequest) => { setForm((current) => ({ ...current, otherRequest })); setErrors((current) => ({ ...current, otherRequest: "" })); }} />
                    )}
                    {isWantedAd && form.category === "garden" && (
                      <GardenRequestFields value={form.gardenRequest} disabled={loading} error={errors.gardenRequest}
                        onChange={(gardenRequest) => { setForm((current) => ({ ...current, gardenRequest })); setErrors((current) => ({ ...current, gardenRequest: "" })); }} />
                    )}
                    {isWantedAd && form.category === "villa" && (
                      <VillaRequestFields value={form.villaRequest} disabled={loading} error={errors.villaRequest}
                        onChange={(villaRequest) => { setForm((current) => ({ ...current, villaRequest })); setErrors((current) => ({ ...current, villaRequest: "" })); }} />
                    )}
                    {isWantedAd && form.category === "residential" && (
                      <ResidentialRequestFields value={form.residentialRequest} disabled={loading} error={errors.residentialRequest} onChange={(residentialRequest) => { setForm((current) => ({ ...current, residentialRequest })); setErrors((current) => ({ ...current, residentialRequest: "" })); }} />
                    )}
                    {isWantedAd && form.category === "land" && (<><LandRentalFields wanted={isWantedAd} value={form.landRental} disabled={loading} error={errors.landRental} onChange={landRental=>{setForm(current=>({...current,landRental}));setErrors(current=>({...current,landRental:""}));}}/></>)}
                    {isWantedAd && form.category === "shop" && (<>
                      <div className="add-parking-field" style={{gridColumn:"1 / -1",padding:"14px 16px",border:"1px solid #f3d7c2",borderRadius:14,background:"#fff8f2"}}><strong style={{color:"#a94c0c"}}>فضای تجاری موردنیازت را معرفی کن</strong><p>نوع مغازه، موقعیت، طبقه، فعالیت و شرایط مالی موردنظرت را مشخص کن. شرایط خاص اختیاری است.</p></div>
                      <ShopRequestFields value={form.shopRequest} disabled={loading} error={errors.shopRequest} onChange={shopRequest=>{setForm(current=>({...current,shopRequest}));setErrors(current=>({...current,shopRequest:""}));}}/>
                    </>)}
                    {isWantedAd && form.category === "storage" && (
                      <>
                        <div className="add-parking-field" style={{ gridColumn: "1 / -1", padding: "14px 16px", border: "1px solid #f3d7c2", borderRadius: "14px", background: "#fff8f2", lineHeight: 1.9 }}>
                          <strong style={{ color: "#a94c0c" }}>فضایی را که لازم داری توصیف کن</strong>
                          <p style={{ margin: "4px 0 0" }}>در ادامه نوع کاربری، فضای مطلوب، حداقل و حداکثر متراژ، دسترسی، امکانات ضروری و شرایط خاص را مشخص کن.</p>
                          <small style={{ color: "#8c6854" }}>تنها نیازهای واقعی‌ات را انتخاب کن؛ بخش «شرایط خاص» برای توضیح‌های تکمیلی اختیاری است.</small>
                        </div>
                        <WarehouseRequestFields value={form.warehouseRequest} disabled={loading} error={errors.warehouseRequest} onChange={(warehouseRequest) => { setForm(current => ({ ...current, warehouseRequest })); setErrors(current => ({ ...current, warehouseRequest: "" })); }} />
                      </>
                    )}

                    {isWantedAd && form.category === "warehouse" && (
                      <>
                        <div className="add-parking-field" style={{ gridColumn: "1 / -1", padding: "14px 16px", border: "1px solid #f3d7c2", borderRadius: 14, background: "#fff8f2", lineHeight: 1.9 }}>
                          <strong style={{ color: "#a94c0c" }}>سوله یا کارگاهی را که لازم داری معرفی کن</strong>
                          <p style={{ margin: "4px 0 0" }}>ابتدا سوله صنعتی یا کارگاه را انتخاب کن؛ سپس فعالیت، متراژ، ارتفاع، زیرساخت‌ها و دسترسی ضروری را مشخص کن.</p>
                          <small style={{ color: "#8c6854" }}>فقط نیازهای مهم را وارد کن؛ شرایط خاص اختیاری است.</small>
                        </div>
                        <ShedRequestFields value={form.shedRequest} disabled={loading} error={errors.shedRequest} onChange={(shedRequest) => { setForm(current => ({ ...current, shedRequest })); setErrors(current => ({ ...current, shedRequest: "" })); }} />
                      </>
                    )}

                    <NeshanLocationPicker
                      value={form.location}
                      city={form.city}
                      disabled={loading}
                      onChange={(location) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          location,
                        }))
                      }
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="add-parking-step-content">
                    <div className="add-parking-intro add-parking-intro--image">
                      <span>▧</span>

                      <div>
                        <strong>
                          {isWantedAd
                            ? "عکس‌های آگهی (اختیاری)"
                            : "عکس‌های فضا"}
                        </strong>

                        <p>
                          {isWantedAd
                            ? "اگر تصویر یا نمونه‌ای از فضای مدنظرت داری می‌توانی اضافه کنی؛ برای آگهی درخواست، تصویر اجباری نیست."
                            : `تا ۱۰ عکس روشن، واضح و واقعی از ${spaceLabel} انتخاب کن.`}
                        </p>
                      </div>
                    </div>

                    <div
                      className={[
                        "add-parking-uploader",
                        errors.imageUrl
                          ? "add-parking-uploader--error"
                          : "",
                        form.imageUrl
                          ? "add-parking-uploader--completed"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <ImageUploader
                        imageUrls={form.imageUrls}
                        mainImageUrl={form.imageUrl}
                        maxImages={10}
                        onUploadComplete={handleImageUpload}
                        onMainImageChange={handleMainImageChange}
                      />
                    </div>

                    {errors.imageUrl && (
                      <span className="add-parking-error add-parking-error--block">
                        {errors.imageUrl}
                      </span>
                    )}

                    {form.imageUrl && (
                      <div className="add-parking-upload-success">
                        <span>✓</span>

                        <div>
                          <strong>
                            {form.imageUrls.length.toLocaleString("fa-IR")} عکس آماده است
                          </strong>

                          <p>
                            عکس دارای برچسب «عکس اصلی»، تصویر کارت آگهی است و همه عکس‌ها در صفحه جزئیات نمایش داده می‌شوند.
                          </p>
                        </div>
                      </div>
                    )}

                    {!isWantedAd && (
                      <div style={{ marginTop: "14px" }}>
                        <div className="add-parking-section-heading" style={{ marginBottom: "8px" }}>
                          <div>
                            <strong>ویدئوی کوتاه فضا (اختیاری)</strong>
                            <p>یک ویدئوی واقعی تا ۲ دقیقه اضافه کن؛ پخش خودکار ندارد و برای کنترل هزینه فقط با درخواست کاربر پخش می‌شود.</p>
                          </div>
                        </div>
                        <VideoUploader
                          video={form.video}
                          onChange={(video) => setForm((current) => ({ ...current, video }))}
                        />
                      </div>
                    )}

                    <div className="add-parking-image-guide">
                      <div>
                        <span>☀</span>

                        <strong>
                          نور مناسب
                        </strong>

                        <p>
                          تصویر روشن و واضح
                          انتخاب کن.
                        </p>
                      </div>

                      <div>
                        <span>▣</span>

                        <strong>
                          کادر کامل
                        </strong>

                        <p>
                          فضای موردنظر مشخص
                          باشد.
                        </p>
                      </div>

                      <div>
                        <span>✓</span>

                        <strong>
                          تصویر واقعی
                        </strong>

                        <p>
                          از عکس واقعی ملک
                          استفاده کن.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="add-parking-step-content add-parking-step-content--final">
                    <div className="add-parking-intro add-parking-intro--contact">
                      <span>☎</span>

                      <div>
                        <strong>
                          اطلاعات نهایی
                        </strong>

                        <p>
                          {isWantedAd
                            ? "بودجه، شماره تماس و اولویت‌های ضروری خودت را کامل کن."
                            : form.category === "residential"
                              ? "مشخصات مالی در مرحله اول ثبت شده‌اند؛ اینجا فقط اطلاعات تماس را تأیید کن."
                              : ["parking", "storage", "warehouse", "land"].includes(form.category) ? "قیمت و شماره تماس را وارد کن؛ نکات خاص را در مرحله اول می‌توانی بنویسی." : form.category === "garden" ? "شرایط مالی باغ از مرحله اول خوانده می‌شود؛ در صورت وجود اجاره، مبلغ آن را اینجا وارد کن." : form.category === "shop" ? "شرایط مالی مغازه در مرحله اول ثبت می‌شود؛ اینجا فقط شماره تماس را تأیید کن."
                              : "قیمت، شماره تماس و جزئیات آگهی را کامل کن."}
                        </p>
                      </div>
                    </div>

                    {!isWantedAd && form.category === "garden" && form.gardenOffer.financialMode === "full_deposit" && <p className="fj-go-price-note">رهن کامل باغ: {formatPriceInput(form.gardenOffer.depositRial)} ریال؛ در این آگهی اجاره‌ای ثبت نمی‌شود.</p>}
                    <div className="add-parking-fields-grid">
                      {form.category !== "residential" && !(!isWantedAd && (form.category === "shop" || (form.category === "garden" && form.gardenOffer.financialMode === "full_deposit"))) && !(isWantedAd && ["land", "shop", "villa", "garden", "other"].includes(form.category)) && (
                        <>
                      <div
                        className={`add-parking-field add-parking-field--price-combo${form.priceType === "negotiable" ? " add-parking-field--negotiable" : ""}`}
                        style={{
                          gridColumn: "1 / -1",
                          display: "grid",
                          gridTemplateColumns: form.priceType === "negotiable"
                            ? "minmax(0, 1fr)"
                            : "minmax(125px, 0.9fr) minmax(0, 1.7fr)",
                          alignItems: "start",
                          gap: "12px",
                          width: "100%",
                          minWidth: 0,
                        }}
                      >
                        <div className="add-parking-field add-parking-field--price-type" style={{ minWidth: 0, width: "100%" }}>
                          <label htmlFor="priceType">{isWantedAd ? "دوره بودجه" : form.category === "garden" ? "دوره اجاره باغ" : "نوع قیمت"} <span>*</span></label>
                          <select
                            id="priceType"
                            value={form.priceType}
                            disabled={loading}
                            style={{ width: "100%", height: "48px", minHeight: "48px", boxSizing: "border-box" }}
                            onChange={(event) => {
                              const priceType = event.target.value;
                              setForm((current) => ({
                                ...current,
                                priceType,
                                price: priceType === "negotiable" ? "" : current.price,
                              }));
                              setErrors((current) => ({ ...current, price: "" }));
                            }}
                          >
                            {(form.category === "villa"
                              ? PRICE_TYPES.filter((item) => ["daily", "negotiable"].includes(item.value))
                              : PRICE_TYPES
                            ).map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </div>
                        {form.priceType !== "negotiable" && (
                          <div className="add-parking-field add-parking-field--amount" style={{ minWidth: 0, width: "100%" }}>
                            <label htmlFor="price">{isWantedAd ? "سقف بودجه پیشنهادی" : form.category === "garden" ? "مبلغ اجاره باغ (ریال)" : "قیمت"} <span>*</span></label>
                            <div
                              className={`add-parking-input${errors.price ? " add-parking-input--error" : ""}`}
                              style={{ width: "100%", height: "48px", minHeight: "48px", boxSizing: "border-box" }}
                            >
                              <span className="add-parking-input__icon">﷼</span>
                              <input
                                id="price"
                                name="price"
                                type="text"
                                inputMode="numeric"
                                placeholder={form.category === "villa" ? "مثلاً ۵۰,۰۰۰,۰۰۰" : "مبلغ به ریال"}
                                value={form.price}
                                onChange={handleChange}
                                disabled={loading}
                                style={{ minWidth: 0, width: "100%" }}
                              />
                            </div>
                            {errors.price && <span className="add-parking-error">{errors.price}</span>}
                          </div>
                        )}
                      </div>

                        </>
                        )}
                      <div className="add-parking-field">
                        <label htmlFor="phone">
                          شماره تماس
                          <span>*</span>
                        </label>

                        <div
                          className={[
                            "add-parking-input",
                            errors.phone
                              ? "add-parking-input--error"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="add-parking-input__icon">
                            ☎
                          </span>

                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            placeholder="09123456789"
                            value={form.phone}
                            onChange={
                              handleChange
                            }
                            disabled={loading}
                            dir="ltr"
                            maxLength={11}
                          />
                        </div>

                        {errors.phone && (
                          <span className="add-parking-error">
                            {errors.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {!(["parking", "storage", "warehouse", "land", "shop", "garden", "residential"].includes(form.category) && !isWantedAd) && !(isWantedAd && ["storage", "warehouse", "parking", "shop", "land", "residential", "villa", "garden", "other"].includes(form.category)) && (
                    <div className="add-parking-field">
                      <label htmlFor="description">
                        توضیحات آگهی
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "add-parking-textarea",
                          errors.description
                            ? "add-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <textarea
                          id="description"
                          name="description"
                          placeholder={
                            isWantedAd
                              ? `درباره ${spaceLabel} موردنیازت، محدوده، متراژ، امکانات و شرایط مدنظر توضیح بده...`
                              : `درباره ${spaceLabel}، موقعیت، دسترسی، امکانات و سایر ویژگی‌ها توضیح بده...`
                          }
                          value={
                            form.description
                          }
                          onChange={
                            handleChange
                          }
                          rows={4}
                          disabled={loading}
                          maxLength={800}
                        />
                      </div>

                      <div className="add-parking-field__meta">
                        {errors.description ? (
                          <span className="add-parking-error">
                            {
                              errors.description
                            }
                          </span>
                        ) : (
                          <span>
                            جزئیاتی بنویس که
                            به تصمیم‌گیری
                            کاربران کمک کند.
                          </span>
                        )}

                        <span>
                          {
                            form.description
                              .length
                          }
                          /۸۰۰
                        </span>
                      </div>
                    </div>
                    )}

                    <label
                      className={`add-parking-network-consent add-parking-network-consent--fazajoo${form.agencyNetworkConsent ? " is-checked" : ""}`}
                      style={{
                        borderColor: form.agencyNetworkConsent ? "#1f5b48" : "rgba(31, 91, 72, 0.42)",
                        background: form.agencyNetworkConsent ? "#eaf7f0" : "#f4faf7",
                        boxShadow: "inset -4px 0 0 #1f5b48",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.agencyNetworkConsent}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            agencyNetworkConsent: event.target.checked,
                          }))
                        }
                        disabled={loading}
                      />
                      <span>
                        <strong style={{ color: "#174c3b", fontWeight: 950, fontSize: "1rem" }}>
                          کمک مشاوران فضاجو برای پیدا کردن {isWantedAd ? "فایل مناسب" : "مشتری"}
                        </strong>
                        <small>
                          {isWantedAd
                            ? "مایلم مشاوران تأییدشده فضاجو برای پیدا کردن فایل مناسب با من ارتباط بگیرند."
                            : "مایلم مشاوران تأییدشده فضاجو بتوانند برای این آگهی با من ارتباط بگیرند."}
                        </small>
                      </span>
                    </label>

                    <div className="add-parking-preview">
                      <div className="add-parking-preview__heading">
                        <div>
                          <span>
                            پیش‌نمایش آگهی
                          </span>

                          <strong>
                            آماده انتشار
                          </strong>
                        </div>

                        <span className="add-parking-preview__status">
                          <i />
                          فعال
                        </span>
                      </div>

                      <div className="add-parking-preview__card">
                        <div className="add-parking-preview__image">
                          {form.imageUrl ? (
                            <img
                              src={
                                form.imageUrl
                              }
                              alt={
                                form.title ||
                                "پیش‌نمایش آگهی"
                              }
                            />
                          ) : (
                            <span>{form.category === "residential" ? "🏠" : "🚘"}</span>
                          )}
                        </div>

                        <div className="add-parking-preview__content">
                          <span>
                            {form.city ||
                              "شهر موردنظر"}
                          </span>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "7px",
                              marginBottom: "6px",
                            }}
                          >
                            <small
                              style={{
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: "#fff1e6",
                                color: "#d95f0b",
                                fontWeight: "900",
                              }}
                            >
                              {listingTypeLabel}
                            </small>

                            <small
                              style={{
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: "#f8f5f2",
                                color: "#65574f",
                                fontWeight: "900",
                              }}
                            >
                              {spaceLabel}
                            </small>
                          </div>

                          <h3>
                            {form.title ||
                              "عنوان آگهی"}
                          </h3>

                          {form.category === "parking" && !isWantedAd && (
                            <p style={{fontSize:12,color:"#7c4c2e",margin:"4px 0 9px",lineHeight:1.9}}>
                              {[parkingOfferLabel(PARKING_OFFER_USAGE,form.parkingOffer.vehicleUsage), parkingOfferLabel(PARKING_OFFER_COVER,form.parkingOffer.cover), parkingOfferLabel(PARKING_OFFER_ACCESS,form.parkingOffer.access)].filter(Boolean).join(" • ")}
                            </p>
                          )}
                          {form.category === "storage" && !isWantedAd && (
                            <p style={{fontSize:12,color:"#7c4c2e",margin:"4px 0 9px",lineHeight:1.9}}>
                              {[storageOfferLabel(STORAGE_TYPES,form.storageOffer.spaceType), storageOfferLabel(STORAGE_ACCESS,form.storageOffer.access)].filter(Boolean).join(" • ")}
                            </p>
                          )}
                          {form.category === "land" && !isWantedAd && (
                            <p style={{fontSize:12,color:"#7c4c2e",margin:"4px 0 9px",lineHeight:1.9}}>
                              {[landOfferLabel(LAND_OFFER_TYPES,form.landOffer.landType),landOfferLabel(LAND_OFFER_ROADS,form.landOffer.accessRoad)].filter(Boolean).join(" • ")}
                            </p>
                          )}
                          {form.category === "shop" && !isWantedAd && (
                            <p style={{fontSize:12,color:"#7c4c2e",margin:"4px 0 9px",lineHeight:1.9}}>
                              {[shopOfferLabel(SHOP_OFFER_TYPES,form.shopOffer.spaceType),shopOfferLabel(SHOP_OFFER_TRANSFERS,form.shopOffer.transferType)].filter(Boolean).join(" • ")}
                            </p>
                          )}
                          {form.category === "warehouse" && !isWantedAd && (
                            <p style={{fontSize:12,color:"#7c4c2e",margin:"4px 0 9px",lineHeight:1.9}}>
                              {[industrialLabel(INDUSTRIAL_TYPES,form.industrialOffer.spaceType), industrialLabel(INDUSTRIAL_POWER,form.industrialOffer.power)].filter(Boolean).join(" • ")}
                            </p>
                          )}

                          <div>
                            <strong>
                              {isWantedAd && form.category === "garden"
                                ? (gardenRequestBudgetText(form.gardenRequest) || "بودجه وارد نشده")
                                : isWantedAd && form.category === "villa"
                                ? (villaRequestBudgetText(form.villaRequest) || "بودجه وارد نشده")
                                : isWantedAd && form.category === "residential"
                                ? (residentialRequestBudgetText(form.residentialRequest) || "بودجه وارد نشده")
                                : !isWantedAd && form.category === "shop" ? (shopFinancialHeadline(makeShopAttributes(form.shopOffer)) || "شرایط مالی توافقی")
                                : form.price ? `${formatPriceInput(form.price)} ریال` : "قیمت آگهی"}
                            </strong>

                            <small>
                              {isWantedAd && form.category === "garden"
                                ? (gardenRequestAreaText(form.gardenRequest) || "متراژ ثبت نشده")
                                : isWantedAd && form.category === "villa"
                                ? (villaRequestAreaText(form.villaRequest) || "ظرفیت نامشخص")
                                : isWantedAd && form.category === "residential"
                                ? (residentialRequestAreaText(form.residentialRequest) || "متراژ ثبت نشده")
                                : form.area ? `${form.area} متر` : "متراژ ثبت نشده"}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="add-parking-actions">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      className="add-parking-button add-parking-button--secondary"
                      onClick={
                        goToPreviousStep
                      }
                      disabled={loading}
                    >
                      <span>→</span>
                      مرحله قبل
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="add-parking-button add-parking-button--secondary"
                      onClick={() =>
                        navigate("/parking")
                      }
                      disabled={loading}
                    >
                      انصراف
                    </button>
                  )}

                  {currentStep <
                  STEPS.length ? (
                    <button
                      type="button"
                      className="add-parking-button add-parking-button--primary"
                      onClick={goToNextStep}
                      disabled={loading}
                    >
                      ادامه
                      <span>←</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={saveParking}
                      className="add-parking-button add-parking-button--publish"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="add-parking-spinner" />
                          در حال انتشار...
                        </>
                      ) : (
                        <>
                          انتشار آگهی
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AddParking;