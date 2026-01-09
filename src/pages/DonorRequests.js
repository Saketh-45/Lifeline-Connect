import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth, db } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  Timestamp
} from "firebase/firestore";
import "../App.css";

function DonorRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const donorRef = doc(db, "users", user.uid);
        const donorSnap = await getDoc(donorRef);

        if (!donorSnap.exists()) {
          setLoading(false);
          return;
        }

        const donorData = donorSnap.data();

        // 🚫 Cooldown check
        if (
          donorData.cooldownUntil &&
          new Date() < donorData.cooldownUntil.toDate()
        ) {
          setLoading(false);
          return;
        }

        // 🚫 Availability check
        if (!donorData.availabilityToDonate) {
          setLoading(false);
          return;
        }

        const donorCity = donorData.city?.trim().toLowerCase();
        const donorBloodGroup = donorData.bloodGroup?.trim().toUpperCase();

        if (!donorCity || !donorBloodGroup) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "requests"),
          where("city", "==", donorCity),
          where("bloodGroup", "==", donorBloodGroup),
          where("status", "==", "Pending") // ✅ FIXED
        );

        const snapshot = await getDocs(q);

        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setRequests(list);
      } catch (error) {
        console.error("Error fetching requests:", error);
      }

      setLoading(false);
    };

    fetchRequests();
  }, []);

  const acceptRequest = async (requestId) => {
    const user = auth.currentUser;
    if (!user) return;

    const now = new Date();
    const cooldownDays = 90;

    const cooldownUntil = new Date(
      now.getTime() + cooldownDays * 24 * 60 * 60 * 1000
    );

    // 1️⃣ Update request
    await updateDoc(doc(db, "requests", requestId), {
      status: "accepted",
      acceptedBy: user.uid,
      acceptedAt: now,
    });

    // 2️⃣ Update donor cooldown
    await updateDoc(doc(db, "users", user.uid), {
      lastDonationAt: now,
      cooldownUntil: Timestamp.fromDate(cooldownUntil),
      availabilityToDonate: false,
    });

    toast.success(
      `Request accepted.\nYou will be eligible to donate again after ${cooldownDays} days.`,
      { duration: 6000 }
    );

    setRequests(prev => prev.filter(r => r.id !== requestId));
  };

  if (loading) {
    return <div className="container">Loading requests...</div>;
  }

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Blood Requests Near You</h2>

      {requests.length === 0 ? (
        <p className="info-text">No matching blood requests at the moment.</p>
      ) : (
        requests.map(req => (
          <div key={req.id} className="request-box">
            <p><strong>Purpose:</strong> {req.purpose}</p>
            <p><strong>Blood Group:</strong> {req.bloodGroup}</p>
            <p><strong>Units Required:</strong> {req.bloodUnits}</p>

            <p><strong>Patient Name:</strong> {req.patientName}</p>
            <p><strong>Patient Age:</strong> {req.patientAge}</p>

            <p><strong>Hospital:</strong> {req.hospitalName}</p>
            <p><strong>Required Date:</strong> {req.requiredDate}</p>

            <p><strong>Location:</strong> {req.city}, {req.state}</p>
            <p><strong>Address:</strong> {req.address}</p>

            <p><strong>Contact:</strong> {req.mobileNumber}</p>
            {req.email && <p><strong>Email:</strong> {req.email}</p>}

            <button
              className="big-btn"
              onClick={() => acceptRequest(req.id)}
            >
              I Can Donate
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default DonorRequests;
