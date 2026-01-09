import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import BackButton from "../components/BackButton";
import "../App.css";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where
} from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";


/* ===== Blood Compatibility ===== */
const compatibility = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/* ===== Distance ===== */
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

function AvailableDonors() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const handleMatch = async (donor) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // ❌ Prevent duplicate matches
      const q = query(
        collection(db, "matches"),
        where("donorId", "==", donor.id),
        where("receiverId", "==", user.uid)
      );

      const existing = await getDocs(q);
      if (!existing.empty) {
        toast.error("You already matched with this donor");
        return;
      }

      // ✅ FETCH RECEIVER DETAILS FIRST
      const receiverSnap = await getDoc(doc(db, "users", user.uid));

      await setDoc(
        doc(db, "matches", `${user.uid}_${donor.id}`),
        {
          donorId: donor.id,
          donorName: donor.name,
          receiverId: user.uid,
          receiverName: receiverSnap.data().fullName,
          bloodGroup: donor.bloodGroup,
          status: "pending",
          requestId,
          createdAt: serverTimestamp(),
        }
      );
      toast.success("Match request sent successfully!");
    } catch (err) {
      console.error("Match error:", err);
      toast.error("Failed to create match");
    }
  };
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "matches"),
      where("requestId", "==", requestId),
      where("receiverId", "==", user.uid),
      where("status", "==", "accepted")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // 🚀 AUTO REDIRECT TO DONOR DETAILS PAGE
        navigate(`/receiver-match-success/${requestId}`);
      }
    });

    return () => unsubscribe();
  }, [requestId, navigate]);

  useEffect(() => {
    const fetchDonors = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        /* 1️⃣ Get request */
        const reqSnap = await getDoc(doc(db, "requests", requestId));
        if (!reqSnap.exists()) return;

        const request = reqSnap.data();

        // ✅ REQUIRED FIX
        const requestLocation =
          request.requestLocation || request.location || request.receiverLocation;

        if (!requestLocation) {
          console.error("Request location missing", request);
          return;
        }


        /* 2️⃣ Get all users */
        const usersSnap = await getDocs(collection(db, "users"));
        const list = [];

        usersSnap.forEach(d => {
          if (d.id === auth.currentUser.uid) return;

          const donor = d.data();

          if (
            donor.availabilityToDonate === true &&
            donor.location &&
            compatibility[donor.bloodGroup]?.includes(request.bloodGroup) &&
            (!donor.cooldownUntil || new Date() > donor.cooldownUntil.toDate())
          ) {
            const donorLoc = {
              lat: Number(donor.location.lat),
              lng: Number(donor.location.lng),
            };

            const reqLoc = {
              lat: Number(requestLocation.lat),
              lng: Number(requestLocation.lng),
            };

            const dist = distanceKm(reqLoc, donorLoc);

            if (dist <= 100) {
              list.push({
                id: d.id,
                name: donor.fullName,
                bloodGroup: donor.bloodGroup,
                distance: dist.toFixed(2),
              });
            }
          }
        });


        setDonors(list.sort((a, b) => a.distance - b.distance));
      } catch (err) {
        console.error("Error finding donors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDonors();
  }, [requestId]);

  if (loading) {
    return <div className="container">Finding nearby donors...</div>;
  }

  return (
    <div className="dashboard-container">
      <BackButton />
      <h2 className="dashboard-title">Available Donors</h2>

      {donors.length === 0 ? (
        <p className="info-text">No eligible donors found nearby.</p>
      ) : (
        donors.map(d => (
          <div key={d.id} className="request-box">
            <p><strong>Name:</strong> {d.name}</p>
            <p><strong>Blood Group:</strong> {d.bloodGroup}</p>
            <p><strong>Distance:</strong> {d.distance} km</p>

            <button
              className="big-btn"
              onClick={() => handleMatch(d)}
            >
              Match
            </button>

          </div>
        ))
      )}
    </div>
  );
}

export default AvailableDonors;
