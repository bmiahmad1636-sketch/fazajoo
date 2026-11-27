import { showInSiteAlert, showInSiteConfirm } from "../utils/inSiteDialog";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getAdminUsers,
  approveAgent as approveAgentApi,
  rejectAgent as rejectAgentApi,
  getAdminDocumentBlob,
  getAdminNetworkAgents,
  grantAdminNetworkCredits,
} from "../services/adminService";

import "./AdminDashboard.css";
import "./AdminWorkspaceADM01.css";
import { filterAdminAgents, adminPage, adminCount } from "../utils/adminWorkspaceADM01";




const DOCUMENT_LABELS = {
  nationalCardFront:
    "روی کارت ملی",

  nationalCardBack:
    "پشت کارت ملی",

  businessLicense:
    "جواز / پروانه کسب",
};


function AdminDashboard() {
  const [workspaceView,setWorkspaceView]=useState("pending");
  const [workspaceQuery,setWorkspaceQuery]=useState("");
  const [workspacePage,setWorkspacePage]=useState(1);
  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    workingUserId,
    setWorkingUserId,
  ] =
    useState("");

  const [
    documentsUserId,
    setDocumentsUserId,
  ] =
    useState("");

  const [
    documentLinks,
    setDocumentLinks,
  ] =
    useState({});

  const [
    documentsLoading,
    setDocumentsLoading,
  ] =
    useState(false);

  const [
    documentsError,
    setDocumentsError,
  ] =
    useState("");


  const [networkCredits, setNetworkCredits] = useState([]);
  const [networkCreditsLoading, setNetworkCreditsLoading] = useState(true);
  const [networkCreditsError, setNetworkCreditsError] = useState("");
  const [grantAmounts, setGrantAmounts] = useState({});
  const [grantWorkingId, setGrantWorkingId] = useState("");
  // Invalidate outstanding requests and release private preview URLs on exit.
  const documentSession = useRef({ generation: 0, urls: {} });
  useEffect(() => {
    const session = documentSession.current;
    return () => {
      session.generation += 1;
      Object.values(session.urls).forEach(item => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
      session.urls = {};
    };
  }, []);



  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError("");

        const loadedUsers = await getAdminUsers();
        setUsers(loadedUsers);
      } catch (loadError) {
        console.error("Admin users load error:", loadError);
        setError("دریافت اطلاعات کاربران انجام نشد.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();

    async function loadNetworkCredits() {
      try {
        setNetworkCreditsLoading(true);
        setNetworkCreditsError("");
        const rows = await getAdminNetworkAgents();
        setNetworkCredits(rows);
      } catch (loadError) {
        console.error("Admin network credits load error:", loadError);
        setNetworkCreditsError(loadError?.message || "دریافت سهمیه مشاوران انجام نشد.");
      } finally {
        setNetworkCreditsLoading(false);
      }
    }

    loadNetworkCredits();
  }, []);


  const agencyUsers =
    useMemo(() => {
      const requestStatuses = [
        "pending",
        "approved",
        "rejected",
      ];

      return users.filter(
        (user) =>
          requestStatuses.includes(
            user.agencyStatus
          )
      );
    }, [users]);


  const pendingRequests =
    useMemo(() => {
      return agencyUsers.filter(
        (user) =>
          user.agencyStatus ===
          "pending"
      );
    }, [agencyUsers]);


  const approvedAgents =
    useMemo(() => {
      return agencyUsers.filter(
        (user) =>
          user.agencyStatus ===
          "approved"
      );
    }, [agencyUsers]);


  const rejectedRequests =
    useMemo(() => {
      return agencyUsers.filter(
        (user) =>
          user.agencyStatus ===
          "rejected"
      );
    }, [agencyUsers]);


  const formatDate = (
    value
  ) => {
    if (!value) {
      return "ثبت نشده";
    }

    const date =
      value?.toDate?.() ||
      value;

    try {
      return new Intl.DateTimeFormat(
        "fa-IR",
        {
          year:
            "numeric",

          month:
            "long",

          day:
            "numeric",

          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      ).format(
        new Date(date)
      );
    } catch {
      return "ثبت نشده";
    }
  };


  const approveAgent =
    async (user) => {
      const confirmed =
        await showInSiteConfirm(
          `آیا حساب «${
            user.agencyName ||
            user.agentName ||
            user.phone ||
            "این مشاور"
          }» تأیید شود؟`
        );

      if (!confirmed) {
        return;
      }

      try {
        setWorkingUserId(
          user.id
        );

        const result =
          await approveAgentApi(user.id);

        if (result?.user) {
          closeDocuments();
          setUsers((currentUsers) =>
            currentUsers.map((currentUser) =>
              currentUser.id === user.id
                ? result.user
                : currentUser
            )
          );
        }

        showInSiteAlert(
          "مشاور با موفقیت تأیید شد."
        );

      } catch (updateError) {
        console.error(
          "Approve agent error:",
          updateError
        );

        showInSiteAlert(
          "تأیید مشاور انجام نشد."
        );

      } finally {
        setWorkingUserId("");
      }
    };


  const rejectAgent =
    async (user) => {
      const confirmed =
        await showInSiteConfirm(
          `آیا درخواست «${
            user.agencyName ||
            user.agentName ||
            user.phone ||
            "این مشاور"
          }» رد شود؟`
        );

      if (!confirmed) {
        return;
      }

      try {
        setWorkingUserId(
          user.id
        );

        const result =
          await rejectAgentApi(user.id);

        if (result?.user) {
          closeDocuments();
          setUsers((currentUsers) =>
            currentUsers.map((currentUser) =>
              currentUser.id === user.id
                ? result.user
                : currentUser
            )
          );
        }

        showInSiteAlert(
          "درخواست مشاور رد شد."
        );

      } catch (updateError) {
        console.error(
          "Reject agent error:",
          updateError
        );

        showInSiteAlert(
          "رد درخواست انجام نشد."
        );

      } finally {
        setWorkingUserId("");
      }
    };


  const revokeDocumentLinks =
    (links) => {
      Object.values(
        links || {}
      ).forEach(
        (item) => {
          if (item?.url) {
            URL.revokeObjectURL(
              item.url
            );
          }
        }
      );
    };


  const downloadDocument =
    async (
      userId,
      documentType,
      documentRecord,
      title = "مدرک"
    ) => {
      try {
        const { blob } =
          await getAdminDocumentBlob(
            userId,
            documentType,
            true
          );

        const objectUrl =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = objectUrl;
        anchor.download =
          documentRecord
            ?.originalFilename ||
          title ||
          "document";

        document.body.appendChild(
          anchor
        );

        anchor.click();
        anchor.remove();

        setTimeout(
          () =>
            URL.revokeObjectURL(
              objectUrl
            ),
          0
        );

      } catch (downloadError) {
        console.error(
          "Download agency document error:",
          downloadError
        );

        showInSiteAlert(
          downloadError?.message ||
            "دانلود مدرک انجام نشد."
        );
      }
    };


  const closeDocuments = () => {
    const session = documentSession.current;
    session.generation += 1;
    revokeDocumentLinks(session.urls);
    session.urls = {};
    setDocumentsUserId("");
    setDocumentLinks({});
    setDocumentsError("");
    setDocumentsLoading(false);
  };

  const toggleDocuments = async (user) => {
    if (documentsLoading || workingUserId || grantWorkingId) return;
    if (documentsUserId === user.id) {
      closeDocuments();
      return;
    }
    closeDocuments();
    const session = documentSession.current;
    const generation = session.generation;
    setDocumentsUserId(user.id);
    setDocumentsLoading(true);

    try {
      const records = user.agencyDocuments || {};
      const availableEntries = Object.keys(DOCUMENT_LABELS)
        .map(key => [key, records[key]])
        .filter(([, record]) => Boolean(record?.key || record?.url));
      if (!availableEntries.length) {
        throw new Error("برای آخرین درخواست این مشاور مدرکی ثبت نشده است.");
      }
      const results = await Promise.allSettled(availableEntries.map(
        async ([key]) => (await getAdminDocumentBlob(user.id, key)).blob
      ));
      if (session.generation !== generation) return;
      const links = {};
      // Keep successful previews even when another file is unavailable.
      session.urls = links;
      results.forEach((result, index) => {
        const [key, record] = availableEntries[index];
        links[key] = result.status === "fulfilled"
          ? { url: URL.createObjectURL(result.value), record }
          : { error: true };
      });
      setDocumentLinks(links);
    } catch (documentError) {
      if (session.generation !== generation) return;
      revokeDocumentLinks(session.urls);
      session.urls = {};
      setDocumentsError(documentError?.message || "دریافت مدارک انجام نشد.");
    } finally {
      if (session.generation === generation) setDocumentsLoading(false);
    }
  };

  const renderDocumentsButton = user => (
    <button
      type="button"
      className="admin-dashboard__documents-button adm01-documents-button"
      disabled={Boolean(workingUserId || grantWorkingId || documentsLoading)}
      aria-expanded={documentsUserId === user.id}
      onClick={() => toggleDocuments(user)}
    >
      {documentsUserId === user.id ? "بستن مدارک" : "🔐 مشاهده مدارک"}
    </button>
  );

  const renderDocumentsPanel = user => documentsUserId === user.id && (
    <section className="admin-dashboard__documents-panel adm01-shared-documents" aria-label="مدارک آخرین درخواست مشاور">
      <div className="admin-dashboard__documents-heading">
        <div><span>🔐 پرونده احراز</span><h4>مدارک هویتی و صنفی</h4><small>آخرین درخواست ثبت‌شده</small></div>
        <small>دسترسی فقط برای مدیر</small>
      </div>
      {documentsLoading ? (
        <div className="admin-dashboard__documents-state" role="status">در حال ساخت دسترسی امن به مدارک...</div>
      ) : documentsError ? (
        <div className="admin-dashboard__documents-state admin-dashboard__documents-state--error" role="alert">{documentsError}</div>
      ) : (
        <div className="admin-dashboard__documents-grid">
          {Object.entries(DOCUMENT_LABELS).map(([key, title]) => {
            const entry = documentLinks[key];
            if (!entry?.url) return (
              <div key={key} className="admin-dashboard__document-card admin-dashboard__document-card--missing">
                <span>{entry?.error ? "دریافت امن مدرک ناموفق بود" : "مدرک موجود نیست"}</span>
                <strong>{title}</strong>
              </div>
            );
            return (
              <div key={key} className="admin-dashboard__document-card">
                <div className="admin-dashboard__document-image-wrap">
                  <img src={entry.url} alt={title} className="admin-dashboard__document-image" />
                </div>
                <div className="admin-dashboard__document-info">
                  <strong>{title}</strong>
                  <span>{entry.record?.originalFilename || "مدرک احراز"}</span>
                  <div className="admin-dashboard__document-links">
                    <a href={entry.url} target="_blank" rel="noreferrer">مشاهده بزرگ</a>
                    <a href="#" onClick={event => { event.preventDefault(); downloadDocument(user.id, key, entry.record, title); }}>دانلود</a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="admin-dashboard__documents-note">
        <span>⚠️</span><p>این مدارک فقط برای بررسی احراز هویت مشاور استفاده شوند و نباید در اختیار کاربران دیگر قرار بگیرند.</p>
      </div>
    </section>
  );


  const grantNetworkCredits = async (user) => {
    const amount = Number(grantAmounts[user.id] || 0);

    if (!Number.isInteger(amount) || amount < 1) {
      showInSiteAlert("تعداد سهمیه را وارد کنید.");
      return;
    }

    const confirmed = await showInSiteConfirm(
      `آیا ${amount.toLocaleString("fa-IR")} فرصت به سهمیه «${user.agencyName || user.agentName || user.phone || "این مشاور"}» اضافه شود؟`
    );
    if (!confirmed) return;

    try {
      setGrantWorkingId(user.id);
      const result = await grantAdminNetworkCredits(user.id, amount);

      setNetworkCredits((current) =>
        current.map((item) =>
          item.userId === user.id
            ? { ...item, ...result.quota }
            : item
        )
      );
      setGrantAmounts((current) => ({ ...current, [user.id]: "" }));
      showInSiteAlert("سهمیه با موفقیت اضافه شد.");
    } catch (grantError) {
      console.error("Grant network credits error:", grantError);
      showInSiteAlert(grantError?.message || "شارژ سهمیه انجام نشد.");
    } finally {
      setGrantWorkingId("");
    }
  };


  const currentRows = workspaceView === "approved" ? approvedAgents : workspaceView === "rejected" ? rejectedRequests : pendingRequests;
  const filteredRows = useMemo(() => filterAdminAgents(currentRows, workspaceQuery), [currentRows, workspaceQuery]);
  const page = adminPage(filteredRows, workspacePage);
  const navigationLocked = Boolean(documentsLoading || workingUserId || grantWorkingId);
  function changeView(view) {
    if (navigationLocked) return;
    closeDocuments();
    setWorkspaceView(view);
    setWorkspacePage(1);
  }
  function changeQuery(value) {
    if (navigationLocked) return;
    closeDocuments();
    setWorkspaceQuery(value);
    setWorkspacePage(1);
  }
  function changePage(value) {
    if (navigationLocked) return;
    closeDocuments();
    setWorkspacePage(value);
  }
  const tabs = [
    { id: "pending", title: "در انتظار بررسی", count: pendingRequests.length },
    { id: "approved", title: "مشاوران تأییدشده", count: approvedAgents.length },
    { id: "rejected", title: "درخواست‌های ردشده", count: rejectedRequests.length },
  ];
  const count = value => adminCount(value, loading, Boolean(error));
  const activeTab = tabs.find(item => item.id === workspaceView);

  return (
    <main className="admin-dashboard adm01" dir="rtl">
      <header className="adm01-header">
        <div className="adm01-header-inner">
          <div><span className="adm01-kicker">فضاجو / مدیریت عملیات</span><h1>مرکز مدیریت فضاجو</h1><p>رسیدگی به درخواست‌ها، نظارت و مدیریت خدمات در یک میز کار</p></div>
          <Link to="/" className="adm01-home">بازگشت به فضاجو <span aria-hidden="true">←</span></Link>
        </div>
      </header>
      <div className="adm01-layout">
        <aside className="adm01-sidebar" aria-label="ابزارهای مدیریت فضاجو">
          <div className="adm01-sidebar-head"><span>دسترسی مدیریتی</span><strong>ابزارهای عملیات</strong></div>
          <nav className="adm01-tools" aria-label="دسترسی‌های مدیریت">
            <div className="adm01-tool-group"><h2>عملیات و خدمات</h2>
              <Link to="/admin/direct-management" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5"/></svg></span><span><strong>مدیریت کاربران</strong><small>حساب‌ها و دسترسی‌ها</small></span><b aria-hidden="true">←</b></Link>
              <Link to="/admin/featured" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.2-.9Z"/></svg></span><span><strong>ویترین ویژه</strong><small>ظرفیت، صف و درآمد دستی</small></span><b aria-hidden="true">←</b></Link>
            </div>
            <div className="adm01-tool-group"><h2>نظارت و حقوقی</h2>
              <Link to="/admin/legal" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M5 21h14M3 7h18M5 7l-3 7h6L5 7Zm14 0-3 7h6l-3-7Z"/></svg></span><span><strong>امور حقوقی</strong><small>پرونده‌ها و دستورات قضایی</small></span><b aria-hidden="true">←</b></Link>
              <Link to="/admin/moderation" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg></span><span><strong>مرکز تخلفات</strong><small>گزارش‌ها و رسیدگی نظارتی</small></span><b aria-hidden="true">←</b></Link>
            </div>
            <div className="adm01-tool-group"><h2>سیاست‌های نگهداری</h2>
              <Link to="/admin/notification-policy" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><span><strong>تنظیمات اعلان‌ها</strong><small>مدت آرشیو و نگهداری</small></span><b aria-hidden="true">←</b></Link>
              <Link to="/admin/chat-policy" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 4H4a1 1 0 0 0-1 1v12l5-4h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z M8 8h8"/></svg></span><span><strong>تنظیمات گفتگوها</strong><small>آرشیو و سیاست پیام‌ها</small></span><b aria-hidden="true">←</b></Link>
              <Link to="/admin/site-content" className="adm01-tool"><span className="adm01-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span><span><strong>محتوا و هویت سایت</strong><small>مجوزها، تماس و صفحات عمومی</small></span><b aria-hidden="true">←</b></Link>
            </div>
          </nav>
        </aside>
        <div className="adm01-main">
          <section className="adm01-overview" aria-label="خلاصه درخواست‌های مشاوران">
            <div className="adm01-overview-head"><div><span className="adm01-label">خلاصه عملیاتی</span><h2>وضعیت مشاوران</h2></div><span className="adm01-source" role="status">{loading ? "در حال دریافت…" : error ? "اطلاعات در دسترس نیست" : "بر اساس اطلاعات دریافت‌شده"}</span></div>
            <div className="adm01-stats">
              {tabs.map(tab => <button key={tab.id} type="button" className={`adm01-stat adm01-stat--${tab.id}`} aria-pressed={workspaceView===tab.id} disabled={navigationLocked} onClick={()=>changeView(tab.id)}><span>{tab.title}</span><strong>{count(tab.count)}</strong><small>مشاهده فهرست <span aria-hidden="true">←</span></small></button>)}
              <div className="adm01-stat adm01-stat--total"><span>حساب‌های دارای درخواست</span><strong>{count(agencyUsers.length)}</strong><small>آخرین وضعیت هر حساب</small></div>
            </div>
          </section>
          <section className="adm01-workspace" aria-label="میز کار مشاوران">
            <div className="adm01-workspace-head"><div><span className="adm01-label">میز کار / احراز و سهمیه</span><h2>مدیریت مشاوران</h2></div><span className="adm01-source">{!loading && !error ? `${filteredRows.length.toLocaleString("fa-IR")} نتیجه` : "—"}</span></div>
            <div className="adm01-toolbar">
              <div className="adm01-tabs" role="group" aria-label="وضعیت درخواست"><span className="adm01-sr">وضعیت درخواست</span>{tabs.map(tab=><button key={tab.id} type="button" aria-pressed={workspaceView===tab.id} disabled={navigationLocked} onClick={()=>changeView(tab.id)}>{tab.title}<span>{count(tab.count)}</span></button>)}</div>
              <label className="adm01-search"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span className="adm01-sr">جست‌وجوی مشاور</span><input type="search" placeholder="نام، موبایل، شهر یا شماره جواز" value={workspaceQuery} disabled={navigationLocked} onChange={e=>changeQuery(e.target.value)}/></label>
            </div>
            {loading ? <p className="adm01-state" role="status">در حال دریافت اطلاعات مشاوران…</p> : error ? <p className="adm01-state adm01-state--error" role="alert">{error} برای تلاش دوباره، صفحه را تازه کنید.</p> : <>
          {workspaceView === "pending" && (
          <section className="admin-dashboard__panel">

            <div className="admin-dashboard__panel-heading">

              <div>

                <span>
                  درخواست‌های جدید
                </span>

                <h2>
                  در انتظار بررسی
                </h2>

              </div>


              <Link to="/">
                بازگشت به فضاجو
              </Link>

            </div>


            {loading ? (

              <div className="admin-dashboard__state">
                در حال دریافت درخواست‌ها...
              </div>

            ) : error ? (

              <div className="admin-dashboard__state admin-dashboard__state--error">
                {error}
              </div>

            ) : filteredRows.length ===
            0 ? (

              <div className="admin-dashboard__empty">

                <span>
                  ✅
                </span>

                <h3>
                  {workspaceQuery.trim() ? "نتیجه‌ای پیدا نشد" : "درخواست معوقی نداریم"}
                </h3>

                <p>
                  {workspaceQuery.trim() ? "عبارت دیگری را جست‌وجو کنید." : "تمام درخواست‌های مشاوران بررسی شده‌اند."}
                </p>

              </div>

            ) : (

              <div className="admin-dashboard__requests">

                {page.rows.map(
                  (user) => {
                    const working =
                      workingUserId ===
                      user.id;



                    return (
                      <article
                        className="admin-dashboard__request-card"
                        key={user.id}
                      >


                        <div className="admin-dashboard__request-top">

                          <div className="admin-dashboard__request-avatar">
                            🏢
                          </div>


                          <div>

                            <span className="admin-dashboard__pending-badge">
                              در انتظار بررسی
                            </span>

                            <h3>
                              {user.agencyName ||
                                "نام دفتر ثبت نشده"}
                            </h3>

                            <p>
                              {user.agentName ||
                                "نام مشاور ثبت نشده"}
                            </p>

                          </div>

                        </div>


                        <div className="admin-dashboard__request-details">

                          <div>

                            <span>
                              شماره موبایل
                            </span>

                            <strong>
                              {user.phone ||
                                "ثبت نشده"}
                            </strong>

                          </div>


                          <div>

                            <span>
                              شهر فعالیت
                            </span>

                            <strong>
                              {user.agencyCity ||
                                "ثبت نشده"}
                            </strong>

                          </div>


                          <div>

                            <span>
                              زمان درخواست
                            </span>

                            <strong>
                              {formatDate(
                                user.agencyRequestedAt
                              )}
                            </strong>

                          </div>


                          <div>

                            <span>
                              نوع حساب فعلی
                            </span>

                            <strong>
                              {user.accountType ===
                              "agent"
                                ? "مشاور"
                                : "کاربر عادی"}
                            </strong>

                          </div>


                          <div>

                            <span>
                              شماره جواز
                            </span>

                            <strong>
                              {user.agencyLicenseNumber ||
                                "ثبت نشده"}
                            </strong>

                          </div>


                          <div>

                            <span>
                              وضعیت مدارک
                            </span>

                            <strong>
                              {user.agencyDocumentsStatus ===
                              "uploaded"
                                ? "مدارک ثبت شده"
                                : "مدارک ناقص"}
                            </strong>

                          </div>

                        </div>


                        <div className="admin-dashboard__request-actions">


                          {renderDocumentsButton(user)}

                          <button
                            type="button"
                            className="admin-dashboard__approve-button"
                            disabled={Boolean(workingUserId) || documentsLoading}
                            onClick={() =>
                              approveAgent(
                                user
                              )
                            }
                          >

                            {working
                              ? "در حال انجام..."
                              : "✓ تأیید مشاور"}

                          </button>


                          <button
                            type="button"
                            className="admin-dashboard__reject-button"
                            disabled={Boolean(workingUserId) || documentsLoading}
                            onClick={() =>
                              rejectAgent(
                                user
                              )
                            }
                          >

                            رد درخواست

                          </button>

                        </div>


                        {renderDocumentsPanel(user)}


                      </article>
                    );
                  }
                )}

              </div>

            )}

          </section>
          )}


          {workspaceView === "approved" && <section className="admin-dashboard__panel admin-dashboard__panel--approved">

            <div className="admin-dashboard__panel-heading">

              <div>

                <span>
                  اعضای حرفه‌ای
                </span>

                <h2>
                  مشاوران تأییدشده
                </h2>

              </div>

            </div>


            {networkCreditsError && (
              <div className="admin-dashboard__state admin-dashboard__state--error">
                {networkCreditsError}
              </div>
            )}

            {filteredRows.length ===
            0 ? (

              <div className="admin-dashboard__empty admin-dashboard__empty--small">
                {workspaceQuery.trim() ? "نتیجه‌ای پیدا نشد." : "هنوز مشاوری تأیید نشده است."}
              </div>

            ) : (

              <div className="admin-dashboard__approved-list">

                {page.rows.map(
                  (user) => (
                    <article
                      key={
                        user.id
                      }
                    >

                      <div>

                        <strong>
                          {user.agencyName ||
                            user.agentName ||
                            "مشاور فضاجو"}
                        </strong>

                        <span>
                          {user.agencyCity ||
                            "شهر نامشخص"}

                          {" • "}

                          {user.phone ||
                            "بدون شماره"}
                        </span>

                      </div>


                      {(() => {
                        const credit = networkCredits.find(
                          (item) => item.userId === user.id
                        );

                        return (
                          <div className="admin-dashboard__network-credit-control">
                            <div className="admin-dashboard__network-credit-stats">
                              <span>
                                سهمیه باقی‌مانده
                                <strong>{credit ? credit.totalRemaining.toLocaleString("fa-IR") : networkCreditsLoading ? "…" : "—"}</strong>
                              </span>
                              <small>
                                رایگان: {credit ? credit.freeRemaining.toLocaleString("fa-IR") : "—"}
                                {" • "}
                                شارژی: {credit ? credit.paidRemaining.toLocaleString("fa-IR") : "—"}
                                {" • "}
                                دریافت‌شده: {credit ? credit.unlockCount.toLocaleString("fa-IR") : "—"}
                              </small>
                            </div>

                            {!credit && !networkCreditsLoading && <small role="status">سهمیه در دسترس نیست؛ صفحه را تازه کنید.</small>}
                            <div className="admin-dashboard__network-grant">
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                placeholder="مثلاً ۵۰"
                                aria-label={`تعداد سهمیه ${user.agencyName || user.agentName || user.phone || "مشاور"}`}
                                value={grantAmounts[user.id] || ""}
                                onChange={(event) =>
                                  setGrantAmounts((current) => ({
                                    ...current,
                                    [user.id]: event.target.value,
                                  }))
                                }
                              />
                              <button
                                type="button"
                                disabled={Boolean(grantWorkingId) || networkCreditsLoading || Boolean(networkCreditsError) || !credit}
                                onClick={() => grantNetworkCredits(user)}
                              >
                                {grantWorkingId === user.id ? "در حال شارژ..." : "افزودن سهمیه"}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="adm01-documents-actions">{renderDocumentsButton(user)}</div>
                      {renderDocumentsPanel(user)}

                    </article>
                  )
                )}

              </div>

            )}

          </section>}
          {workspaceView === "rejected" && <section className="admin-dashboard__panel adm01-rejected" aria-label="درخواست‌های ردشده">
            <div className="admin-dashboard__panel-heading"><div><span>آخرین وضعیت درخواست</span><h2>درخواست‌های ردشده</h2></div></div>
            {page.rows.length ? <div className="adm01-rejected-list">{page.rows.map(user=><article key={user.id}><div><strong>{user.agencyName || user.agentName || "نام ثبت نشده"}</strong><span>{user.agencyCity || "شهر نامشخص"} · {user.phone || "بدون شماره"}</span></div><div><span>تاریخ درخواست</span><strong>{formatDate(user.agencyRequestedAt)}</strong></div><span className="adm01-rejected-tag">رد شده</span><div className="adm01-documents-actions">{renderDocumentsButton(user)}</div>{renderDocumentsPanel(user)}</article>)}</div> : <p className="adm01-state">{workspaceQuery.trim()?"نتیجه‌ای پیدا نشد.":"درخواست ردشده‌ای وجود ندارد."}</p>}
          </section>}
          {page.totalPages > 1 && <nav className="adm01-pagination" aria-label={`صفحه‌بندی ${activeTab.title}`}><button type="button" disabled={navigationLocked || page.number===1} onClick={()=>changePage(page.number-1)}>صفحه قبل</button><span role="status">{page.number.toLocaleString("fa-IR")} از {page.totalPages.toLocaleString("fa-IR")}</span><button type="button" disabled={navigationLocked || page.number===page.totalPages} onClick={()=>changePage(page.number+1)}>صفحه بعد</button></nav>}
          </>}
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminDashboard;
