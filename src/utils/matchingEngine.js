const CATEGORY_LABELS = {
  parking: "پارکینگ",
  residential: "مسکونی",
  villa: "ویلا",
  storage: "انبار",
  warehouse: "سوله",
  shop: "مغازه",
  land: "زمین",
  other: "سایر فضاها",
};

const STOP_WORDS = new Set([
  "برای",
  "دارم",
  "هستم",
  "دنبال",
  "فضا",
  "فضای",
  "اجاره",
  "مورد",
  "نیاز",
  "یک",
  "این",
  "آن",
  "در",
  "به",
  "از",
  "با",
  "و",
  "یا",
  "تا",
]);

const SPACE_SYNONYMS = [
  [
    "پشت بام",
    "پشت‌بام",
    "روف گاردن",
    "روف‌گاردن",
    "روفگاردن",
  ],
  [
    "پارکینگ",
    "جای پارک",
    "پارک خودرو",
  ],
  [
    "مسکونی","آپارتمان","خانه","منزل","خانه ویلایی","ویلایی","سوئیت","پنت هاوس","پنت‌هاوس"
  ],
  [
    "ویلا",
    "ویلای تفریحی",
    "اقامتگاه ویلایی",
    "ویلا استخردار",
    "اجاره ویلا",
  ],
  [
    "انبار",
    "انباری",
    "فضای ذخیره",
  ],
  [
    "سوله",
    "کارگاه",
    "فضای صنعتی",
  ],
  [
    "مغازه",
    "فروشگاه",
    "واحد تجاری",
  ],
  [
    "زمین",
    "قطعه زمین",
    "محوطه",
  ],
  [
    "طویله",
    "دامداری",
    "جای دام",
    "اصطبل",
  ],
];

function normalizeDigits(value) {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return String(value ?? "")
    .replace(
      /[۰-۹]/g,
      (digit) =>
        persianDigits.indexOf(digit)
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        arabicDigits.indexOf(digit)
    );
}

export function normalizeNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  const normalizedValue =
    normalizeDigits(value)
      .replace(/,/g, "")
      .replace(/٬/g, "")
      .replace(/[^\d.]/g, " ");

  const numbers =
    normalizedValue.match(
      /\d+(\.\d+)?/g
    );

  if (!numbers) {
    return 0;
  }

  return Number(
    numbers.join("")
  );
}

export function normalizeText(
  value = ""
) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200d\u200e\u200f]/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأٱ]/g, "ا")
    .replace(/[َُِّْٰ]/g, "")
    .replace(
      /[^\u0600-\u06FFa-z0-9\s-]/g,
      " "
    )
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(value = "") {
  return normalizeText(value)
    .split(" ")
    .filter(
      (word) =>
        word.length >= 2 &&
        !STOP_WORDS.has(word)
    );
}

function expandSynonyms(tokens) {
  const expanded =
    new Set(tokens);

  SPACE_SYNONYMS.forEach(
    (group) => {
      const normalizedGroup =
        group.map(normalizeText);

      const found =
        normalizedGroup.some(
          (phrase) =>
            tokens.some(
              (token) =>
                phrase.includes(
                  token
                ) ||
                token.includes(
                  phrase
                )
            )
        );

      if (found) {
        normalizedGroup.forEach(
          (phrase) => {
            phrase
              .split(" ")
              .filter(Boolean)
              .forEach(
                (token) =>
                  expanded.add(
                    token
                  )
              );
          }
        );
      }
    }
  );

  return [...expanded];
}

export function getCategoryLabel(
  item
) {
  if (!item) {
    return "فضا";
  }

  if (
    item.category === "other"
  ) {
    return (
      item.customCategory ||
      item.categoryLabel ||
      "سایر فضاها"
    );
  }

  return (
    item.categoryLabel ||
    CATEGORY_LABELS[
      item.category
    ] ||
    "فضا"
  );
}

function getIdentityText(item) {
  return [
    item?.category || "",
    getCategoryLabel(item),
    item?.customCategory || "",
    item?.title || "",
    item?.description || "",
  ].join(" ");
}

