import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";

function MyParkings() {
  const [user, setUser] =
    useState(null);

  const [parkings, setParkings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState("");

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          setUser(currentUser);

          if (!currentUser) {
            setParkings([]);
            setLoading(false);
            return;
          }

          try {
            const parkingsQuery =
              query(
                collection(
                  db,
                  "spaces"
                ),
                where(
                  "ownerId",
                  "==",
                  currentUser.uid
                )
              );

            const snapshot =
              await getDocs(
                parkingsQuery
              );

            const userParkings =
              snapshot.docs.map(
                (document) => ({
                  id: document.id,
                  ...document.data(),

                  status:
                    document.data()
                      .status ||
                    "active",
                })
              );

            setParkings(
              userParkings
            );
          } catch (error) {
            console.error(error);

            alert(
              "خطا در دریافت آگهی‌های شما"
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () =>
      unsubscribe();
  }, []);

  const handleStatusChange =
    async (
      parkingId,
      newStatus
    ) => {
      if (
        !user ||
        !parkingId
      ) {
        return;
      }

      setUpdatingId(
        parkingId
      );

      try {
        await updateDoc(
          doc(
            db,
            "spaces",
            parkingId
          ),
          {
            status:
              newStatus,
          }
        );

        setParkings(
          (currentParkings) =>
            currentParkings.map(
              (parking) =>
                parking.id ===
                parkingId
                  ? {
                      ...parking,
                      status:
                        newStatus,
                    }
                  : parking
            )
        );
      } catch (error) {
        console.error(
          "Update parking status error:",
          error
        );

        alert(
          "تغییر وضعیت آگهی انجام نشد."
        );
      } finally {
        setUpdatingId("");
      }
    };

  const getStatusInfo = (
    status
  ) => {
    switch (status) {
      case "rented":
        return {
          label:
            "اجاره داده شد",
          background:
            "#fff7ed",
          color:
            "#c2410c",
        };

      case "inactive":
        return {
          label:
            "غیرفعال",
          background:
            "#f1f5f9",
          color:
            "#475569",
        };

      default:
        return {
          label:
            "فعال",
          background:
            "#ecfdf5",
          color:
            "#15803d",
        };
    }
  };

  if (loading) {
    return (
      <div
        style={{
          textAlign:
            "center",
          padding:
            "50px",
          direction:
            "rtl",
        }}
      >
        در حال دریافت
        آگهی‌های شما...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          textAlign:
            "center",
          padding:
            "50px",
          direction:
            "rtl",
        }}
      >
        <p>
          برای مشاهده
          آگهی‌های خود وارد
          شوید.
        </p>

        <Link to="/login">
          رفتن به صفحه
          ورود
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding:
          "40px",
        direction:
          "rtl",
        maxWidth:
          "1100px",
        margin:
          "auto",
      }}
    >
      <h1
        style={{
          textAlign:
            "center",
        }}
      >
        آگهی‌های من
      </h1>

      {parkings.length ===
      0 ? (
        <div
          style={{
            textAlign:
              "center",
            padding:
              "40px",
          }}
        >
          <p>
            هنوز آگهی‌ای
            ثبت نکرده‌اید.
          </p>

          <Link to="/add-parking">
            ثبت اولین آگهی
          </Link>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",

            gap:
              "20px",

            marginTop:
              "30px",
          }}
        >
          {parkings.map(
            (parking) => {
              const statusInfo =
                getStatusInfo(
                  parking.status
                );

              return (
                <div
                  key={
                    parking.id
                  }
                  style={{
                    border:
                      "1px solid #eadfd7",

                    borderRadius:
                      "18px",

                    padding:
                      "15px",

                    background:
                      "white",

                    boxShadow:
                      "0 8px 24px rgba(70, 45, 28, 0.08)",
                  }}
                >
                  {parking.imageUrl && (
                    <img
                      src={
                        parking.imageUrl
                      }
                      alt={
                        parking.title
                      }
                      style={{
                        width:
                          "100%",

                        height:
                          "180px",

                        objectFit:
                          "cover",

                        borderRadius:
                          "12px",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "space-between",

                      gap:
                        "10px",

                      marginTop:
                        "14px",
                    }}
                  >
                    <h3
                      style={{
                        margin:
                          "0",
                      }}
                    >
                      {
                        parking.title
                      }
                    </h3>

                    <span
                      style={{
                        background:
                          statusInfo.background,

                        color:
                          statusInfo.color,

                        padding:
                          "5px 9px",

                        borderRadius:
                          "999px",

                        fontSize:
                          "12px",

                        fontWeight:
                          "bold",

                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {
                        statusInfo.label
                      }
                    </span>
                  </div>

                  <p>
                    📍{" "}
                    {parking.city ||
                      "شهر ثبت نشده"}
                  </p>

                  <p>
                    📐{" "}
                    {parking.area ||
                      "نامشخص"}{" "}
                    متر
                  </p>

                  <p>
                    💰{" "}
                    {parking.price ||
                      "قیمت ثبت نشده"}
                  </p>

                  <div
                    style={{
                      margin:
                        "18px 0",

                      padding:
                        "14px",

                      borderRadius:
                        "12px",

                      background:
                        "#fffaf6",

                      border:
                        "1px solid #f1dfd2",
                    }}
                  >
                    <div
                      style={{
                        marginBottom:
                          "9px",

                        fontWeight:
                          "bold",

                        fontSize:
                          "13px",
                      }}
                    >
                      وضعیت آگهی
                    </div>

                    <select
                      value={
                        parking.status ||
                        "active"
                      }
                      disabled={
                        updatingId ===
                        parking.id
                      }
                      onChange={(
                        event
                      ) =>
                        handleStatusChange(
                          parking.id,
                          event.target
                            .value
                        )
                      }
                      style={{
                        width:
                          "100%",

                        padding:
                          "10px",

                        border:
                          "1px solid #e5d3c5",

                        borderRadius:
                          "10px",

                        background:
                          "white",

                        fontFamily:
                          "inherit",

                        cursor:
                          "pointer",
                      }}
                    >
                      <option value="active">
                        فعال
                      </option>

                      <option value="rented">
                        اجاره داده شد
                      </option>

                      <option value="inactive">
                        غیرفعال
                      </option>
                    </select>

                    {updatingId ===
                      parking.id && (
                      <div
                        style={{
                          marginTop:
                            "7px",

                          fontSize:
                            "12px",

                          color:
                            "#888",
                        }}
                      >
                        در حال
                        ذخیره...
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display:
                        "flex",

                      gap:
                        "10px",

                      flexWrap:
                        "wrap",
                    }}
                  >
                    <Link
                      to={`/parking/${parking.id}`}
                      style={{
                        background:
                          "#16a34a",

                        color:
                          "white",

                        padding:
                          "8px 12px",

                        borderRadius:
                          "8px",

                        textDecoration:
                          "none",
                      }}
                    >
                      مشاهده
                    </Link>

                    <Link
                      to={`/edit-parking/${parking.id}`}
                      style={{
                        background:
                          "#f47a1f",

                        color:
                          "white",

                        padding:
                          "8px 12px",

                        borderRadius:
                          "8px",

                        textDecoration:
                          "none",
                      }}
                    >
                      ویرایش
                    </Link>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

export default MyParkings;