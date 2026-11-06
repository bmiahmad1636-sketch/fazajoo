import { showInSiteAlert, showInSiteConfirm } from "../utils/inSiteDialog";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { updateSpace } from "../services/spaceService";
import ImageUploader from "../components/ImageUploader";
import VideoUploader from "../components/VideoUploader";
import NeshanLocationPicker from "../components/NeshanLocationPicker";
import ParkingRequestUsageFields from "../components/ParkingRequestUsageFields";
import ParkingOfferFields from "../components/ParkingOfferFields";
import StorageOfferFields from "../components/StorageOfferFields";
import IndustrialOfferFields from "../components/IndustrialOfferFields";
import LandOfferFields from "../components/LandOfferFields";
import {LAND_OFFER_DEFAULT,landOfferFromAttributes,validateLandOffer,makeLandAttributes,landOfferLabel,LAND_OFFER_TYPES,LAND_OFFER_ROADS} from "../utils/landOffer";
import { INDUSTRIAL_OFFER_DEFAULT, industrialOfferFromAttributes, validateIndustrialOffer, makeIndustrialAttributes, industrialLabel, INDUSTRIAL_TYPES, INDUSTRIAL_POWER } from "../utils/industrialOffer";
import { STORAGE_OFFER_DEFAULT, storageOfferFromAttributes, validateStorageOffer, makeStorageAttributes, storageOfferLabel, STORAGE_TYPES, STORAGE_ACCESS } from "../utils/storageOffer";
import { PARKING_OFFER_DEFAULT, parkingOfferFormFromAttributes, validateParkingOffer, makeParkingAttributes } from "../utils/parkingOffer";
import ParkingRequestDetailsFields from "../components/ParkingRequestDetailsFields";
import { EMPTY_PARKING_REQUEST, readParkingRequestDetails, writeParkingRequestDetails, parkingRequestDetailsValidation } from "../utils/parkingRequestDetails";
import { readParkingRequestUsage, writeParkingRequestUsage, parkingUsageLabel } from "../utils/parkingRequestUsage";
import WarehouseRequestFields from "../components/WarehouseRequestFields";
import { readWarehouseRequest, writeWarehouseRequest, warehouseRequestValidation } from "../utils/warehouseRequest";
import ShedRequestFields from "../components/ShedRequestFields";
import { readShedRequest, writeShedRequest, shedRequestValidation } from "../utils/shedRequest";
import ResidentialFields from "../components/ResidentialFields";
import ResidentialRequestFields from "../components/ResidentialRequestFields";
import { readResidentialRequest, validateResidentialRequest, writeResidentialRequest, residentialRequestLegacyDetails, residentialRequestAreaText, residentialRequestBudgetText } from "../utils/residentialRequest";
import { emptyResidentialDetails } from "../components/residentialDetails";
import { RESIDENTIAL_OFFER_DEFAULT, validateResidentialOffer, makeResidentialAttributes, residentialListingPrice, residentialOfferFromAttributes, residentialFinancialHeadline, residentialDetailsForActiveContract } from "../utils/residentialOffer";
import VillaOfferFields from "../components/VillaOfferFields";
import {VILLA_OFFER_DEFAULT,villaOfferFromAttributes,validateVillaOffer,makeVillaAttributes,villaListingPrice,villaFinancialHeadline} from "../utils/villaOffer";
import VillaRequestFields from "../components/VillaRequestFields";
import { readVillaRequest, writeVillaRequest, validateVillaRequest, villaRequestAreaText, villaRequestBudgetText } from "../utils/villaRequest";
import GardenFields from "../components/GardenFields";
import GardenOfferFields from "../components/GardenOfferFields";
import {GARDEN_OFFER_DEFAULT,gardenOfferFromAttributes,validateGardenOffer,validateGardenFinancialRent,gardenListingPrice,makeGardenAttributes} from "../utils/gardenOffer";
import GardenRequestFields from "../components/GardenRequestFields";
import OtherRequestFields from "../components/OtherRequestFields";
import { readOtherRequest, writeOtherRequest, validateOtherRequest, otherRequestAreaText, otherRequestBudgetText } from "../utils/otherRequest";
import { readGardenRequest, writeGardenRequest, validateGardenRequest, gardenRequestBudgetText, gardenRequestAreaText } from "../utils/gardenRequest";
import ShopOfferFields from "../components/ShopOfferFields";
import { SHOP_OFFER_DEFAULT, shopOfferFromAttributes, validateShopOffer, makeShopAttributes, shopListingPrice, shopFinancialHeadline, shopOfferLabel, SHOP_OFFER_TYPES, SHOP_OFFER_TRANSFERS } from "../utils/shopOffer";
import ShopRequestFields from "../components/ShopRequestFields";
import LandRentalFields from "../components/LandRentalFields";
import { readLandRental, writeLandRental, landRentalValidation } from "../utils/landRental";
import { readShopRequest, writeShopRequest, shopRequestValidation } from "../utils/shopRequest";
import { emptyShopDetails } from "../components/shopDetails";
import { emptyGardenDetails } from "../components/gardenDetails";
import { emptyVillaDetails } from "../components/villaDetails";
import "../components/ResidentialFields.css";

import "./EditParking.css";

const EMPTY_FORM = {
  title: "",
  parkingOffer: { ...PARKING_OFFER_DEFAULT, securityFeatures: [] },
  storageOffer: { ...STORAGE_OFFER_DEFAULT, allowedPurposes: [], features: [] },
  industrialOffer: { ...INDUSTRIAL_OFFER_DEFAULT, allowedActivities: [], features: [] },
  landOffer: {...LAND_OFFER_DEFAULT,allowedPurposes:[],features:[],waterSources:[]},
  gardenOffer: {...GARDEN_OFFER_DEFAULT,allowedPurposes:[],features:[]},
  parkingRequestUsage: "",
  parkingOtherUsage: "",
  parkingRequestDetails: { ...EMPTY_PARKING_REQUEST },
  warehouseRequest: readWarehouseRequest("").data,
  shedRequest: readShedRequest("").data,
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
  residentialRequest: readResidentialRequest("").data,
  villaDetails: { ...emptyVillaDetails },
  villaOffer: {...VILLA_OFFER_DEFAULT,availableStays:[],extraFeatures:[]},
  villaRequest: readVillaRequest("").data,
  gardenDetails: { ...emptyGardenDetails },
  gardenRequest: readGardenRequest("").data,
  otherRequest: readOtherRequest("").data,
  customCategory: "",
  shopDetails: { ...emptyShopDetails },
  shopOffer: { ...SHOP_OFFER_DEFAULT, allowedActivities: [], features: [] },
  shopRequest: readShopRequest("").data,
  landRental: readLandRental("").data,
  agencyNetworkConsent: false,
  location: { lat: null, lng: null },
};

const PRICE_TYPES = [
  { value: "daily", label: "روزانه / شبانه" },
  { value: "weekly", label: "هفتگی" },
  { value: "monthly", label: "ماهانه" },
  { value: "yearly", label: "سالانه" },
  { value: "negotiable", label: "توافقی" },
];

function toEnglishDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    );
}

function formatPriceInput(value) {
  const digits = toEnglishDigits(value)
    .replace(/\D/g, "");

  return digits
    ? Number(digits).toLocaleString("en-US")
    : "";
}

function getPriceTypeLabel(value) {
  return (
    PRICE_TYPES.find(
      (item) => item.value === value
    )?.label || "ماهانه"
  );
}