function getIdentityTokens(item) {
  return expandSynonyms(
    tokenize(
      getIdentityText(item)
    )
  );
}

function getKeywordSimilarity(
  request,
  offer
) {
  const requestTokens =
    getIdentityTokens(request);

  const offerTokens =
    new Set(
      getIdentityTokens(offer)
    );

  if (!requestTokens.length) {
    return 0;
  }

  const matches =
    requestTokens.filter(
      (token) =>
        offerTokens.has(token)
    ).length;

  return (
    matches /
    Math.max(
      requestTokens.length,
      1
    )
  );
}

function getTextMatchReason(
  similarity
) {
  if (similarity >= 0.65) {
    return "نوع فضای خاص بسیار نزدیک";
  }

  if (similarity >= 0.35) {
    return "نوع فضای خاص مشابه";
  }

  return "";
}

function getAreaScore(
  requestArea,
  offerArea
) {
  if (
    !requestArea ||
    !offerArea
  ) {
    return {
      score: 0,
      reason: "",
    };
  }

  const ratio =
    Math.abs(
      requestArea -
        offerArea
    ) /
    Math.max(
      requestArea,
      1
    );

  if (ratio <= 0.1) {
    return {
      score: 15,
      reason:
        "متراژ بسیار نزدیک",
    };
  }

  if (ratio <= 0.25) {
    return {
      score: 10,
      reason:
        "متراژ نزدیک",
    };
  }

  if (ratio <= 0.4) {
    return {
      score: 5,
      reason:
        "متراژ قابل بررسی",
    };
  }

  return {
    score: 0,
    reason: "",
  };
}

function getBudgetScore(
  requestBudget,
  offerPrice
) {
  if (
    !requestBudget ||
    !offerPrice
  ) {
    return {
      score: 0,
      reason: "",
    };
  }

  if (
    offerPrice <=
    requestBudget
  ) {
    return {
      score: 15,
      reason:
        "در محدوده بودجه",
    };
  }

  const ratio =
    offerPrice /
    requestBudget;

  if (ratio <= 1.1) {
    return {
      score: 9,
      reason:
        "کمی بالاتر از بودجه",
    };
  }

  if (ratio <= 1.25) {
    return {
      score: 3,
      reason:
        "بالاتر از بودجه",
    };
  }

  return {
    score: 0,
    reason: "",
  };
}

function getCategoryScore(
  request,
  offer
) {
  const requestCategory =
    request.category ||
    "parking";

  const offerCategory =
    offer.category ||
    "parking";

  if (
    requestCategory !==
    offerCategory
  ) {
    return {
      score: 0,
      reasons: [],
      hardReject: true,
    };
  }

  if (
    requestCategory !==
    "other"
  ) {
    return {
      score: 40,
      reasons: [
        "نوع فضا یکسان",
      ],
      hardReject: false,
    };
  }

  const similarity =
    getKeywordSimilarity(
      request,
      offer
    );

  if (similarity < 0.2) {
    return {
      score: 0,
      reasons: [],
      hardReject: true,
    };
  }

  const reason =
    getTextMatchReason(
      similarity
    );

  return {
    score:
      similarity >= 0.65
        ? 40
        : similarity >= 0.35
          ? 30
          : 22,

    reasons:
      reason
        ? [reason]
        : [],

    hardReject: false,
  };
}

function normalizeCity(value = "") {
  return normalizeText(value)
    .replace(/^(شهرستان|شهر)\s+/g, "")
    .replace(/\s+/g, "");
}

function getLocationScore(
  request,
  offer
) {
  const requestCity =
    normalizeCity(
      request.city
    );

  const offerCity =
    normalizeCity(
      offer.city
    );

  if (
    !requestCity ||
    !offerCity
  ) {
    return {
      score: 0,
      reasons: [],
      hardReject: false,
    };
  }

  if (
    requestCity ===
    offerCity
  ) {
    return {
      score: 25,
      reasons: [
        "شهر یکسان",
      ],
      hardReject: false,
    };
  }

  return {
    score: 0,
    reasons: [],
    hardReject: true,
  };
}

