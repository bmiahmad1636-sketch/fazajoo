import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Header from "./components/Header";
import Hero from "./components/Hero";

import Parking from "./pages/parking";
import ParkingDetails from "./pages/ParkingDetails";
import AddParking from "./pages/AddParking";
import EditParking from "./pages/EditParking";
import Register from "./pages/Register";
import Login from "./pages/Login";
import MyParkings from "./pages/MyParkings";
import Favorites from "./pages/Favorites";
import Chat from "./pages/Chat";
import Inbox from "./pages/Inbox";
import AgencyDashboard from "./pages/AgencyDashboard";
import AgencyApplicants from "./pages/AgencyApplicants";
import AgencyAccess from "./pages/AgencyAccess";
import AdminDashboard from "./pages/AdminDashboard";
import AdminNavigationADM06 from "./components/AdminNavigationADM06";
import AdminPolicyWorkspaceADM07 from "./pages/AdminPolicyWorkspaceADM07";
import FeaturedShowcaseAdmin from "./pages/FeaturedShowcaseAdmin";
import LegalCenterJalali from "./pages/LegalCenterJalali";
import FindForMe from "./pages/FindForMe";
import Account from "./pages/Account";
import Wallet from "./pages/Wallet";
import AgencyPublicProfile from "./pages/AgencyPublicProfile";
import AdminModeration from "./pages/AdminModeration";
import AdminDirectManagement from "./pages/AdminDirectManagement";
import Notifications from "./pages/Notifications";
import ModerationNoticeModal from "./components/ModerationNoticeModal";

import { getSpaces } from "./services/spaceService";


import {
  initializeAuthSession,
  revalidateActiveSession,
  logoutUser,
  subscribeToAuth,
} from "./services/authService";

import "./compact.css";
import "./typography.css";
import "./HomePremiumHP01.css";
import "./HomeCompactHP02.css";
import "./HomeShowcaseHP03.css";

function Home({
  parkings,
  parkingsLoading,
  parkingsError,
}) {
  return (
    <div className="hp01-home hp02-home hp03-home">
      <Hero parkings={parkings} />

      <section className="hp01-home__discover" aria-label="آگهی‌های فضا" dir="rtl">
        {parkingsError && (
          <div className="hp01-home__error" role="status">
            ارتباط با آگهی‌های آنلاین برقرار نشد. برای دیدن آگهی‌های به‌روز، اتصال را بررسی کن.
          </div>
        )}

        {parkingsLoading ? (
          <div className="hp01-home__state" role="status">در حال دریافت آگهی‌ها...</div>
        ) : parkings.length > 0 ? (
          <Parking parkings={parkings} showHero={false} />
        ) : (
          <div className="hp01-home__state">
            هنوز آگهی‌ای برای نمایش وجود ندارد. می‌توانی اولین آگهی را ثبت کنی یا از جستجوی هوشمند استفاده کنی.
          </div>
        )}
      </section>
    </div>
  );
}

function ProtectedRoute({
  user,
  authLoading,
  children,
}) {
  if (authLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontSize: "20px",
          direction: "rtl",
        }}
      >
        در حال بررسی حساب کاربری...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}


function AgentRoute({
  user,
  authLoading,
  userProfile,
  profileLoading,
  children,
}) {
  if (authLoading || profileLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontSize: "20px",
          direction: "rtl",
        }}
      >
        در حال بررسی دسترسی مشاور...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const isApprovedAgent =
    userProfile?.accountType === "agent" &&
    userProfile?.agencyStatus === "approved";

  if (!isApprovedAgent) {
    return (
      <Navigate
        to="/agency-access"
        replace
      />
    );
  }

  return children;
}


function AdminRoute({
  user,
  authLoading,
  userProfile,
  profileLoading,
  children,
}) {
  if (authLoading || profileLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          fontSize: "20px",
          direction: "rtl",
        }}
      >
        در حال بررسی دسترسی مدیریت...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin =
    userProfile?.systemRole === "admin";

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <AdminNavigationADM06 />
      {children}
    </>
  );
}