function createFormFromParking(parking) {
  return {
    title: parking?.title || "",
    customCategory: parking?.customCategory || "",
    city: parking?.city || "",
    area:
      parking?.area === 0
        ? "0"
        : parking?.area || "",
    price: formatPriceInput(
      parking?.price || ""
    ),
    priceType:
      parking?.priceType || "monthly",
    phone: parking?.phone || "",
    imageUrl:
      parking?.imageUrl || parking?.imageUrls?.[0] || "",
    video: parking?.video || null,
    imageUrls:
      Array.isArray(parking?.imageUrls) && parking.imageUrls.length
        ? parking.imageUrls
        : parking?.imageUrl
          ? [parking.imageUrl]
          : [],
    residentialDetails: parking?.category === "residential" && parking?.listingType !== "wanted"
      ? residentialDetailsForActiveContract(residentialOfferFromAttributes(parking?.spaceAttributes,parking?.residentialDetails), { ...emptyResidentialDetails, ...(parking?.residentialDetails || {}) })
      : { ...emptyResidentialDetails, ...(parking?.residentialDetails || {}) },
    residentialOffer: residentialOfferFromAttributes(parking?.spaceAttributes,parking?.residentialDetails),
    residentialRequest: readResidentialRequest(parking?.description, parking?.residentialDetails, parking?.area).data,
    villaDetails: { ...emptyVillaDetails, ...(parking?.villaDetails || {}) },
    villaOffer: villaOfferFromAttributes(parking?.spaceAttributes),
    villaRequest: readVillaRequest(parking?.description, parking?.villaDetails, parking?.price, parking?.priceType, parking?.area).data,
    gardenDetails: { ...emptyGardenDetails, ...(parking?.gardenDetails || {}) },
    gardenOffer: gardenOfferFromAttributes(parking?.spaceAttributes,parking?.price,parking?.priceType),
    gardenRequest: readGardenRequest(parking?.description, parking?.gardenDetails, parking?.area, parking?.price, parking?.priceType).data,
    otherRequest: readOtherRequest(parking?.description, parking?.area, parking?.price, parking?.priceType).data,
    shopDetails: { ...emptyShopDetails, ...(parking?.shopDetails || {}) },
    shopOffer: shopOfferFromAttributes(parking?.spaceAttributes),
    shopRequest: readShopRequest(parking?.description).data,
    landRental: readLandRental(parking?.description).data,
    description: parking?.listingType === "wanted" && parking?.category === "residential" ? readResidentialRequest(parking?.description, parking?.residentialDetails, parking?.area).description : parking?.listingType === "wanted" && parking?.category === "villa" ? readVillaRequest(parking?.description, parking?.villaDetails, parking?.price, parking?.priceType, parking?.area).description : parking?.listingType === "wanted" && parking?.category === "garden" ? readGardenRequest(parking?.description, parking?.gardenDetails, parking?.area, parking?.price, parking?.priceType).description : parking?.listingType === "wanted" && parking?.category === "other" ? readOtherRequest(parking?.description, parking?.area, parking?.price, parking?.priceType).description : parking?.category === "land" ? readLandRental(parking?.description).description : parking?.listingType === "wanted" && parking?.category === "storage"
      ? readWarehouseRequest(parking?.description).description
      : readParkingRequestUsage(parking?.description).description,
    parkingOffer: parkingOfferFormFromAttributes(parking?.spaceAttributes),
    storageOffer: storageOfferFromAttributes(parking?.spaceAttributes),
    industrialOffer: industrialOfferFromAttributes(parking?.spaceAttributes),
    landOffer: landOfferFromAttributes(parking?.spaceAttributes),
    parkingRequestUsage: readParkingRequestUsage(parking?.description).usage,
    parkingOtherUsage: readParkingRequestUsage(parking?.description).otherUsage,
    parkingRequestDetails: readParkingRequestDetails(parking?.description).data,
    warehouseRequest: readWarehouseRequest(parking?.description).data,
    shedRequest: readShedRequest(parking?.description).data,
    agencyNetworkConsent: Boolean(parking?.agencyNetworkConsent),
    location: {
      lat: parking?.location?.lat ?? null,
      lng: parking?.location?.lng ?? null,
    },
  };
}

