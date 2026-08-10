import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  onSnapshot as onDocumentSnapshot,
  query,
} from "firebase/firestore";

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
import AgencyAccess from "./pages/AgencyAccess";

import parkingData from "./data/parkingData";

import { auth, db } from "./firebase";

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

function normalizeFirebaseParking(document) {
  const data = document.data();

  return {
    id: document.id,
    ...data,

    imageUrl:
      data.imageUrl ||
      data.image ||
      data.images?.[0] ||
      "",

    createdAt:
      data.createdAt?.toDate?.() ||
      data.createdAt ||
      null,
  };
}

function mergeParkings(
  defaultParkings,
  firebaseParkings
) {
  const allParkings = [
    ...defaultParkings,
    ...firebaseParkings,
  ];

  return [
    ...new Map(
      allParkings.map((parking) => [
        String(parking.id),
        parking,
      ])
    ).values(),
  ];
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

function App() {
  const [parkings, setParkings] =
    useState(parkingData);

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
    useState(false);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        },
        (error) => {
          console.error(
            "Authentication listener error:",
            error
          );

          setUser(null);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      setProfileLoading(false);
      return undefined;
    }

    setProfileLoading(true);

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const unsubscribe =
      onDocumentSnapshot(
        userRef,
        (snapshot) => {
          setUserProfile(
            snapshot.exists()
              ? {
                  id: snapshot.id,
                  ...snapshot.data(),
                }
              : null
          );

          setProfileLoading(false);
        },
        (error) => {
          console.error(
            "User profile listener error:",
            error
          );

          setUserProfile(null);
          setProfileLoading(false);
        }
      );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    setParkingsLoading(true);
    setParkingsError("");

    const spacesQuery = query(
      collection(db, "spaces")
    );

    const unsubscribe = onSnapshot(
      spacesQuery,
      (snapshot) => {
        const firebaseParkings =
          snapshot.docs.map(
            normalizeFirebaseParking
          );

        const mergedParkings =
          mergeParkings(
            parkingData,
            firebaseParkings
          );

        setParkings(mergedParkings);
        setParkingsLoading(false);
        setParkingsError("");
      },
      (error) => {
        console.error(
          "Load parkings error:",
          error
        );

        setParkings(parkingData);

        setParkingsError(
          "دریافت آگهی‌های Firebase انجام نشد."
        );

        setParkingsLoading(false);
      }
    );

    return unsubscribe;
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
        userProfile={userProfile}
        profileLoading={profileLoading}
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
              <Inbox />
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