function getResidentialScore(request, offer) {
  if (request.category !== "residential" || offer.category !== "residential") {
    return { score: 0, reasons: [], hardReject: false };
  }
  const r=request.residentialDetails || {};
  const o=offer.residentialDetails || {};
  let score=0; const reasons=[];
  if (r.propertyType && o.propertyType) {
    if (r.propertyType !== o.propertyType) return {score:0,reasons:[],hardReject:true};
    score += 8; reasons.push("نوع ملک یکسان");
  }
  if (Number(r.bedrooms)>0 && Number(o.bedrooms)>0) {
    if (Number(o.bedrooms) >= Number(r.bedrooms)) { score += 5; reasons.push("تعداد اتاق مناسب"); }
  }
  const rd=Number(r.deposit)||0, od=Number(o.deposit)||0;
  const rr=Number(r.monthlyRent)||0, orr=Number(o.monthlyRent)||0;
  if (rd && od && od <= rd*1.1) { score += 5; reasons.push("رهن نزدیک به بودجه"); }
  if (rr && orr && orr <= rr*1.1) { score += 5; reasons.push("اجاره نزدیک به بودجه"); }
  for (const [k,label] of [["elevator","آسانسور"],["parking","پارکینگ"],["storage","انباری"],["furnished","مبله"]]) {
    if (r[k] && !o[k]) return {score:0,reasons:[],hardReject:true};
    if (r[k] && o[k]) { score += 2; reasons.push(label); }
  }
  return {score:Math.min(score,15),reasons,hardReject:false};
}

function getRecencyScore(
  item
) {
  const date =
    item?.createdAt
      instanceof Date
      ? item.createdAt
      : item?.createdAt
          ?.toDate?.() ||
        null;

  if (!date) {
    return {
      score: 0,
      reason: "",
    };
  }

  const ageInDays =
    (
      Date.now() -
      date.getTime()
    ) /
    (
      1000 *
      60 *
      60 *
      24
    );

  if (ageInDays <= 7) {
    return {
      score: 5,
      reason:
        "فایل تازه",
    };
  }

  if (ageInDays <= 30) {
    return {
      score: 3,
      reason:
        "فایل نسبتاً تازه",
    };
  }

  return {
    score: 0,
    reason: "",
  };
}

export function scoreMatch(
  request,
  offer
) {
  if (
    !request ||
    !offer
  ) {
    return {
      score: 0,
      reasons: [],
      eligible: false,
    };
  }

  if (
    request.listingType !==
      "wanted" ||
    (
      offer.listingType ||
      "offer"
    ) === "wanted"
  ) {
    return {
      score: 0,
      reasons: [],
      eligible: false,
    };
  }

  /*
   * یک کاربر نباید فایل خودش را
   * با درخواست خودش Match کند.
   */
  if (
    request.ownerId &&
    offer.ownerId &&
    request.ownerId ===
      offer.ownerId
  ) {
    return {
      score: 0,
      reasons: [],
      eligible: false,
    };
  }

  if (
    offer.status &&
    offer.status !==
      "active"
  ) {
    return {
      score: 0,
      reasons: [],
      eligible: false,
    };
  }

  const categoryResult =
    getCategoryScore(
      request,
      offer
    );

  if (
    categoryResult.hardReject
  ) {
    return {
      score: 0,
      reasons: [],
      eligible: false,
    };
  }

  const locationResult =
    getLocationScore(
      request,
      offer
    );

  if (
    locationResult.hardReject
  ) {
    return {
      score: 0,
      reasons: [],
      eligible: false,
    };
  }

  const residentialResult = getResidentialScore(request, offer);
  if (residentialResult.hardReject) {
    return { score: 0, reasons: [], eligible: false };
  }

  let score =
    categoryResult.score +
    locationResult.score +
    residentialResult.score;

  const reasons = [
    ...categoryResult.reasons,
    ...locationResult.reasons,
    ...residentialResult.reasons,
  ];

  const areaResult =
    getAreaScore(
      normalizeNumber(
        request.area
      ),
      normalizeNumber(
        offer.area
      )
    );

  score +=
    areaResult.score;

  if (areaResult.reason) {
    reasons.push(
      areaResult.reason
    );
  }

  const budgetResult =
    getBudgetScore(
      normalizeNumber(
        request.price
      ),
      normalizeNumber(
        offer.price
      )
    );

  score +=
    budgetResult.score;

  if (
    budgetResult.reason
  ) {
    reasons.push(
      budgetResult.reason
    );
  }

  const recencyResult =
    getRecencyScore(offer);

  score +=
    recencyResult.score;

  if (
    recencyResult.reason
  ) {
    reasons.push(
      recencyResult.reason
    );
  }

  score = Math.min(
    Math.round(score),
    100
  );

  return {
    score,
    reasons,
    eligible:
      score >= 45,
  };
}