function App() {
  const [parkings, setParkings] =
    useState([]);

  const [parkingsLoading, setParkingsLoading] =
    useState(true);

  const [parkingsError, setParkingsError] =
    useState("");

  const [user, setUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [userProfile, setUserProfile] =
    useState(null);

  const [profileLoading, setProfileLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToAuth(
      (currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    initializeAuthSession()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setAuthLoading(false);
      })
      .catch((error) => {
        console.error(
          "Backend authentication initialization error:",
          error
        );

        if (!active) return;
        setUser(null);
        setAuthLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Other browsers/devices do not share localStorage events.
  // Re-check server-side session validity when returning to this tab.
  useEffect(() => {
    let lastCheckedAt = 0;
    const checkOnReturn = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastCheckedAt < 1500) return;
      lastCheckedAt = now;
      void revalidateActiveSession();
    };
    window.addEventListener("focus", checkOnReturn);
    document.addEventListener("visibilitychange", checkOnReturn);
    return () => {
      window.removeEventListener("focus", checkOnReturn);
      document.removeEventListener("visibilitychange", checkOnReturn);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    const backendProfile = {
      id:
        user.backendId ||
        user.id ||
        user.uid ||
        "",
      phone:
        user.phone || "",
      displayName:
        user.displayName ||
        user.fullName ||
        "",
      fullName:
        user.fullName ||
        user.displayName ||
        "",
      accountType:
        user.accountType ||
        "user",
      systemRole:
        user.systemRole ||
        "user",
      agencyStatus:
        user.agencyStatus ||
        "none",
      agencyName:
        user.agencyName ||
        "",
      agentName:
        user.agentName ||
        "",
      agencyCity:
        user.agencyCity ||
        "",
      agencyAddress:
        user.agencyAddress ||
        "",
      agencyLicenseNumber:
        user.agencyLicenseNumber ||
        "",
      backendAuth: true,
    };

    setUserProfile(backendProfile);
    setProfileLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;

    const loadSpaces = async () => {
      setParkingsLoading(true);
      setParkingsError("");
      try {
        const backendSpaces = await getSpaces();
        if (!active) return;
        setParkings(backendSpaces);
      } catch (error) {
        console.error("Load backend spaces error:", error);
        if (!active) return;
        setParkings([]);
        setParkingsError("دریافت آگهی‌ها از سرور فضاجو انجام نشد.");
      } finally {
        if (active) setParkingsLoading(false);
      }
    };

    loadSpaces();
    window.addEventListener("fazajoo:spaces-changed", loadSpaces);
    return () => {
      active = false;
      window.removeEventListener("fazajoo:spaces-changed", loadSpaces);
    };
  }, []);

  const deleteParking = (id) => {
    setParkings((currentParkings) =>
      currentParkings.filter(
        (parking) =>
          String(parking.id) !== String(id)
      )
    );
  };

  const updateParkingInState = (
    id,
    updatedData
  ) => {
    setParkings((currentParkings) =>
      currentParkings.map((parking) =>
        String(parking.id) === String(id)
          ? {
              ...parking,
              ...updatedData,
            }
          : parking
      )
    );
  };

  return (
    <>
      <Header
        user={user}
        userProfile={userProfile}
        profileLoading={profileLoading}
        onLogout={logoutUser}
      />

      <ModerationNoticeModal user={user} />

      <Routes>
        <Route
          path="/"
          element={
            <Home
              parkings={parkings}
              parkingsLoading={
                parkingsLoading
              }
              parkingsError={
                parkingsError
              }
            />
          }
        />


        <Route
          path="/find-for-me"
          element={
            <FindForMe parkings={parkings} user={user} />
          }
        />

        <Route
          path="/parking"
          element={
            parkingsLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px",
                  direction: "rtl",
                }}
              >
                در حال دریافت
                آگهی‌ها...
              </div>
            ) : (
              <Parking
                parkings={parkings}
              />
            )
          }
        />

        <Route
          path="/parking/:id"
          element={
            <ParkingDetails
              parkings={parkings}
              deleteParking={
                deleteParking
              }
            />
          }
        />

        <Route
          path="/edit-parking/:id"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              <EditParking
                parkings={parkings}
                updateParkingInState={
                  updateParkingInState
                }
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/add-parking"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              <AddParking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-parkings"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              <MyParkings />
            </ProtectedRoute>
          }
        />


        <Route
          path="/favorites"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              <Favorites />
            </ProtectedRoute>
          }
        />


        <Route
          path="/chat/:parkingId"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              <Chat
                parkings={parkings}
              />
            </ProtectedRoute>
          }
        />


        <Route
          path="/inbox"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              {userProfile?.accountType === "agent" &&
              userProfile?.agencyStatus === "approved" ? (
                <Navigate
                  to="/agency/inbox"
                  replace
                />
              ) : (
                <Inbox />
              )}
            </ProtectedRoute>
          }
        />



        <Route
          path="/agency-profile/:userId"
          element={<AgencyPublicProfile />}
        />

        <Route
          path="/agency-access"
          element={
            <ProtectedRoute
              user={user}
              authLoading={
                authLoading
              }
            >
              <AgencyAccess
                currentUser={user}
                userProfile={userProfile}
                profileLoading={profileLoading}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agency"
          element={
            <AgentRoute
              user={user}
              authLoading={authLoading}
              userProfile={userProfile}
              profileLoading={profileLoading}
            >
              <AgencyDashboard
                parkings={parkings}
                currentUser={user}
              />
            </AgentRoute>
          }
        />




        <Route
          path="/agency/inbox"
          element={
            <AgentRoute
              user={user}
              authLoading={authLoading}
              userProfile={userProfile}
              profileLoading={profileLoading}
            >
              <Inbox mode="agency" />
            </AgentRoute>
          }
        />

        <Route
          path="/agency/applicants"
          element={
            <AgentRoute
              user={user}
              authLoading={authLoading}
              userProfile={userProfile}
              profileLoading={profileLoading}
            >
              <AgencyApplicants
                parkings={parkings}
                currentUser={user}
              />
            </AgentRoute>
          }
        />


        <Route
          path="/admin"
          element={
            <AdminRoute
              user={user}
              authLoading={authLoading}
              userProfile={userProfile}
              profileLoading={profileLoading}
            >
              <AdminDashboard />
            </AdminRoute>
          }
        />


        <Route path="/admin/notification-policy" element={
          <AdminRoute user={user} authLoading={authLoading} userProfile={userProfile} profileLoading={profileLoading}>
            <AdminPolicyWorkspaceADM07 key="notification" kind="notification" />
          </AdminRoute>
        } />
        <Route path="/admin/chat-policy" element={
          <AdminRoute user={user} authLoading={authLoading} userProfile={userProfile} profileLoading={profileLoading}>
            <AdminPolicyWorkspaceADM07 key="chat" kind="chat" />
          </AdminRoute>
        } />

        <Route path="/admin/featured" element={
          <AdminRoute user={user} authLoading={authLoading} userProfile={userProfile} profileLoading={profileLoading}>
            <FeaturedShowcaseAdmin />
          </AdminRoute>
        } />
        <Route
          path="/admin/direct-management"
          element={
            <AdminRoute user={user} authLoading={authLoading} userProfile={userProfile} profileLoading={profileLoading}>
              <AdminDirectManagement />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/moderation"
          element={
            <AdminRoute user={user} authLoading={authLoading} userProfile={userProfile} profileLoading={profileLoading}>
              <AdminModeration />
            </AdminRoute>
          }
        />


        <Route
          path="/admin/legal"
          element={
            <AdminRoute user={user} authLoading={authLoading} userProfile={userProfile} profileLoading={profileLoading}>
              <LegalCenterJalali />
            </AdminRoute>
          }
        />


        <Route
          path="/notifications"
          element={
            <ProtectedRoute
              user={user}
              authLoading={authLoading}
            >
              <Notifications />
            </ProtectedRoute>
          }
        />


        <Route
          path="/wallet"
          element={
            <ProtectedRoute user={user} authLoading={authLoading}>
              <Wallet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute
              user={user}
              authLoading={authLoading}
            >
              <Account
                user={user}
                userProfile={userProfile}
              />
            </ProtectedRoute>
          }
        />


        <Route
          path="/register"
          element={
            authLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px",
                  direction: "rtl",
                }}
              >
                در حال بررسی حساب
                کاربری...
              </div>
            ) : user ? (
              <Navigate
                to="/"
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        <Route
          path="/login"
          element={
            authLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px",
                  direction: "rtl",
                }}
              >
                در حال بررسی حساب
                کاربری...
              </div>
            ) : user ? (
              <Navigate
                to="/"
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;