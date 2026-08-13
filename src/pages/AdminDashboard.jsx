import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

import {
  Link,
} from "react-router-dom";

import {
  auth,
  db,
} from "../firebase";

import "./AdminDashboard.css";

function AdminDashboard() {
  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [workingUserId, setWorkingUserId] =
    useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const usersRef =
      collection(
        db,
        "users"
      );

    const unsubscribe =
      onSnapshot(
        usersRef,
        (snapshot) => {
          const loadedUsers =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );

          setUsers(
            loadedUsers
          );

          setLoading(false);
        },
        (snapshotError) => {
          console.error(
            "Admin users load error:",
            snapshotError
          );

          setError(
            "دریافت اطلاعات کاربران انجام نشد."
          );

          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  const agencyUsers =
    useMemo(() => {
      return users.filter(
        (user) =>
          Boolean(
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
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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
        window.confirm(
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

        const adminUser =
          auth.currentUser;

        await updateDoc(
          doc(
            db,
            "users",
            user.id
          ),
          {
            accountType:
              "agent",

            agencyStatus:
              "approved",

            agencyApprovedAt:
              serverTimestamp(),

            agencyApprovedBy:
              adminUser?.uid ||
              "admin",

            agencyReviewedAt:
              serverTimestamp(),
          }
        );

        alert(
          "مشاور با موفقیت تأیید شد."
        );
      } catch (updateError) {
        console.error(
          "Approve agent error:",
          updateError
        );

        alert(
          "تأیید مشاور انجام نشد."
        );
      } finally {
        setWorkingUserId("");
      }
    };

  const rejectAgent =
    async (user) => {
      const confirmed =
        window.confirm(
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

        const adminUser =
          auth.currentUser;

        await updateDoc(
          doc(
            db,
            "users",
            user.id
          ),
          {
            accountType:
              "user",

            agencyStatus:
              "rejected",

            agencyRejectedAt:
              serverTimestamp(),

            agencyRejectedBy:
              adminUser?.uid ||
              "admin",

            agencyReviewedAt:
              serverTimestamp(),
          }
        );

        alert(
          "درخواست مشاور رد شد."
        );
      } catch (updateError) {
        console.error(
          "Reject agent error:",
          updateError
        );

        alert(
          "رد درخواست انجام نشد."
        );
      } finally {
        setWorkingUserId("");
      }
    };

  return (
    <main className="admin-dashboard">
      <section className="admin-dashboard__hero">
        <div className="admin-dashboard__container">
          <div>
            <span className="admin-dashboard__eyebrow">
              مدیریت فضاجو
            </span>

            <h1>
              پنل مدیریت
              <span>
                {" "}
                مشاوران املاک
              </span>
            </h1>

            <p>
              درخواست‌های فعال‌سازی
              مشاوران را بررسی،
              تأیید یا رد کنید.
            </p>
          </div>

          <div className="admin-dashboard__hero-badge">
            <span>
              🛡️
            </span>

            <div>
              <small>
                دسترسی ویژه
              </small>

              <strong>
                مدیر فضاجو
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-dashboard__content">
        <div className="admin-dashboard__container">
          <div className="admin-dashboard__stats">
            <article>
              <span>
                در انتظار بررسی
              </span>

              <strong>
                {pendingRequests.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <small>
                درخواست جدید
              </small>
            </article>

            <article>
              <span>
                مشاوران تأییدشده
              </span>

              <strong>
                {approvedAgents.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <small>
                حساب حرفه‌ای فعال
              </small>
            </article>

            <article>
              <span>
                درخواست‌های ردشده
              </span>

              <strong>
                {rejectedRequests.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <small>
                نیازمند اقدام مجدد
              </small>
            </article>

            <article>
              <span>
                کل درخواست‌ها
              </span>

              <strong>
                {agencyUsers.length.toLocaleString(
                  "fa-IR"
                )}
              </strong>

              <small>
                سابقه درخواست مشاور
              </small>
            </article>
          </div>

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
            ) : pendingRequests.length ===
              0 ? (
              <div className="admin-dashboard__empty">
                <span>
                  ✅
                </span>

                <h3>
                  درخواست معوقی نداریم
                </h3>

                <p>
                  تمام درخواست‌های
                  مشاوران بررسی شده‌اند.
                </p>
              </div>
            ) : (
              <div className="admin-dashboard__requests">
                {pendingRequests.map(
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
                        </div>

                        <div className="admin-dashboard__request-actions">
                          <button
                            type="button"
                            className="admin-dashboard__approve-button"
                            disabled={
                              working
                            }
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
                            disabled={
                              working
                            }
                            onClick={() =>
                              rejectAgent(
                                user
                              )
                            }
                          >
                            رد درخواست
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="admin-dashboard__panel admin-dashboard__panel--approved">
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

            {approvedAgents.length ===
            0 ? (
              <div className="admin-dashboard__empty admin-dashboard__empty--small">
                هنوز مشاوری تأیید
                نشده است.
              </div>
            ) : (
              <div className="admin-dashboard__approved-list">
                {approvedAgents.map(
                  (user) => (
                    <article
                      key={user.id}
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

                      <span className="admin-dashboard__approved-badge">
                        ✓ تأییدشده
                      </span>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;