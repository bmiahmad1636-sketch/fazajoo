import {
  useState,
} from "react";

import {
  Link,
  NavLink,
} from "react-router-dom";

import MessageBadge from "./MessageBadge";

import "./Header.css";

function Header({
  user = null,
  userProfile = null,
  profileLoading = false,
  onLogout = null,
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      }

      setMenuOpen(false);

      alert("با موفقیت خارج شدید.");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        "خروج از حساب انجام نشد."
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
                  handleLogout
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
    </header>
  );
}

export default Header;