function rankForRequest(
  request,
  offers
) {
  return offers
    .map((offer) => {
      const result =
        scoreMatch(
          request,
          offer
        );

      return {
        offer,
        ...result,
      };
    })
    .filter(
      (item) =>
        item.eligible
    )
    .sort(
      (a, b) =>
        b.score -
        a.score
    );
}

export function buildMatchingDashboard({
  parkings = [],
  currentUser = null,
}) {
  const offers =
    parkings.filter(
      (item) =>
        (
          item.listingType ||
          "offer"
        ) !== "wanted"
    );

  const requests =
    parkings.filter(
      (item) =>
        item.listingType ===
        "wanted"
    );

  const myOffers =
    currentUser
      ? offers.filter(
          (item) =>
            item.ownerId ===
            currentUser.uid
        )
      : [];

  const myRequests =
    currentUser
      ? requests.filter(
          (item) =>
            item.ownerId ===
            currentUser.uid
        )
      : [];

  /*
   * درخواست‌های دیگران
   */
  const publicRequests =
    currentUser
      ? requests.filter(
          (item) =>
            item.ownerId !==
            currentUser.uid
        )
      : requests;

  /*
   * فایل‌های دیگران
   */
  const publicOffers =
    currentUser
      ? offers.filter(
          (item) =>
            item.ownerId !==
            currentUser.uid
        )
      : offers;

  /*
   * برای فایل‌های من،
   * درخواست مناسب دیگران
   */
  const myOfferOpportunities =
    publicRequests
      .map((request) => {
        const candidates =
          rankForRequest(
            request,
            myOffers
          ).slice(0, 5);

        return {
          request,
          candidates,
          bestScore:
            candidates[0]
              ?.score || 0,
        };
      })
      .filter(
        (item) =>
          item.candidates
            .length > 0
      )
      .sort(
        (a, b) =>
          b.bestScore -
          a.bestScore
      );

  /*
   * برای درخواست‌های من،
   * فایل مناسب دیگران
   */
  const myRequestMatches =
    myRequests
      .map((request) => {
        const candidates =
          rankForRequest(
            request,
            publicOffers
          ).slice(0, 5);

        return {
          request,
          candidates,
          bestScore:
            candidates[0]
              ?.score || 0,
        };
      })
      .filter(
        (item) =>
          item.candidates
            .length > 0
      )
      .sort(
        (a, b) =>
          b.bestScore -
          a.bestScore
      );

  /*
   * فرصت‌های شبکه فضاجو
   *
   * فقط:
   * درخواست‌های دیگران
   * ×
   * فایل‌های دیگران
   *
   * هیچ فایل یا درخواست متعلق
   * به currentUser وارد این بخش نمی‌شود.
   */
  const networkOpportunities =
    publicRequests
      .map((request) => {
        const candidates =
          rankForRequest(
            request,
            publicOffers
          ).slice(0, 5);

        return {
          request,
          candidates,
          bestScore:
            candidates[0]
              ?.score || 0,
        };
      })
      .filter(
        (item) =>
          item.candidates
            .length > 0
      )
      .sort(
        (a, b) =>
          b.bestScore -
          a.bestScore
      );

  return {
    offers,
    requests,
    myOffers,
    myRequests,
    myOfferOpportunities,
    myRequestMatches,
    networkOpportunities,
  };
}