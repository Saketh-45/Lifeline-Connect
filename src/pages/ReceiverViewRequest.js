import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";
import BackButton from "../components/BackButton";

export default function ReceiverViewRequest() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 LISTEN FOR ACCEPTED MATCH
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
        navigate(`/receiver-match-success/${requestId}`);
      }
    });

    return () => unsubscribe();
  }, [requestId, navigate]);

  // Load request details
  useEffect(() => {
    const loadRequest = async () => {
      const snap = await getDoc(doc(db, "requests", requestId));
      if (snap.exists()) setRequest(snap.data());
      setLoading(false);
    };
    loadRequest();
  }, [requestId]);

  if (loading) return <p>Loading request...</p>;

  return (
    <div className="dashboard-container">
      <BackButton />
      <h2>Patient & Hospital Details</h2>

      {request && (
        <>
          <p><b>Patient:</b> {request.patientName}</p>
          <p><b>Blood Group:</b> {request.bloodGroup}</p>
          <p><b>Hospital:</b> {request.hospitalName}</p>
        </>
      )}

      <h2>Available Donors</h2>
      <p>Waiting for donor response...</p>
    </div>
  );
}
