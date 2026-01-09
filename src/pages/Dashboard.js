import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import "../App.css";

/* ================= LOCATION PERMISSION FUNCTION ================= */
const requestLocationPermission = async (currentUser, setLocationAllowed) => {
  if (!navigator.geolocation) {
    toast.error("Geolocation is not supported by your browser");
    setLocationAllowed(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          location: { lat: latitude, lng: longitude },
          locationPermissionGranted: true, // ✅ FIX
        });
        setLocationAllowed(true);
      } catch (error) {
        console.error("Error saving location:", error);
        setLocationAllowed(false);
      }
    },
    async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        locationPermissionGranted: false, // ✅ FIX
      });
      toast.error(
        "Location permission is mandatory to use Lifeline Connect. Please enable it."
      );
      setLocationAllowed(false);
    },
    { enableHighAccuracy: true }
  );
};

/* ================= END LOCATION FUNCTION ================= */

/* ================= REAL PERMISSION CHECK ================= */
const checkLocationPermission = async () => {
  if (!navigator.permissions) return "prompt";
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state; // granted | denied | prompt
  } catch {
    return "prompt";
  }
};
/* ================= END CHECK ================= */

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [availability, setAvailability] = useState(false);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUser(currentUser);

      try {
        const permissionState = await checkLocationPermission();

        if (permissionState === "granted") {
          setLocationAllowed(true);
        } else {
          // Only show modal if denied or not yet asked (prompt)
          setLocationAllowed(false);
          if (permissionState === "prompt") {
            requestLocationPermission(currentUser, setLocationAllowed);
          }
        }

        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          setAvailability(snap.data().availabilityToDonate || false);
        } else {
          await setDoc(userRef, {
            availabilityToDonate: false,
            email: currentUser.email,
            createdAt: new Date(),
          });
          setAvailability(false);
        }
      } catch (error) {
        console.error("Firestore error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* ===== LOADING ===== */
  if (loading) {
    return <div className="container">Loading dashboard...</div>;
  }

  /* ===== NOT LOGGED IN ===== */
  if (!user) {
    return (
      <div className="container">
        <h2>You are not logged in</h2>
        <button className="primary-btn" onClick={() => navigate("/login")}>
          Go to Login
        </button>
      </div>
    );
  }

  /* ===== LOCATION MODAL ===== */
  if (locationAllowed === false) {
    return (
      <div className="location-modal-overlay">
        <div className="location-modal-card">
          <div className="location-icon-wrapper">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary-red)" }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h2>Location Access</h2>
          <p>
            Please check your browser's address bar or the popup above to <strong>Allow</strong> location access for real-time tracking.
          </p>
          <button
            className="primary-btn"
            onClick={() =>
              requestLocationPermission(auth.currentUser, setLocationAllowed)
            }
          >
            Enable Live Tracking
          </button>
        </div>
      </div>
    );
  }

  /* ===== DASHBOARD ===== */
  return (
    <div className="dashboard-container">

      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
      </div>

      <div className="dashboard-content">
        {role === null && (
          <div className="role-selection-grid">
            <div className="role-card donor" onClick={() => setRole("donor")}>
              <div className="role-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L7 7H3V11H7L12 16L17 11H21V7H17L12 2Z" fill="rgba(229, 57, 53, 0.1)" />
                  <path d="M12 22C12 22 19 16.5 19 11.5C19 7.35786 15.866 4 12 4C8.13401 4 5 7.35786 5 11.5C5 16.5 12 22 12 22Z" strokeWidth="2" />
                </svg>
              </div>
              <h3>I am a Donor</h3>
              <p>Ready to save lives by donating blood to those in need.</p>
              <span className="role-action">Enter Donor Panel →</span>
            </div>

            <div className="role-card receiver" onClick={() => setRole("receiver")}>
              <div className="role-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14C19 16.2091 17.2091 18 15 18H9C6.79086 18 5 16.2091 5 14V11H19V14Z" fill="rgba(229, 57, 53, 0.1)" />
                  <path d="M12 3V7M12 7H8M12 7H16M3 11H21V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V11Z" strokeWidth="2" />
                  <path d="M9 14H15" />
                </svg>
              </div>
              <h3>I am a Receiver</h3>
              <p>Looking for compatible donors in my immediate vicinity.</p>
              <span className="role-action">Request Assistance →</span>
            </div>
          </div>
        )}

        {role === "donor" && (
          <div className="panel-container">
            <div className="panel-card main-status-card">
              <div className="status-header">
                <div className="status-info">
                  <div className="role-icon-small">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22C12 22 19 16.5 19 11.5C19 7.35786 15.866 4 12 4C8.13401 4 5 7.35786 5 11.5C5 16.5 12 22 12 22Z" />
                    </svg>
                  </div>
                  <h4>Donation Status</h4>
                  <p>Appear in searches for local emergencies</p>
                </div>
                <div className={`status-badge ${availability ? "active" : "inactive"}`}>
                  {availability ? "● Available" : "● Offline"}
                </div>
              </div>

              <div className="status-toggle-box">
                <button
                  className={`primary-btn ${availability ? "secondary-mode" : "primary-mode"}`}
                  onClick={async () => {
                    const newStatus = !availability;
                    await updateDoc(doc(db, "users", user.uid), {
                      availabilityToDonate: newStatus,
                    });

                    // ✅ NOTIFICATION: Availability Change
                    await addDoc(collection(db, "notifications"), {
                      toUserId: user.uid,
                      message: newStatus
                        ? "You are now ONLINE and available to donate."
                        : "You are now OFFLINE and hidden from searches.",
                      status: "unread",
                      createdAt: serverTimestamp(), // Ensure serverTimestamp is imported if not already
                    });

                    setAvailability(newStatus);
                  }}
                >
                  {availability ? "Turn Off Availability" : "Go Live & Available"}
                </button>
              </div>
            </div>

            <div className="panel-actions-grid single-col">
              <div className="action-card highlight" onClick={() => navigate("/donor-matches")}>
                <div className="action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="action-text">
                  <h5>Match Requests</h5>
                  <p>View direct blood matches for you</p>
                </div>
                <span className="arrow-red">→</span>
              </div>
            </div>

            <button className="text-link-btn" onClick={() => setRole(null)}>
              ← Back to Role Selection
            </button>
          </div>
        )}

        {role === "receiver" && (
          <div className="panel-container">
            <div className="panel-actions-grid large">
              <div className="action-card receiver-main" onClick={() => navigate("/request-blood")}>
                <div className="action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22C12 22 19 18 19 12V5L12 2L5 5V12C5 18 12 22 12 22Z" fill="rgba(229, 57, 53, 0.1)" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div className="action-text">
                  <h5>Emergency Request</h5>
                  <p>Broadcast a need for blood to nearby donors</p>
                </div>
                <span className="arrow">→</span>
              </div>

              <div className="action-card secondary-card" onClick={() => navigate("/my-requests")}>
                <div className="action-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
                    <path d="M14 2V8H20" />
                    <path d="M8 13H16" />
                    <path d="M8 17H12" />
                  </svg>
                </div>
                <div className="action-text">
                  <h5>My History</h5>
                  <p>Manage your active & past requests</p>
                </div>
                <span className="arrow">→</span>
              </div>
            </div>

            <button className="text-link-btn" onClick={() => setRole(null)}>
              ← Back to Role Selection
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;
