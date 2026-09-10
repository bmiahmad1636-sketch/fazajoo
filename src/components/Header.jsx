import {
  useState,
} from "react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import MessageBadge from "./MessageBadge";
import SmartSearchBadge from "./SmartSearchBadge";

import "./Header.css";

function Header({
  user = null,
  userProfile = null,
  profileLoading = false,
  onLogout = null,
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);
  const [logoutModalOpen, setLogoutModalOpen] =
    useState(false);
  const [logoutError, setLogoutError] =
    useState("");

  const openLogoutModal = () => {
    setLogoutError("");
    setLogoutModalOpen(true);
    setMenuOpen(false);
  };

  const closeLogoutModal = () => {
    setLogoutModalOpen(false);
    setLogoutError("");
  };

  const handleLogout = async () => {
    try {
      setLogoutError("");

      if (onLogout) {
        await onLogout();
      }

      setLogoutModalOpen(false);
      setMenuOpen(false);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setLogoutError(
        "خروج از حساب انجام نشد. لطفاً دوباره تلاش کنید."
      );
    }
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const getNavLinkClass = ({
    isActive,
  }) => {
    return [
      "fazajoo-header__nav-link",

      isActive
        ? "fazajoo-header__nav-link--active"
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  const userTitle =
    user?.displayName ||
    user?.fullName ||
    user?.phone ||
    "کاربر فضاجو";

  const isApprovedAgent =
    userProfile?.accountType ===
      "agent" &&
    userProfile?.agencyStatus ===
      "approved";

  const isAdmin =
    userProfile?.systemRole ===
    "admin";

  const agencyButtonText =
    profileLoading
      ? "در حال بررسی..."
      : isApprovedAgent
        ? "پنل حرفه‌ای مشاور"
        : "ویژه مشاورین املاک";

  const agencyButtonTo =
    isApprovedAgent
      ? "/agency"
      : "/agency-access";

  return (
    <header className="fazajoo-header">
      <div className="fazajoo-header__container">

        <Link
          to="/"
          className="fazajoo-header__brand"
          onClick={closeMenu}
        >
          <img
            src="/fazajoo-logo.png"
            alt="فضاجو"
            className="fazajoo-header__logo"
          />
        </Link>


        <button
          type="button"
          className="fazajoo-header__menu-button"
          onClick={() =>
            setMenuOpen(
              (currentValue) =>
                !currentValue
            )
          }
          aria-label={
            menuOpen
              ? "بستن منو"
              : "باز کردن منو"
          }
          aria-expanded={
            menuOpen
          }
        >
          <span />
          <span />
          <span />
        </button>


        <div
          className={[
            "fazajoo-header__menu",

            menuOpen
              ? "fazajoo-header__menu--open"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >

          <nav className="fazajoo-header__nav">

            <NavLink
              to="/"
              end
              className={
                getNavLinkClass
              }
              onClick={closeMenu}
            >
              خانه
            </NavLink>


            <NavLink
              to="/parking"
              className={
                getNavLinkClass
              }
              onClick={closeMenu}
            >
              همه آگهی‌ها
            </NavLink>


            {user && (
              <>

                <NavLink
                  to="/my-parkings"
                  className={
                    getNavLinkClass
                  }
                  onClick={
                    closeMenu
                  }
                >
                  آگهی‌های من
                </NavLink>


                <NavLink
                  to="/favorites"
                  className={
                    getNavLinkClass
                  }
                  onClick={
                    closeMenu
                  }
                >
                  <span
                    aria-hidden="true"
                    style={{
                      marginLeft:
                        "5px",
                    }}
                  >
                    ♥
                  </span>

                  علاقه‌مندی‌های من
                </NavLink>

              </>
            )}

          </nav>


          <div className="fazajoo-header__divider" />


          {user ? (

            <div className="fazajoo-header__account">

              <MessageBadge
                onNavigate={
                  closeMenu
                }
                isApprovedAgent={
                  isApprovedAgent
                }
              />

              <SmartSearchBadge
                onNavigate={closeMenu}
              />


              <div
                className="fazajoo-header__user"
                title={user.phone || userTitle}
              >

                <span className="fazajoo-header__user-avatar">
                  {userTitle.slice(
                    0,
                    1
                  )}
                </span>


                <div className="fazajoo-header__user-text">

                  <small>
                    حساب کاربری
                  </small>

                  <strong>
                    {userTitle}
                  </strong>

                </div>

              </div>


              {isAdmin && (
                <Link
                  to="/admin"
                  className="fazajoo-header__login-button"
                  onClick={
                    closeMenu
                  }
                  title="مدیریت فضاجو"
                >
                  <span>
                    ⚙
                  </span>

                  مدیریت
                </Link>
              )}


              <Link
                to={
                  agencyButtonTo
                }
                className={[
                  "fazajoo-header__agency-button",

                  isApprovedAgent
                    ? "fazajoo-header__agency-button--approved"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={
                  closeMenu
                }
                aria-disabled={
                  profileLoading
                }
              >

                <span className="fazajoo-header__agency-icon">
                  🏢
                </span>


                <span className="fazajoo-header__agency-text">

                  <small>
                    {isApprovedAgent
                      ? "حساب مشاور تأییدشده"
                      : "ابزار حرفه‌ای املاک"}
                  </small>

                  <strong>
                    {
                      agencyButtonText
                    }
                  </strong>

                </span>

              </Link>


              <Link
                to="/add-parking"
                className="fazajoo-header__publish-button"
                onClick={
                  closeMenu
                }
              >
                <span>
                  ＋
                </span>

                ثبت آگهی
              </Link>


              <button
                type="button"
                className="fazajoo-header__logout-button"
                onClick={
                  openLogoutModal
                }
              >
                خروج
              </button>

            </div>

          ) : (

            <div className="fazajoo-header__guest-actions">

              <Link
                to="/login"
                className="fazajoo-header__login-button"
                onClick={
                  closeMenu
                }
              >
                ورود
              </Link>


              <Link
                to="/register"
                className="fazajoo-header__publish-button"
                onClick={
                  closeMenu
                }
              >
                ساخت حساب
              </Link>

            </div>

          )}

        </div>

      </div>

      {logoutModalOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLogoutModal();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(35, 30, 26, 0.48)",
            backdropFilter: "blur(3px)",
            direction: "rtl",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fazajoo-logout-title"
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              width: "min(430px, 100%)",
              borderRadius: "22px",
              background: "#fffaf6",
              border: "1px solid #ead9cc",
              boxShadow: "0 24px 70px rgba(45, 34, 27, 0.22)",
              overflow: "hidden",
              fontFamily: "Estedad, sans-serif",
            }}
          >
            <div
              style={{
                padding: "24px 24px 18px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "58px",
                  height: "58px",
                  margin: "0 auto 14px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff0e2",
                  color: "#c95e08",
                  fontSize: "27px",
                  fontWeight: 800,
                }}
              >
                ↪
              </div>

              <h3
                id="fazajoo-logout-title"
                style={{
                  margin: 0,
                  color: "#302a26",
                  fontSize: "19px",
                  fontWeight: 800,
                }}
              >
                خروج از حساب کاربری
              </h3>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#756960",
                  fontSize: "14px",
                  lineHeight: 1.9,
                }}
              >
                آیا مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟
              </p>

              {logoutError && (
                <div
                  role="alert"
                  style={{
                    marginTop: "14px",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: "#fff0f0",
                    border: "1px solid #e7b5b5",
                    color: "#a33b3b",
                    fontSize: "12px",
                    lineHeight: 1.8,
                  }}
                >
                  {logoutError}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "0 24px 24px",
              }}
            >
              <button
                type="button"
                onClick={closeLogoutModal}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  borderRadius: "12px",
                  border: "1px solid #d9ccc3",
                  background: "#ffffff",
                  color: "#5e5149",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  borderRadius: "12px",
                  border: "1px solid #c95e08",
                  background: "#c95e08",
                  color: "#ffffff",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                خروج از حساب
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

export default Header;
