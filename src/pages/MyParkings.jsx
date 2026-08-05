import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

function MyParkings() {
  const [user, setUser] = useState(null);
  const [parkings, setParkings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setParkings([]);
          setLoading(false);
          return;
        }

        try {
          const parkingsQuery = query(
            collection(db, "spaces"),
            where("ownerId", "==", currentUser.uid)
          );

          const snapshot = await getDocs(parkingsQuery);

          const userParkings = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }));

          setParkings(userParkings);
        } catch (error) {
          console.error(error);
          alert("خطا در دریافت آگهی‌های شما");
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          direction: "rtl",
        }}
      >
        در حال دریافت آگهی‌های شما...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px",
          direction: "rtl",
        }}
      >
        <h2>برای مشاهده آگهی‌های خود وارد شوید.</h2>

        <Link to="/login">
          رفتن به صفحه ورود
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "40px",
        direction: "rtl",
        maxWidth: "1100px",
        margin: "auto",
      }}
    >
      <h1 style={{ textAlign: "center" }}>
        آگهی‌های من
      </h1>

      {parkings.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
          }}
        >
          <p>هنوز آگهی‌ای ثبت نکرده‌اید.</p>

          <Link to="/add-parking">
            ثبت اولین آگهی
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginTop: "30px",
          }}
        >
          {parkings.map((parking) => (
            <div
              key={parking.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "15px",
                padding: "15px",
                background: "white",
                boxShadow:
                  "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            >
              {parking.imageUrl && (
                <img
                  src={parking.imageUrl}
                  alt={parking.title}
                  style={{
                    width: "100%",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                />
              )}

              <h3>{parking.title}</h3>

              <p>
                📍 {parking.city || "شهر ثبت نشده"}
              </p>

              <p>
                📐 {parking.area || "نامشخص"} متر
              </p>

              <p>
                💰 {parking.price || "قیمت ثبت نشده"}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to={`/parking/${parking.id}`}
                  style={{
                    background: "#16a34a",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  مشاهده
                </Link>

                <Link
                  to={`/edit-parking/${parking.id}`}
                  style={{
                    background: "#008cff",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  ویرایش
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyParkings;