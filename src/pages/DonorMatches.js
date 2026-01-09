import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import BackButton from "../components/BackButton";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useJsApiLoader } from "@react-google-maps/api"; // ✅ ADDED

const distanceKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};

export default function DonorMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // ✅ ADDED

  /* ================== GOOGLE MAPS API for Exact Distance ================== */
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || " ",
    libraries: ['places', 'geometry']
  });

  const [realDistances, setRealDistances] = useState({});
  const [currentPos, setCurrentPos] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPos({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.error("Loc error", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Calculate Exact Distance when Maps API is ready
  useEffect(() => {
    if (isLoaded && matches.length > 0 && currentPos) {
      const validMatches = matches.filter(m => m.requestLocation);
      if (validMatches.length === 0) return;

      const destinations = validMatches.map(m => ({
        lat: m.requestLocation.lat,
        lng: m.requestLocation.lng
      }));

      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [currentPos],
          destinations: destinations,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === "OK") {
            const results = response.rows[0].elements;
            const newDistances = {};

            validMatches.forEach((m, index) => {
              if (results[index].status === "OK") {
                newDistances[m.id] = results[index].distance.text;
              }
            });
            setRealDistances(newDistances);
          }
        }
      );
    }
  }, [isLoaded, matches, currentPos]);

  useEffect(() => {
    let unsubMatches = null;
    // ... existing match fetching logic ...
    // Note: I am replacing the TOP part of the file, not the middle.
    // The previous tool usage failed because it couldn't find the target.
    // I will try to target a smaller chunk or the exact block from lines 36 to 156 if needed.
    // But let's try to replace the block from line 36 to 43 first + insertion.
    // Actually, I'll replace the block from line 36 to the end of the Matrix Effect (approx line 156) in one go 
    // BUT I must include the 'matches' fetching effect in the middle which I don't want to touch.
    // So I will insert 'currentPos' logic at the top, and UPDATE the Matrix effect at the bottom.
    return () => { };
  }, []);

  // Wait, I can't use pseudo-code in thoughts for the tool. Use the tool correctly.
  // I will replace lines 36-43 (Maps Loader & realDistances state) 
  // with the new block including currentPos state and effect.
  // THEN I will replace the Matrix Effect (lines 115-156) with the new one using currentPos.
  // AND THEN I will update the Render logic.

  // Step 1: Add currentPos state and effect.





  // Modifying the text to show "Approx." for now or just wait for the better implementation below.
  // Actually, I should update the main useEffect to invoke the DistanceMatrixService or 
  // at least ensure 'matches' contains the requestLocation so I can use it here.

  useEffect(() => {
    let unsubMatches = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "matches"),
        where("donorId", "==", user.uid)
      );

      unsubMatches = onSnapshot(q, async (snap) => {
        const data = await Promise.all(
          snap.docs.map(async d => {
            const match = d.data();
            let distance = "N/A";
            let requestLocation = null;

            try {
              const donorSnap = await getDoc(doc(db, "users", match.donorId));
              const reqSnap = await getDoc(doc(db, "requests", match.requestId));

              if (
                donorSnap.exists() &&
                reqSnap.exists() &&
                donorSnap.data().location &&
                reqSnap.data().requestLocation
              ) {
                requestLocation = reqSnap.data().requestLocation;
                // Fallback Haversine
                distance = distanceKm(
                  reqSnap.data().requestLocation,
                  donorSnap.data().location
                ).toFixed(2);
              }
            } catch (e) {
              console.error("Distance calc error", e);
            }

            return {
              id: d.id,
              ...match,
              distance, // Haversine fallback
              requestLocation // Save for Google API
            };
          })
        );

        setMatches(data);
        setLoading(false);
      });
    });

    return () => {
      if (unsubMatches) unsubMatches();
      unsubAuth();
    };
  }, []);

  // Calculate Exact Distance when Maps API is ready
  useEffect(() => {
    if (isLoaded && matches.length > 0) {
      // Determine origins (Donor Location)
      // ideally we use the donor's current GPS, assuming they are at the location stored.
      // Or better, use browser geolocation for "Exact" current driving distance.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const origin = { lat: position.coords.latitude, lng: position.coords.longitude };

          const validMatches = matches.filter(m => m.requestLocation);
          if (validMatches.length === 0) return;

          const destinations = validMatches.map(m => ({
            lat: m.requestLocation.lat,
            lng: m.requestLocation.lng
          }));

          const service = new window.google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            {
              origins: [origin],
              destinations: destinations,
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (response, status) => {
              if (status === "OK") {
                const results = response.rows[0].elements;
                const newDistances = {};

                validMatches.forEach((m, index) => {
                  if (results[index].status === "OK") {
                    newDistances[m.id] = results[index].distance.text; // e.g., "5.2 km"
                  }
                });
                setRealDistances(newDistances);
              }
            }
          );
        });
      }
    }
  }, [isLoaded, matches]);


  /* ================== ACCEPT ================== */
  /* ================== ACCEPT ================== */
  const handleAccept = async (match) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const donorLiveLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            updatedAt: serverTimestamp(),
          };

          // ✅ 1️⃣ UPDATE DONOR LIVE LOCATION
          await updateDoc(doc(db, "users", match.donorId), {
            location: donorLiveLocation,
          });

          // ✅ 2️⃣ UPDATE MATCH STATUS
          await updateDoc(doc(db, "matches", match.id), {
            status: "accepted",
          });

          // ✅ 3️⃣ UPDATE REQUEST STATUS
          await updateDoc(doc(db, "requests", match.requestId), {
            status: "accepted",
            acceptedDonorId: match.donorId,
          });

          // ✅ 4️⃣ NOTIFY RECEIVER
          await addDoc(collection(db, "notifications"), {
            toUserId: match.receiverId,
            message: `Your blood request was accepted by ${match.donorName}`,
            matchId: match.id,
            status: "unread",
            createdAt: serverTimestamp(),
          });

          toast.success("Request accepted successfully!");
        } catch (err) {
          console.error("Accept error:", err);
          toast.error("Failed to accept request");
        }
      },
      (err) => {
        toast.error("Location permission denied");
        console.error(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };


  /* ================== REJECT ================== */
  const handleReject = async (match) => {
    await updateDoc(doc(db, "matches", match.id), {
      status: "rejected",
    });

    await addDoc(collection(db, "notifications"), {
      toUserId: match.receiverId,
      message: `Your blood request was rejected by ${match.donorName}`,
      matchId: match.id,
      status: "unread",
      createdAt: serverTimestamp(),
    });
  };

  return (
    <div className="matches-page">
      <div className="matches-container">
        <BackButton />

        <div className="dashboard-header">
          <h2 className="dashboard-title">Matched Blood Requests</h2>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="pulse-loader"></div>
            <p>Scanning for matches...</p>
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <h3>All clear!</h3>
            <p>No matches found at the moment. We'll notify you of urgent needs.</p>
          </div>
        )}

        <div className="matches-grid">
          {matches.map(match => (
            <div key={match.id} className={`match-card-premium ${match.status}`}>
              <div className="match-card-header">
                <div className="patient-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="patient-info">
                  <h4>{match.receiverName}</h4>
                  <div className="distance-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    {match.requestLocation ? `${match.requestLocation.lat.toFixed(4)}, ${match.requestLocation.lng.toFixed(4)}` : "Loc N/A"}
                  </div>
                </div>
                <div className="blood-group-badge">
                  {match.bloodGroup}
                </div>
              </div>

              <div className="match-card-body">
                <div className="detail-row">
                  <span className="label">Urgency:</span>
                  <span className="value high">CRITICAL</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className={`status-pill ${match.status}`}>
                    {match.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="match-card-footer">
                {match.status === "pending" && (
                  <div className="action-buttons-compact">
                    <button
                      className="accept-btn-premium"
                      onClick={() => handleAccept(match)}
                    >
                      Accept Request
                    </button>
                    <button
                      className="reject-btn-premium"
                      onClick={() => handleReject(match)}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {match.status === "accepted" && (
                  <button
                    className="primary-btn view-details-btn"
                    onClick={() => navigate(`/donor-view-request/${match.requestId}`)}
                  >
                    View Directions & Details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

