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
import FindForMe from "./pages/FindForMe";

import { getSpaces } from "./services/spaceService";


import {
  initializeAuthSession,
  logoutUser,
  subscribeToAuth,
} from "./services/authService";

import "./compact.css";
import "./typography.css";

function convertToNumber(value) {
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

  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  const normalizedValue = String(value)
    .replace(/[۰-۹]/g, (digit) =>
      persianDigits.indexOf(digit)
    )
    .replace(/[٠-٩]/g, (digit) =>
      arabicDigits.indexOf(digit)
    )
    .replace(/,/g, "")
    .replace(/٬/g, "");

  const numbers =
    normalizedValue.match(/\d+(\.\d+)?/g);

  if (!numbers) {
    return 0;
  }

  return Number(numbers.join(""));
}


function Home({
  parkings,
  parkingsLoading,
  parkingsError,
}) {
  return (
    <>
      <Hero />

      {parkingsError && (
        <div
          style={{
            maxWidth: "1100px",
            margin: "20px auto",
            padding: "14px 20px",
            direction: "rtl",
            borderRadius: "14px",
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            color: "#be123c",
          }}
        >
          دریافت آگهی‌های آنلاین با مشکل
          مواجه شد. آگهی‌های پیش‌فرض
          نمایش داده می‌شوند.
        </div>
      )}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 15px",
          padding: "0 20px",
          direction: "rtl",
          color: "#4b5563",
        }}
      >
        {parkingsLoading
          ? "در حال دریافت آگهی‌ها..."
          : `تعداد آگهی‌ها: ${parkings.length}`}
      </div>

      {parkingsLoading ? (
        <div
          style={{
            maxWidth: "1100px",
            margin: "30px auto",
            padding: "50px 20px",
            textAlign: "center",
            direction: "rtl",
            color: "#6b7280",
          }}
        >
          در حال دریافت آگهی‌ها...
        </div>
      ) : parkings.length > 0 ? (
        <Parking
          parkings={parkings}
          showHero={false}
        />
      ) : (
        <div
          style={{
            maxWidth: "1100px",
            margin: "30px auto",
            padding: "40px 20px",
            textAlign: "center",
            direction: "rtl",
            backgroundColor: "#f9fafb",
            borderRadius: "16px",
            color: "#6b7280",
            fontSize: "18px",
          }}
        >
          هنوز آگهی‌ای ثبت نشده است.
        </div>
      )}
    </>
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

  return children;
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
            <FindForMe parkings={parkings} />
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