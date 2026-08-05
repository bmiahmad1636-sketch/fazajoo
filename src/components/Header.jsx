import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  Link,
  NavLink,
} from "react-router-dom";

import { auth } from "../firebase";

import MessageBadge from "./MessageBadge";

import "./Header.css";

function Header() {
  const [user, setUser] = useState(null);

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
        },
        (error) => {
          console.error(
            "Header authentication error:",
            error
          );

          setUser(null);
        }
      );

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setMenuOpen(false);

      alert("با موفقیت خارج شدید.");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert("خروج از حساب انجام نشد.");
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

  const getUserTitle = () => {
    if (!user?.email) {
      return "";
    }

    return user.email
      .split("@")[0]
      .trim();
  };

  const userTitle =
    getUserTitle();

  return (
    <header className="fazajoo-header">
      <div className="fazajoo-header__container">
        <Link
          to="/"
          className="fazajoo-header__brand"
          onClick={closeMenu}
          aria-label="صفحه اصلی فضاجو"
        >
          <img
            src="/fazajoo-logo.png"
            alt="لوگوی فضاجو"
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
          aria-expanded={menuOpen}
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
                  onClick={closeMenu}
                >
                  آگهی‌های من
                </NavLink>

                <NavLink
                  to="/favorites"
                  className={
                    getNavLinkClass
                  }
                  onClick={closeMenu}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      marginLeft: "5px",
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
                onNavigate={closeMenu}
              />

              <div
                className="fazajoo-header__user"
                title={user.email}
              >
                <span className="fazajoo-header__user-avatar">
                  {userTitle
                    .slice(0, 1)}
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

              <Link
                to="/add-parking"
                className="fazajoo-header__publish-button"
                onClick={closeMenu}
              >
                <span>＋</span>
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
                onClick={closeMenu}
              >
                ورود
              </Link>

              <Link
                to="/register"
                className="fazajoo-header__publish-button"
                onClick={closeMenu}
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