function EditParking({
  parkings = [],
  updateParkingInState,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Navigation into the edit page should not inherit the previous page scroll.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  const parking = useMemo(() => {
    return parkings.find(
      (item) =>
        String(item.id) === String(id)
    );
  }, [parkings, id]);

  const isWanted =
    (parking?.listingType || "offer") === "wanted";

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [initialForm, setInitialForm] =
    useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] =
    useState(false);

  const [showSuccess, setShowSuccess] =
    useState(false);

  useEffect(() => {
    if (!parking) {
      return;
    }

    const nextForm =
      createFormFromParking(parking);

    setForm(nextForm);
    setInitialForm(nextForm);
    setErrors({});
  }, [parking]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !==
      JSON.stringify(initialForm);
  }, [form, initialForm]);

  const completionPercentage =
    useMemo(() => {
      // Requests are complete without photos; negotiated budgets need no amount.
      const fields = [
        form.title.trim(),
        form.city.trim(),
        isWanted && parking?.category === "warehouse" ? (form.shedRequest?.minArea || form.shedRequest?.maxArea || form.shedRequest?.spaceType) : isWanted && parking?.category === "storage" ? (form.warehouseRequest?.minArea || form.warehouseRequest?.maxArea) : form.area,
        form.priceType === "negotiable" ? true : form.price.trim(),
        form.phone.trim(),
        ...(!isWanted ? [form.imageUrl] : []),
        ...(parking?.category === "parking" && !isWanted ? [form.parkingOffer.vehicleUsage, form.parkingOffer.cover, form.parkingOffer.access] : parking?.category === "storage" && !isWanted ? [form.storageOffer.spaceType, form.storageOffer.access, form.storageOffer.allowedPurposes.length] : parking?.category === "warehouse" && !isWanted ? [form.industrialOffer.spaceType, form.industrialOffer.power, form.industrialOffer.allowedActivities.length] : parking?.category === "land" && !isWanted ? [form.landOffer.landType, form.landOffer.accessRoad, form.landOffer.allowedPurposes.length] : parking?.category === "shop" && !isWanted ? [form.shopOffer.spaceType,form.shopOffer.allowedActivities.length,form.shopOffer.transferType] : isWanted && parking?.category === "warehouse" ? [form.shedRequest?.activity] : isWanted && parking?.category === "storage" ? [form.warehouseRequest?.purpose] : [form.description.trim()]),
      ];

      const completedFields =
        fields.filter(Boolean).length;

      return Math.round(
        (completedFields /
          fields.length) *
          100
      );
    }, [form, isWanted]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        name === "price"
          ? formatPriceInput(value)
          : value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    setShowSuccess(false);
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

    setShowSuccess(false);
  };

  const handleMainImageChange = (url) => {
    setForm((currentForm) => ({
      ...currentForm,
      imageUrl: url || "",
    }));
    setShowSuccess(false);
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!isWanted && parking?.category === "residential") {
      const err = validateResidentialOffer(form.residentialOffer, form.residentialDetails, form.area);
      if (err) nextErrors.residentialOffer = err;
      if (!form.area || Number(form.area) <= 0) nextErrors.area = "متراژ واقعی ملک مسکونی را وارد کنید.";
    }
    if (isWanted && parking?.category === "residential") { const err = validateResidentialRequest(form.residentialRequest); if (err) nextErrors.residentialRequest = err; }
    if (!isWanted && parking?.category === "villa") { const err=validateVillaOffer(form.villaOffer,form.villaDetails,form.area); if(err)nextErrors.villaOffer=err; }
    if (isWanted && parking?.category === "villa") { const err = validateVillaRequest(form.villaRequest); if (err) nextErrors.villaRequest = err; }
    if (isWanted && parking?.category === "garden") { const err = validateGardenRequest(form.gardenRequest); if (err) nextErrors.gardenRequest = err; }
    if (isWanted && parking?.category === "other") {
      const err = validateOtherRequest(form.otherRequest); if (err) nextErrors.otherRequest = err;
      if (String(form.customCategory || "").trim().length < 3) nextErrors.customCategory = "نام فضای موردنیاز را با حداقل ۳ نویسه وارد کن.";
    }
    if (isWanted && parking?.category === "land") { const err = landRentalValidation(form.landRental,isWanted); if (err) nextErrors.landRental = err; }
    if (isWanted && parking?.category === "shop") { const err = shopRequestValidation(form.shopRequest); if (err) nextErrors.shopRequest = err; }
    if (isWanted && parking?.category === "warehouse") {
      const shedError = shedRequestValidation(form.shedRequest);
      if (shedError) nextErrors.shedRequest = shedError;
    }
    if (isWanted && parking?.category === "storage") {
      const warehouseError = warehouseRequestValidation(form.warehouseRequest);
      if (warehouseError) nextErrors.warehouseRequest = warehouseError;
    }
    if (isWanted && parking?.category === "parking") {
      if (!form.parkingRequestUsage) nextErrors.parkingRequestUsage = "کاربری موردنظر را انتخاب کنید.";
      else if (form.parkingRequestUsage === "other" && form.parkingOtherUsage.trim().length < 5) nextErrors.parkingRequestUsage = "کاربری دیگر را حداقل در ۵ حرف توضیح دهید.";
      const detailsError = parkingRequestDetailsValidation(form.parkingRequestDetails);
      if (detailsError) nextErrors.parkingRequestDetails = detailsError;
    }

    if (!isWanted && parking?.category === "parking") {
      const parkingError = validateParkingOffer(form.parkingOffer);
      if (parkingError) nextErrors.parkingOffer = parkingError;
      if (!form.area || Number(form.area) <= 0) nextErrors.area = "متراژ واقعی پارکینگ را وارد کنید.";
    }
    if (!isWanted && parking?.category === "storage") {
      const storageError = validateStorageOffer(form.storageOffer);
      if (storageError) nextErrors.storageOffer = storageError;
      if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) nextErrors.area = "متراژ واقعی انبار را وارد کنید.";
    }
    if (!isWanted && parking?.category === "warehouse") {
      const error = validateIndustrialOffer(form.industrialOffer);
      if (error) nextErrors.industrialOffer = error;
      if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) nextErrors.area = "متراژ واقعی سوله یا کارگاه را وارد کنید.";
    }

    if (!isWanted && parking?.category === "land") {
      const error = validateLandOffer(form.landOffer);
      if (error) nextErrors.landOffer = error;
      if (!form.area || !Number.isFinite(Number(form.area)) || Number(form.area) <= 0) nextErrors.area = "مساحت واقعی زمین را وارد کنید.";
    }

    if (!isWanted && parking?.category === "garden") {
      const error=validateGardenOffer(form.gardenOffer);
      if(error)nextErrors.gardenOffer=error;
      if(!form.area||!Number.isFinite(Number(form.area))||Number(form.area)<=0)nextErrors.area="مساحت واقعی باغ را وارد کنید.";
    }
    if (!isWanted && parking?.category === "shop") {
      const error=validateShopOffer(form.shopOffer);
      if(error)nextErrors.shopOffer=error;
      if(!form.area || !Number.isFinite(Number(form.area)) || Number(form.area)<=0)nextErrors.area="متراژ واقعی مغازه را وارد کنید.";
    }
    if (!form.title.trim()) {
      nextErrors.title =
        isWanted ? "عنوان درخواست را وارد کنید." : "عنوان آگهی را وارد کنید.";
    } else if (
      form.title.trim().length < 5
    ) {
      nextErrors.title =
        "عنوان باید حداقل ۵ کاراکتر باشد.";
    }

    if (!form.city.trim()) {
      nextErrors.city =
        "نام شهر را وارد کنید.";
    }

    if (
      !(isWanted && ["land", "shop", "parking", "storage", "warehouse", "residential", "villa", "garden", "other"].includes(parking?.category)) &&
      form.area &&
      Number(form.area) <= 0
    ) {
      nextErrors.area =
        "متراژ باید بیشتر از صفر باشد.";
    }

    if (parking?.category === "residential") {
      // Dedicated residential form validation covers the active short/long contract.
    } else if (!(isWanted && ["land", "shop", "villa", "garden", "other"].includes(parking?.category)) && !(!isWanted && ["shop", "garden"].includes(parking?.category)) && !(parking?.category === "villa" && !isWanted && form.villaOffer.rentalTerm === "long") && form.priceType !== "negotiable" && !form.price.trim()) {
      nextErrors.price = isWanted ? "سقف بودجه را وارد کنید." : "قیمت را وارد کنید.";
    }

    if (!isWanted && parking?.category === "garden") { const err=validateGardenFinancialRent(form.gardenOffer,form.price,form.priceType); if(err)nextErrors.price=err; }

    const normalizedPhone =
      form.phone.replace(/\s/g, "");

    if (!normalizedPhone) {
      nextErrors.phone =
        "شماره تماس را وارد کنید.";
    } else if (
      !/^09\d{9}$/.test(normalizedPhone)
    ) {
      nextErrors.phone =
        "شماره موبایل معتبر وارد کنید.";
    }

    if (!isWanted && !form.imageUrl) {
      nextErrors.imageUrl =
        "یک تصویر برای آگهی فضای قابل اجاره انتخاب کنید.";
    }

    if (
      !(["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"].includes(parking?.category) && !isWanted) && !(isWanted && ["storage", "warehouse", "parking", "shop", "land", "residential", "villa", "garden", "other"].includes(parking?.category)) && form.description.trim().length < 10
    ) {
      nextErrors.description =
        "توضیحات باید حداقل ۱۰ کاراکتر باشد.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const resetChanges = async () => {
    if (!hasChanges || loading) {
      return;
    }

    const shouldReset = await showInSiteConfirm(
      "تغییرات ذخیره‌نشده حذف شوند؟",
      "حذف تغییرات"
    );

    if (!shouldReset) {
      return;
    }

    setForm(initialForm);
    setErrors({});
    setShowSuccess(false);
  };

  const handleCancel = async () => {
    if (hasChanges && !loading) {
      const shouldLeave = await showInSiteConfirm(
        "تغییرات ذخیره نشده‌اند. از صفحه خارج می‌شوید؟",
        "خروج از صفحه"
      );

      if (!shouldLeave) {
        return;
      }
    }

    navigate(`/parking/${id}`);
  };

  const saveEdit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      // Errors are rendered next to the fields. Move to the first error, not the page top.
      window.requestAnimationFrame(() => {
        const firstError = document.querySelector(".edit-parking-error, [role='alert']");
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    if (!hasChanges) {
      setShowSuccess(true);
      return;
    }

    setLoading(true);
    setShowSuccess(false);

    const normalizedPhone =
      form.phone.replace(/\s/g, "");

    const updatedData = {
      title: form.title.trim(),
      ...(isWanted && parking?.category === "other" ? { customCategory: form.customCategory.trim(), categoryLabel: form.customCategory.trim() } : {}),
      city: form.city.trim(),

      area: isWanted && parking?.category === "land" ? Number(form.landRental.minArea || form.landRental.maxArea || 0) * (form.landRental.areaUnit === "hectare" ? 10000 : 1) : isWanted && parking?.category === "shop" ? Number(form.shopRequest.minArea || form.shopRequest.maxArea || 0) : isWanted && parking?.category === "parking"
        ? Number(form.parkingRequestDetails.minArea || form.parkingRequestDetails.maxArea || 0)
        : isWanted && parking?.category === "warehouse"
        ? Number(form.shedRequest.minArea || form.shedRequest.maxArea || 0)
        : isWanted && parking?.category === "storage"
        ? Number(form.warehouseRequest.minArea || form.warehouseRequest.maxArea || 0)
        : isWanted && parking?.category === "residential"
        ? Number(form.residentialRequest.minArea || form.residentialRequest.maxArea || 0)
        : isWanted && parking?.category === "villa"
        ? Number(form.villaRequest.minArea || form.villaRequest.maxArea || 0)
        : isWanted && parking?.category === "garden"
        ? Number(form.gardenRequest.minArea || form.gardenRequest.maxArea || 0)
        : isWanted && parking?.category === "other"
        ? Number(form.otherRequest.minArea || form.otherRequest.maxArea || 0)
        : form.area ? Number(form.area) : 0,

      price:
        isWanted && parking?.category === "land" ? "" : isWanted && parking?.category === "shop" ? "" : !isWanted && parking?.category === "shop" ? shopListingPrice(form.shopOffer).price : !isWanted && parking?.category === "garden" ? gardenListingPrice(form.gardenOffer,form.price,form.priceType).price : isWanted && parking?.category === "residential" && form.residentialRequest.rentalTerm === "short" ? String(form.residentialRequest.shortMaxBudgetRial || "") : isWanted && parking?.category === "villa" ? String(form.villaRequest.rentalTerm === "long" && form.villaRequest.financialMode === "full_deposit" ? "" : form.villaRequest.maxBudget || "") : isWanted && parking?.category === "garden" ? String(form.gardenRequest.pricePeriod === "negotiable" ? "" : form.gardenRequest.maxBudget || "") : isWanted && parking?.category === "other" ? String(form.otherRequest.pricePeriod === "negotiable" ? "" : form.otherRequest.maxBudget || "") : !isWanted && parking?.category === "villa" ? villaListingPrice(form.villaOffer,form.price,form.priceType).price : !isWanted && parking?.category === "residential" ? residentialListingPrice(form.residentialOffer,form.residentialDetails).price : parking?.category === "residential"
          ? String(
              isWanted ? (residentialRequestLegacyDetails(form.residentialRequest).monthlyRent || residentialRequestLegacyDetails(form.residentialRequest).deposit || "")
                : (form.residentialDetails?.monthlyRent || form.residentialDetails?.deposit || "")
            )
          : form.priceType === "negotiable" ? "" : form.price.replace(/,/g, "").trim(),
      priceType:
        isWanted && parking?.category === "land" ? "negotiable" : isWanted && parking?.category === "shop" ? "negotiable" : !isWanted && parking?.category === "shop" ? shopListingPrice(form.shopOffer).priceType : !isWanted && parking?.category === "garden" ? gardenListingPrice(form.gardenOffer,form.price,form.priceType).priceType : isWanted && parking?.category === "residential" && form.residentialRequest.rentalTerm === "short" ? ({night:"daily",week:"weekly",month:"monthly"}[form.residentialRequest.shortRateUnit] || "negotiable") : isWanted && parking?.category === "villa" ? (form.villaRequest.rentalTerm === "long" ? (form.villaRequest.financialMode === "full_deposit" ? "negotiable" : "monthly") : form.villaRequest.pricePeriod) : isWanted && parking?.category === "garden" ? form.gardenRequest.pricePeriod : isWanted && parking?.category === "other" ? form.otherRequest.pricePeriod : !isWanted && parking?.category === "villa" ? villaListingPrice(form.villaOffer,form.price,form.priceType).priceType : !isWanted && parking?.category === "residential" ? residentialListingPrice(form.residentialOffer,form.residentialDetails).priceType : parking?.category === "residential"
          ? "monthly"
          : form.priceType,
      residentialDetails:
        parking?.category === "residential"
          ? (isWanted ? { ...form.residentialDetails, ...residentialRequestLegacyDetails(form.residentialRequest) } : residentialDetailsForActiveContract(form.residentialOffer, form.residentialDetails))
          : {},
      gardenDetails: parking?.category === "garden" ? form.gardenDetails : {},
      ...(parking?.category === "parking" && !isWanted ? { spaceAttributes: makeParkingAttributes(form.parkingOffer) } : parking?.category === "storage" && !isWanted ? { spaceAttributes: makeStorageAttributes(form.storageOffer) } : parking?.category === "warehouse" && !isWanted ? { spaceAttributes: makeIndustrialAttributes(form.industrialOffer) } : parking?.category === "land" && !isWanted ? { spaceAttributes: makeLandAttributes(form.landOffer) } : parking?.category === "shop" && !isWanted ? { spaceAttributes: makeShopAttributes(form.shopOffer) } : parking?.category === "garden" && !isWanted ? { spaceAttributes: makeGardenAttributes(form.gardenOffer) } : parking?.category === "residential" && !isWanted ? { spaceAttributes: makeResidentialAttributes(form.residentialOffer,form.residentialDetails) } : parking?.category === "villa" && !isWanted ? { spaceAttributes: makeVillaAttributes(form.villaOffer,form.villaDetails) } : {}),
      shopDetails: parking?.category === "shop" ? form.shopDetails : {},
      villaDetails: parking?.category === "villa" ? form.villaDetails : {},
      phone: normalizedPhone,
      imageUrl: isWanted && ["storage", "warehouse", "shop", "land"].includes(parking?.category) ? "" : form.imageUrl,
      imageUrls: isWanted && ["storage", "warehouse", "shop", "land"].includes(parking?.category) ? [] : form.imageUrls,
      video: isWanted && ["storage", "warehouse", "shop", "land"].includes(parking?.category) ? null : form.video,

      description:
        isWanted && parking?.category === "residential" ? writeResidentialRequest(form.residentialRequest, form.description) :
        isWanted && parking?.category === "villa" ? writeVillaRequest(form.villaRequest, form.description) :
        isWanted && parking?.category === "garden" ? writeGardenRequest(form.gardenRequest, form.description) :
        isWanted && parking?.category === "other" ? writeOtherRequest(form.otherRequest, form.description) :
        isWanted && parking?.category === "land" ? writeLandRental(form.landRental, isWanted ? "" : form.description) :
        isWanted && parking?.category === "shop" ? writeShopRequest(form.shopRequest) :
        isWanted && parking?.category === "parking"
          ? writeParkingRequestDetails(form.parkingRequestDetails, form.parkingRequestUsage, form.parkingOtherUsage)
          : isWanted && parking?.category === "warehouse"
            ? writeShedRequest("", form.shedRequest)
            : isWanted && parking?.category === "storage"
            ? writeWarehouseRequest("", form.warehouseRequest)
            : form.description.trim(),
      agencyNetworkConsent: Boolean(form.agencyNetworkConsent),
      location: form.location,

    };

    try {
      await updateSpace(id, updatedData);

      if (updateParkingInState) {
        updateParkingInState(id, {
          ...updatedData,
          updatedAt: new Date(),
        });
      }

      const nextInitialForm = {
        ...form,
        title: form.title.trim(),
        city: form.city.trim(),
        price: formatPriceInput(
          form.price
        ),
        priceType: form.priceType,
        phone: normalizedPhone,
        description:
          form.description.trim(),
      };

      setForm(nextInitialForm);
      setInitialForm(nextInitialForm);
      setShowSuccess(true);

      window.setTimeout(() => {
        navigate(`/parking/${id}`);
      }, 1800);
    } catch (error) {
      console.error(
        "خطا در ویرایش آگهی:",
        error
      );

      showInSiteAlert("ویرایش آگهی انجام نشد. دوباره تلاش کنید.", "ویرایش آگهی");
    } finally {
      setLoading(false);
    }
  };

  if (!parking) {
    return (
      <main className="edit-parking-not-found">
        <div className="edit-parking-not-found__orb edit-parking-not-found__orb--one" />
        <div className="edit-parking-not-found__orb edit-parking-not-found__orb--two" />

        <section className="edit-parking-not-found__card">
          <div className="edit-parking-not-found__icon">
            ?
          </div>

          <span className="edit-parking-not-found__eyebrow">
            نتیجه‌ای پیدا نشد
          </span>

          <h1>آگهی در دسترس نیست</h1>

          <p>
            ممکن است آگهی حذف شده باشد یا
            هنوز اطلاعات آن دریافت نشده
            باشد.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/parking")
            }
          >
            <span>→</span>
            بازگشت به آگهی‌ها
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={`edit-parking-page${isWanted ? " edit-parking-page--wanted" : ""}`}>
      <div className="edit-parking-page__background">
        <span className="edit-parking-orb edit-parking-orb--one" />
        <span className="edit-parking-orb edit-parking-orb--two" />
        <span className="edit-parking-orb edit-parking-orb--three" />
      </div>

      <section className="edit-parking-hero">
        <div className="container">
          <div className="edit-parking-toolbar">
            <button
              type="button"
              className="edit-parking-back"
              onClick={handleCancel}
              disabled={loading}
            >
              <span>→</span>
              بازگشت به آگهی
            </button>

            <div
              className={[
                "edit-parking-status",
                hasChanges
                  ? "edit-parking-status--changed"
                  : "edit-parking-status--saved",
              ].join(" ")}
            >
              <span />

              {hasChanges
                ? "تغییرات ذخیره‌نشده"
                : "همه تغییرات ذخیره شده"}
            </div>
          </div>

          <div className="edit-parking-hero__content">
            <div>
              <span className="edit-parking-eyebrow">
                {isWanted ? "مدیریت درخواست" : "مدیریت آگهی"}
              </span>

              <h1>{isWanted ? "ویرایش درخواست پارکینگ" : "ویرایش آگهی پارکینگ"}</h1>

              <p>
                {isWanted
                  ? "شرایط و بودجه موردنیازت را دقیق‌تر کن تا تأمین‌کنندگان فضای مناسب‌تری پیشنهاد بدهند."
                  : "اطلاعات آگهی را دقیق‌تر کن تا کاربران سریع‌تر فضای مناسب خودشان را پیدا کنند."}
              </p>
            </div>

            <div className="edit-parking-hero__meta">
              <span className="edit-parking-hero__meta-icon">
                ✎
              </span>

              <div>
                <small>{isWanted ? "درخواست در حال ویرایش" : "آگهی در حال ویرایش"}</small>

                <strong>
                  {parking.title}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="edit-parking-content">
        <div className="container">
          {showSuccess && (
            <div className="edit-parking-success">
              <span>✓</span>

              <div>
                <strong>
                  تغییرات با موفقیت ذخیره شد
                </strong>

                <p>
                  {isWanted ? "در حال انتقال به صفحه درخواست..." : "در حال انتقال به صفحه آگهی..."}
                </p>
              </div>
            </div>
          )}

          <div className="edit-parking-layout">
            <form
              className="edit-parking-form"
              onSubmit={saveEdit}
              noValidate
            >
              {Object.values(errors).some(Boolean) && (
                <div role="alert" className="edit-parking-error" style={{padding:14,marginBottom:16,border:"1px solid #f2b6ac",borderRadius:12,background:"#fff4f2",lineHeight:1.9}}>
                  <strong>برای ذخیره، این موارد را بررسی کنید:</strong>
                  <ul style={{margin:"6px 0 0"}}>{Object.entries(errors).filter(([,message])=>message).map(([key,message])=><li key={key}>{message}</li>)}</ul>
                </div>
              )}

        {parking?.category === "parking" && !isWanted && (
          <ParkingOfferFields value={form.parkingOffer} note={form.description} disabled={loading} error={errors.parkingOffer}
            onNoteChange={(description) => { setForm(current=>({...current,description})); setShowSuccess(false); }}
            onChange={(parkingOffer) => { setForm(current=>({...current,parkingOffer})); setErrors(current=>({...current,parkingOffer:""})); }} />
        )}
        {parking?.category === "storage" && !isWanted && (
          <StorageOfferFields value={form.storageOffer} note={form.description} disabled={loading} error={errors.storageOffer}
            onNoteChange={(description) => { setForm(current=>({...current,description})); setShowSuccess(false); }}
            onChange={(storageOffer) => { setForm(current=>({...current,storageOffer})); setErrors(current=>({...current,storageOffer:""})); setShowSuccess(false); }} />
        )}
        {parking?.category === "warehouse" && !isWanted && (
          <IndustrialOfferFields value={form.industrialOffer} note={form.description} disabled={loading} error={errors.industrialOffer}
            onNoteChange={(description) => { setForm(current=>({...current,description})); setShowSuccess(false); }}
            onChange={(industrialOffer) => { setForm(current=>({...current,industrialOffer})); setErrors(current=>({...current,industrialOffer:""})); setShowSuccess(false); }} />
        )}
        {parking?.category === "land" && !isWanted && (
          <LandOfferFields value={form.landOffer} note={form.description} disabled={loading} error={errors.landOffer}
            onNoteChange={(description)=>{setForm(current=>({...current,description}));setShowSuccess(false);}}
            onChange={(landOffer)=>{setForm(current=>({...current,landOffer}));setErrors(current=>({...current,landOffer:""}));setShowSuccess(false);}}/>
        )}
        {parking?.category === "residential" && !isWanted && (
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

        {parking?.category === "shop" && !isWanted && <ShopOfferFields value={form.shopOffer} details={form.shopDetails} note={form.description} disabled={loading} error={errors.shopOffer}
          onNoteChange={description=>setForm(current=>({...current,description}))}
          onDetailsChange={shopDetails=>setForm(current=>({...current,shopDetails}))}
          onChange={shopOffer=>{setForm(current=>({...current,shopOffer}));setErrors(current=>({...current,shopOffer:""}));setShowSuccess(false);}}/>}

        {parking?.category === "garden" && !isWanted && <GardenOfferFields value={form.gardenOffer} details={form.gardenDetails} note={form.description} disabled={loading} error={errors.gardenOffer}
          onNoteChange={description=>{setForm(current=>({...current,description}));setShowSuccess(false);}}
          onDetailsChange={gardenDetails=>{setForm(current=>({...current,gardenDetails}));setShowSuccess(false);}}
          onChange={gardenOffer=>{setForm(current=>({...current,gardenOffer,...(gardenOffer.financialMode==="full_deposit"?{price:"",priceType:"negotiable"}:current.gardenOffer.financialMode==="full_deposit"?{priceType:"monthly"}:{})}));setErrors(current=>({...current,gardenOffer:"",price:""}));setShowSuccess(false);}}/>}

        {parking?.category === "villa" && !isWanted && <VillaOfferFields
          value={form.villaOffer} details={form.villaDetails} note={form.description} disabled={loading} error={errors.villaOffer}
          onNoteChange={description=>{setForm(current=>({...current,description}));setShowSuccess(false);}}
          onDetailsChange={villaDetails=>{setForm(current=>({...current,villaDetails}));setErrors(current=>({...current,villaOffer:""}));setShowSuccess(false);}}
          onChange={villaOffer=>{setForm(current=>({...current,villaOffer}));setErrors(current=>({...current,villaOffer:""}));setShowSuccess(false);}}
        />}

              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon">
                    01
                  </div>

                  <div>
                    <span>
                      اطلاعات پایه
                    </span>

                    <h2>
                      {isWanted ? "مشخصات اصلی درخواست" : "مشخصات اصلی آگهی"}
                    </h2>

                    <p>
                      عنوان، موقعیت و اندازه
                      پارکینگ را ویرایش کن.
                    </p>
                  </div>
                </div>

                <div className="edit-parking-card__body">
                  <div className="edit-parking-field edit-parking-field--full">
                    <label htmlFor="title">
                      {isWanted ? "عنوان درخواست" : "عنوان آگهی"}
                      <span>*</span>
                    </label>

                    <div
                      className={[
                        "edit-parking-input",
                        errors.title
                          ? "edit-parking-input--error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="edit-parking-input__icon">
                        ✎
                      </span>

                      <input
                        id="title"
                        name="title"
                        type="text"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="مثلاً پارکینگ مسقف نزدیک میدان ونک"
                        maxLength={80}
                        disabled={loading}
                      />
                    </div>

                    <div className="edit-parking-field__meta">
                      {errors.title ? (
                        <span className="edit-parking-error">
                          {errors.title}
                        </span>
                      ) : (
                        <span>
                          عنوانی واضح و
                          قابل‌جست‌وجو بنویس.
                        </span>
                      )}

                      <span>
                        {form.title.length}
                        /۸۰
                      </span>
                    </div>
                  </div>

                  <div className="edit-parking-grid">
                    <div className="edit-parking-field">
                      <label htmlFor="city">
                        شهر
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "edit-parking-input",
                          errors.city
                            ? "edit-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="edit-parking-input__icon">
                          ⌖
                        </span>

                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={form.city}
                          onChange={handleChange}
                          placeholder="مثلاً تهران"
                          disabled={loading}
                        />
                      </div>

                      {errors.city && (
                        <span className="edit-parking-error">
                          {errors.city}
                        </span>
                      )}
                    </div>

                    {!((isWanted && parking?.category === "land") || (isWanted && ["storage", "warehouse", "parking", "shop", "residential", "garden", "other"].includes(parking?.category))) && (
                    <div className="edit-parking-field">
                      <label htmlFor="area">
                        {!isWanted && parking?.category === "storage" ? "متراژ واقعی انبار" : !isWanted && parking?.category === "warehouse" ? "متراژ واقعی سوله یا کارگاه" : !isWanted && parking?.category === "land" ? "مساحت واقعی زمین (مترمربع)" : "متراژ"}
                          {!isWanted && ["storage", "warehouse", "land"].includes(parking?.category) && <span>*</span>}
                      </label>

                      <div
                        className={[
                          "edit-parking-input",
                          errors.area
                            ? "edit-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="edit-parking-input__icon">
                          ↔
                        </span>

                        <input
                          id="area"
                          name="area"
                          type="number"
                          min="1"
                          value={form.area}
                          onChange={handleChange}
                          placeholder="مثلاً ۱۵"
                          disabled={loading}
                        />

                        <span className="edit-parking-input__suffix">
                          متر
                        </span>
                      </div>

                      {errors.area && (
                        <span className="edit-parking-error">
                          {errors.area}
                        </span>
                      )}
                    </div>
                    )}
                  </div>
                                     {isWanted && parking?.category === "parking" && (
                     <>
                       <div style={{ padding: 14, background: "#fff8f2", border: "1px solid #f3d7c2", borderRadius: 14 }}><strong>پارکینگ موردنیازت را معرفی کن</strong><p style={{ margin: "6px 0 0" }}>کاربری، متراژ، نوع پوشش و زمان دسترسی را ویرایش کن؛ شرایط خاص اختیاری است.</p></div>
                       {isWanted && parking?.category === "parking" && (
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
                  {isWanted && parking?.category === "other" && (
                    <>
                      <label className="edit-parking-field edit-parking-field--full">
                        <span>نام فضای موردنیاز <b style={{color:"#d92d20"}}>*</b></span>
                        <input value={form.customCategory} maxLength={50} disabled={loading}
                          onChange={(event) => { setForm((current) => ({ ...current, customCategory: event.target.value })); setErrors((current) => ({ ...current, customCategory: "" })); setShowSuccess(false); }}
                          placeholder="مثلاً استودیو، سالن چندمنظوره یا فضای تمرین"/>
                        {errors.customCategory && <small role="alert" style={{color:"#b42318"}}>{errors.customCategory}</small>}
                      </label>
                      <OtherRequestFields value={form.otherRequest} disabled={loading} error={errors.otherRequest}
                        onChange={(otherRequest) => { setForm((current) => ({ ...current, otherRequest })); setErrors((current) => ({ ...current, otherRequest: "" })); setShowSuccess(false); }}/>
                    </>
                  )}
                  {isWanted && parking?.category === "garden" && (
                    <>
                      <GardenRequestFields value={form.gardenRequest} disabled={loading} error={errors.gardenRequest}
                        onChange={(gardenRequest) => { setForm((current) => ({ ...current, gardenRequest })); setErrors((current) => ({ ...current, gardenRequest: "" })); setShowSuccess(false); }} />
                      {Boolean(form.description.trim()) && <label className="edit-parking-field edit-parking-field--full" style={{marginTop:12}}>
                        <span>توضیحات قدیمی درخواست (قابل ویرایش)</span>
                        <textarea rows={3} maxLength={800} value={form.description} disabled={loading} onChange={(event) => setForm((current) => ({...current, description: event.target.value}))} />
                      </label>}
                    </>
                  )}
                  {isWanted && parking?.category === "villa" && (
                    <>
                      <VillaRequestFields value={form.villaRequest} disabled={loading} error={errors.villaRequest}
                        onChange={(villaRequest) => { setForm((current) => ({ ...current, villaRequest })); setErrors((current) => ({ ...current, villaRequest: "" })); setShowSuccess(false); }} />
                      {Boolean(form.description.trim()) && <label className="edit-parking-field edit-parking-field--full" style={{marginTop:12}}>
                        <span>توضیحات قدیمی درخواست (قابل ویرایش)</span>
                        <textarea rows={3} maxLength={800} value={form.description} disabled={loading} onChange={(event) => setForm((current) => ({...current, description: event.target.value}))} />
                      </label>}
                    </>
                  )}
                  {isWanted && parking?.category === "residential" && (
                    <>
                    <ResidentialRequestFields value={form.residentialRequest} disabled={loading} error={errors.residentialRequest} onChange={(residentialRequest) => { setForm((current) => ({ ...current, residentialRequest })); setErrors((current) => ({ ...current, residentialRequest: "" })); setShowSuccess(false); }} />
                    {Boolean(form.description.trim()) && <label className="edit-parking-field edit-parking-field--full" style={{marginTop:12}}>
                      <span>توضیحات قدیمی این درخواست (قابل ویرایش)</span>
                      <textarea rows={3} maxLength={800} value={form.description} disabled={loading} onChange={(event) => setForm((current) => ({...current, description: event.target.value}))} />
                    </label>}
                    </>
                  )}
                  {isWanted && parking?.category === "land" && (<><LandRentalFields wanted={isWanted} value={form.landRental} disabled={loading} error={errors.landRental} onChange={landRental=>{setForm(current=>({...current,landRental}));setErrors(current=>({...current,landRental:""}));}}/></>)}
                  {isWanted && parking?.category === "shop" && (<>
                    <div style={{padding:14,background:"#fff8f2",border:"1px solid #f3d7c2",borderRadius:14}}><strong>فضای تجاری موردنیازت را معرفی کن</strong><p>موقعیت، فعالیت، طبقه، متراژ و توان مالی را ویرایش کن.</p></div>
                    <ShopRequestFields value={form.shopRequest} disabled={loading} error={errors.shopRequest} onChange={shopRequest=>{setForm(current=>({...current,shopRequest}));setErrors(current=>({...current,shopRequest:""}));}}/>
                  </>)}
{isWanted && parking?.category === "warehouse" && (
                    <>
                      <div style={{ padding: 14, background: "#fff8f2", border: "1px solid #f3d7c2", borderRadius: 14 }}>
                        <strong>سوله یا کارگاه موردنیازت را معرفی کن</strong>
                        <p style={{ margin: "6px 0 0" }}>نوع فضا، فعالیت، متراژ و زیرساخت‌های ضروری را مشخص کن. شرایط خاص اختیاری است.</p>
                      </div>
                      <ShedRequestFields value={form.shedRequest} disabled={loading} error={errors.shedRequest} onChange={(shedRequest) => { setForm(current => ({ ...current, shedRequest })); setErrors(current => ({ ...current, shedRequest: "" })); }} />
                    </>
                  )}
                  {isWanted && parking?.category === "storage" && (
                    <>
                      <div style={{ padding: 14, background: "#fff8f2", border: "1px solid #f3d7c2", borderRadius: 14 }}>
                        <strong>فضایی را که لازم داری توصیف کن</strong>
                        <p style={{ margin: "6px 0 0" }}>کاربری، متراژ موردنیاز، امکانات و شرایط خاص را در کادر زیر ویرایش کن. «شرایط خاص» اختیاری است.</p>
                      </div>
                      <WarehouseRequestFields value={form.warehouseRequest} disabled={loading} error={errors.warehouseRequest} onChange={(warehouseRequest) => { setForm(current => ({ ...current, warehouseRequest })); setErrors(current => ({ ...current, warehouseRequest: "" })); }} />
                    </>
                  )}
                </div>
              </section>

              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon">⌖</div>
                  <div>
                    <span>موقعیت مکانی</span>
                    <h2>ویرایش موقعیت روی نقشه</h2>
                    <p>{isWanted ? "محدوده مطلوب ثبت‌شده را ببین و فقط در صورت نیاز تغییر بده." : parking?.category === "parking" ? "اگر هنوز نقطه‌ای ثبت نشده، نقشه فقط مرکز شهر را نشان می‌دهد؛ برای ثبت محل پارکینگ روی نقشه کلیک کن." : "نقطه فعلی آگهی را ببین و در صورت نیاز جای آن را تغییر بده."}</p>
                  </div>
                </div>
                <div className="edit-parking-card__body">
                  <NeshanLocationPicker
                    value={form.location}
                    city={form.city}
                    disabled={loading}
                    onChange={(location) => {
                      setForm((currentForm) => ({ ...currentForm, location }));
                      setShowSuccess(false);
                    }}
                  />
                </div>
              </section>

              {!isWanted && (
              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon edit-parking-card__icon--cyan">
                    02
                  </div>

                  <div>
                    <span>
                      تصویر آگهی
                    </span>

                    <h2>
                      عکس‌های آگهی
                    </h2>

                    <p>
                      تا ۸ عکس نگه دار، عکس جدید اضافه کن یا عکس اصلی کارت را تغییر بده.
                    </p>
                  </div>
                </div>

                <div className="edit-parking-card__body">
                  <div
                    className={[
                      "edit-parking-uploader",
                      form.imageUrl
                        ? "edit-parking-uploader--complete"
                        : "",
                      errors.imageUrl
                        ? "edit-parking-uploader--error"
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
                    <span className="edit-parking-error edit-parking-error--block">
                      {errors.imageUrl}
                    </span>
                  )}

                  {form.imageUrl && (
                    <div className="edit-parking-image-status">
                      <span>✓</span>

                      <div>
                        <strong>
                          {form.imageUrls.length.toLocaleString("fa-IR")} عکس آگهی آماده است
                        </strong>

                        <p>
                          اولین عکس روی کارت و همه عکس‌ها در گالری صفحه جزئیات نمایش داده می‌شوند.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              )}

              {!isWanted && (
                <section className="edit-parking-card">
                  <div className="edit-parking-card__header">
                    <div className="edit-parking-card__icon edit-parking-card__icon--cyan">▶</div>
                    <div>
                      <span>رسانه آگهی</span>
                      <h2>ویدئوی کوتاه فضا</h2>
                      <p>اختیاری؛ حداکثر ۲ دقیقه و ۱۰۰ مگابایت. می‌توانی ویدئو را نگه داری، حذف یا جایگزین کنی.</p>
                    </div>
                  </div>
                  <div className="edit-parking-card__body">
                    <VideoUploader
                      persisted
                      video={form.video}
                      onChange={(video) => { setForm((current) => ({ ...current, video })); setShowSuccess(false); }}
                    />
                  </div>
                </section>
              )}

              <section className="edit-parking-card">
                <div className="edit-parking-card__header">
                  <div className="edit-parking-card__icon edit-parking-card__icon--green">
                    {isWanted ? "02" : "03"}
                  </div>

                  <div>
                    <span>
                      جزئیات نهایی
                    </span>

                    <h2>
                      {isWanted ? "بودجه و اطلاعات تماس" : "قیمت و اطلاعات تماس"}
                    </h2>

                    <p>
                      اطلاعاتی که کاربران
                      برای تصمیم‌گیری نیاز
                      دارند.
                    </p>
                  </div>
                </div>

                <div className="edit-parking-card__body">
                  {!isWanted && parking?.category === "garden" && form.gardenOffer.financialMode === "full_deposit" && <p className="fj-go-price-note">رهن کامل باغ: {formatPriceInput(form.gardenOffer.depositRial)} ریال؛ این آگهی اجاره ندارد.</p>}
                  <div className="edit-parking-grid">
                    {parking?.category !== "residential" && !(!isWanted && (parking?.category === "shop" || (parking?.category === "garden" && form.gardenOffer.financialMode === "full_deposit"))) && !(isWanted && ["land", "shop", "villa", "garden", "other"].includes(parking?.category)) && !(!isWanted && parking?.category === "villa" && form.villaOffer.rentalTerm === "long") && (
<div className="edit-parking-field" style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: form.priceType === "negotiable" ? "minmax(0, 1fr)" : "minmax(145px, 1fr) minmax(0, 2fr)", gap: "12px", alignItems: "end", direction: "rtl" }}>
                      <div className="edit-parking-field" style={{ margin: 0 }}>
                        <label htmlFor="priceType">{isWanted ? "دوره بودجه" : parking?.category === "garden" ? "دوره اجاره باغ" : "نوع قیمت"} <span>*</span></label>
                        <div className="edit-parking-input">
                          <select id="priceType" name="priceType" value={form.priceType} onChange={handleChange} disabled={loading}
                            style={{ width: "100%", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" }}>
                            {(parking?.category === "villa" ? PRICE_TYPES.filter((item) => ["daily", "weekly", "monthly", "negotiable"].includes(item.value)) : PRICE_TYPES).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          </select>
                        </div>
                      </div>
                      {form.priceType !== "negotiable" && (
                        <div className="edit-parking-field" style={{ margin: 0 }}>
                          <label htmlFor="price">{isWanted ? "سقف بودجه پیشنهادی" : parking?.category === "garden" ? "مبلغ اجاره باغ (ریال)" : "قیمت"} <span>*</span></label>
                          <div className={`edit-parking-input${errors.price ? " edit-parking-input--error" : ""}`}>
                            <span className="edit-parking-input__icon">﷼</span>
                            <input id="price" name="price" type="text" inputMode="numeric" value={form.price} onChange={handleChange} placeholder="مبلغ به ریال" autoComplete="off" disabled={loading} />
                            <span className="edit-parking-input__suffix">ریال</span>
                          </div>
                          {errors.price && <span className="edit-parking-error">{errors.price}</span>}
                        </div>
                      )}
                    </div>
              )}

                    <div className="edit-parking-field">
                      <label htmlFor="phone">
                        شماره تماس
                        <span>*</span>
                      </label>

                      <div
                        className={[
                          "edit-parking-input",
                          errors.phone
                            ? "edit-parking-input--error"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="edit-parking-input__icon">
                          ☎
                        </span>

                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          inputMode="numeric"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="09123456789"
                          maxLength={11}
                          dir="ltr"
                          disabled={loading}
                        />
                      </div>

                      {errors.phone && (
                        <span className="edit-parking-error">
                          {errors.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {!(["parking", "storage", "warehouse", "land", "shop", "garden", "residential", "villa"].includes(parking?.category) && !isWanted) && !(isWanted && ["storage", "warehouse", "parking", "shop", "land", "residential", "villa", "garden", "other"].includes(parking?.category)) && (
                  <div className="edit-parking-field edit-parking-field--full">
                    <label htmlFor="description">
                      {isWanted ? "توضیحات درخواست" : "توضیحات آگهی"}
                      <span>*</span>
                    </label>

                    <div
                      className={[
                        "edit-parking-textarea",
                        errors.description
                          ? "edit-parking-input--error"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <textarea
                        id="description"
                        name="description"
                        value={
                          form.description
                        }
                        onChange={handleChange}
                        placeholder="درباره موقعیت، امنیت، دسترسی، مسقف بودن و سایر ویژگی‌های پارکینگ توضیح بده..."
                        rows={7}
                        maxLength={800}
                        disabled={loading}
                      />
                    </div>

                    <div className="edit-parking-field__meta">
                      {errors.description ? (
                        <span className="edit-parking-error">
                          {
                            errors.description
                          }
                        </span>
                      ) : (
                        <span>
                          جزئیاتی بنویس که
                          ابهام کاربر را کم
                          کند.
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
                </div>
              </section>

              <label className="edit-parking-network-consent">
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
                  <strong>کمک مشاوران فضاجو برای پیدا کردن {isWanted ? "فایل مناسب" : "مشتری"}</strong>
                  <small>
                    {isWanted
                      ? "مایلم مشاوران تأییدشده فضاجو برای پیدا کردن فایل مناسب با من ارتباط بگیرند."
                      : "مایلم مشاوران تأییدشده فضاجو بتوانند برای این آگهی با من ارتباط بگیرند."}
                  </small>
                </span>
              </label>

              <div className="edit-parking-actions">
                <button
                  type="button"
                  className="edit-parking-button edit-parking-button--cancel"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  انصراف
                </button>

                <div>
                  <button
                    type="button"
                    className="edit-parking-button edit-parking-button--reset"
                    onClick={resetChanges}
                    disabled={
                      loading || !hasChanges
                    }
                  >
                    بازنشانی تغییرات
                  </button>

                  <button
                    type="submit"
                    className="edit-parking-button edit-parking-button--save"
                    disabled={
                      loading || !hasChanges
                    }
                  >
                    {loading ? (
                      <>
                        <span className="edit-parking-spinner" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        ذخیره تغییرات
                        <span>✓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <aside className="edit-parking-sidebar">
              <section className="edit-parking-preview">
                <div className="edit-parking-preview__top">
                  <div>
                    <span>
                      پیش‌نمایش زنده
                    </span>

                    <strong>
                      {isWanted ? "کارت درخواست شما" : "کارت آگهی شما"}
                    </strong>
                  </div>

                  <span className="edit-parking-preview__live">
                    <i />
                    زنده
                  </span>
                </div>

                <div className="edit-parking-preview__image">
                  {isWanted ? (
                    <div className="edit-parking-preview__placeholder" role="img" aria-label="درخواست پارکینگ بدون نیاز به تصویر">
                      <span>🔎</span>
                      <p>{parkingUsageLabel(form.parkingRequestUsage, form.parkingOtherUsage)}</p>
                    </div>
                  ) : form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt={
                        form.title ||
                        "تصویر پارکینگ"
                      }
                    />
                  ) : (
                    <div className="edit-parking-preview__placeholder">
                      <span>▧</span>
                      <p>
                        تصویر آگهی اینجا
                        نمایش داده می‌شود
                      </p>
                    </div>
                  )}

                  <span className="edit-parking-preview__badge">
                    {isWanted ? "درخواست فعال" : "آماده انتشار"}
                  </span>
                </div>

                <div className="edit-parking-preview__content">
                  <div className="edit-parking-preview__location">
                    <span>⌖</span>

                    {form.city ||
                      (isWanted ? "شهر موردنظر" : "شهر پارکینگ")}
                  </div>

                  <h3>
                    {form.title ||
                      (isWanted ? "عنوان درخواست پارکینگ" : "عنوان آگهی پارکینگ")}
                  </h3>

                  <p>
                    {(isWanted && parking?.category === "other" ? form.otherRequest.requestText : form.description) ||
                      (isWanted ? "شرایط موردنیاز شما در این بخش نمایش داده می‌شود." : parking?.category === "parking" ? "ویژگی‌های واقعی پارکینگ در بخش مشخصات تخصصی نمایش داده می‌شوند." : parking?.category === "storage" ? [storageOfferLabel(STORAGE_TYPES,form.storageOffer.spaceType), storageOfferLabel(STORAGE_ACCESS,form.storageOffer.access)].filter(Boolean).join(" • ") || "ویژگی‌های واقعی انبار در بخش مشخصات تخصصی نمایش داده می‌شوند." : parking?.category === "warehouse" ? [industrialLabel(INDUSTRIAL_TYPES,form.industrialOffer.spaceType), industrialLabel(INDUSTRIAL_POWER,form.industrialOffer.power)].filter(Boolean).join(" • ") || "ویژگی‌های واقعی سوله یا کارگاه در بخش مشخصات تخصصی نمایش داده می‌شوند." : parking?.category === "land" ? [landOfferLabel(LAND_OFFER_TYPES,form.landOffer.landType),landOfferLabel(LAND_OFFER_ROADS,form.landOffer.accessRoad)].filter(Boolean).join(" • ") || "ویژگی‌های واقعی زمین در بخش مشخصات تخصصی نمایش داده می‌شوند." : parking?.category === "shop" ? [shopOfferLabel(SHOP_OFFER_TYPES,form.shopOffer.spaceType),shopOfferLabel(SHOP_OFFER_TRANSFERS,form.shopOffer.transferType)].filter(Boolean).join(" • ") || "ویژگی‌های واقعی مغازه در مشخصات تخصصی نمایش داده می‌شوند." : "توضیحات آگهی پس از وارد کردن در این بخش نمایش داده می‌شود.")}
                  </p>

                  <div className="edit-parking-preview__features">
                    <span>
                      <i>↔</i>

                      {isWanted && parking?.category === "other"
                        ? (otherRequestAreaText(form.otherRequest) || "متراژ توافقی")
                        : isWanted && parking?.category === "garden"
                        ? (gardenRequestAreaText(form.gardenRequest) || "متراژ ثبت نشده")
                        : isWanted && parking?.category === "villa"
                        ? (villaRequestAreaText(form.villaRequest) || "ظرفیت نامشخص")
                        : isWanted && parking?.category === "residential"
                        ? (residentialRequestAreaText(form.residentialRequest) || "متراژ نامشخص")
                        : form.area ? `${form.area} متر` : "متراژ نامشخص"}
                    </span>

                    <span>
                      <i>☎</i>

                      {form.phone ||
                        "شماره تماس"}
                    </span>
                  </div>

                  <div className="edit-parking-preview__price">
                    <span>
                      {isWanted ? "بودجه پیشنهادی" : "هزینه استفاده"}
                    </span>

                    <strong>
                      {isWanted && parking?.category === "other"
                        ? (otherRequestBudgetText(form.otherRequest) || "بودجه توافقی")
                        : isWanted && parking?.category === "garden"
                        ? (gardenRequestBudgetText(form.gardenRequest) || "بودجه ثبت نشده")
                        : isWanted && parking?.category === "villa"
                        ? (villaRequestBudgetText(form.villaRequest) || "بودجه ثبت نشده")
                        : isWanted && parking?.category === "residential"
                        ? (residentialRequestBudgetText(form.residentialRequest) || "بودجه ثبت نشده")
                        : !isWanted && parking?.category === "villa"
                        ? (villaFinancialHeadline(makeVillaAttributes(form.villaOffer,form.villaDetails),form.price,form.priceType) || "شرایط مالی ثبت نشده")
                        : !isWanted && parking?.category === "residential"
                        ? (residentialFinancialHeadline(residentialDetailsForActiveContract(form.residentialOffer, form.residentialDetails), makeResidentialAttributes(form.residentialOffer, form.residentialDetails)) || "شرایط مالی ثبت نشده")
                        : !isWanted && parking?.category === "shop"
                        ? (shopFinancialHeadline(makeShopAttributes(form.shopOffer)) || "شرایط مالی توافقی")
                        : form.priceType === "negotiable"
                        ? "توافقی"
                        : form.price
                          ? `${form.price} ریال - ${getPriceTypeLabel(form.priceType)}`
                          : (isWanted ? "بودجه ثبت نشده" : "قیمت ثبت نشده")}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="edit-parking-completion">
                <div className="edit-parking-completion__header">
                  <div>
                    <span>
                      {isWanted ? "کامل بودن درخواست" : "کامل بودن آگهی"}
                    </span>

                    <strong>
                      {completionPercentage}٪
                    </strong>
                  </div>

                  <span>
                    {completionPercentage ===
                    100
                      ? "عالی"
                      : "در حال تکمیل"}
                  </span>
                </div>

                <div className="edit-parking-completion__bar">
                  <span
                    style={{
                      width: `${completionPercentage}%`,
                    }}
                  />
                </div>

                <p>
                  {isWanted
                    ? "درخواست‌های دقیق‌تر، پیدا کردن پارکینگ مناسب را آسان‌تر می‌کنند. عکس و فیلم برای درخواست لازم نیست."
                    : "آگهی‌های کامل‌تر اعتماد و بازدید بیشتری دریافت می‌کنند."}
                </p>
              </section>

              <section className="edit-parking-tip">
                <span>✦</span>

                <div>
                  <strong>
                    قبل از ذخیره بررسی کن
                  </strong>

                  <p>
                    {isWanted
                      ? "شهر، محدوده روی نقشه، بودجه، شماره تماس و شرایط موردنیازت را دوباره بررسی کن."
                      : "قیمت، شماره تماس و تصویر آگهی را دوباره بررسی کن تا کاربران اطلاعات اشتباه نبینند."}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default EditParking;