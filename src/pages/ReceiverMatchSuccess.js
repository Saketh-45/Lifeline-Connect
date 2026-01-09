import { useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker
} from "@react-google-maps/api";
import BackButton from "../components/BackButton";
import "../App.css";

// Prevent map reloading
const libraries = ['places', 'geometry'];



export default function ReceiverMatchSuccess() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmReceived, setShowConfirmReceived] = useState(false);
  const [donationNotification, setDonationNotification] = useState(null);
  // Use env key or fallback to the one provided
  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || " ";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  const [donor, setDonor] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [showDonorDetails, setShowDonorDetails] = useState(false);

  // Map Refs
  const [map, setMap] = useState(null);
  const onLoad = useCallback((mapInstance) => setMap(mapInstance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const center = useMemo(() => ({ lat: 20.5937, lng: 78.9629 }), []); // Default India

  const handleMarkReceived = async () => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "fulfilled"
      });
      setShowSuccess(true);
      setShowConfirmReceived(false);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const q = query(
        collection(db, "matches"),
        where("requestId", "==", requestId),
        where("receiverId", "==", user.uid)
      );

      const unsubMatch = onSnapshot(q, async (snap) => {
        if (snap.empty) return;

        const matchDoc = snap.docs[0];
        const matchData = matchDoc.data();

        // ✅ EXISTING: donor tracking
        if (matchData.status === "accepted") {
          const donorId = matchData.donorId;

          const unsubDonor = onSnapshot(
            doc(db, "users", donorId),
            (docSnap) => {
              if (docSnap.exists()) {
                setDonor(docSnap.data());
              }
            }
          );

          const reqSnap = await getDoc(doc(db, "requests", requestId));
          if (reqSnap.exists()) {
            setRequestDetails(reqSnap.data());
          }

          return () => unsubDonor();
        }

        // 🟢 NEW: donor completed donation
        if (matchData.status === "completed") {
          toast.success("✅ Donor has completed blood donation");
        }
      });

      return () => unsubMatch();
    });

    return () => unsubAuth();
  }, [requestId]);




  // Calculate Route when we have both locations
  useEffect(() => {
    if (isLoaded && donor?.location && requestDetails?.requestLocation) {
      // Only fetch directions if meaningful change? 
      // For now, fetching on updates is okay but API limits apply. 
      // We'll debounce or just fetch.

      const donorPos = { lat: donor.location.lat, lng: donor.location.lng };
      const destPos = { lat: requestDetails.requestLocation.lat, lng: requestDetails.requestLocation.lng };

      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route({
        origin: donorPos,
        destination: destPos,
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          // Extract ETA
          if (result.routes[0].legs[0]) {
            setDistance(result.routes[0].legs[0].distance.text);
            setDuration(result.routes[0].legs[0].duration.text);
          }
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      });
    }
  }, [isLoaded, donor?.location?.lat, donor?.location?.lng, requestDetails]);

  if (loadError) {
    return (
      <div className="dashboard-container" style={{ textAlign: 'center', marginTop: '50px' }}>
        <BackButton />
        <h3>⚠️ Map Error</h3>
        <p>Google Maps could not loop. Please check your API Key configuration.</p>
        <p style={{ fontSize: '12px', color: 'red' }}>{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) return <div className="loading-screen">Loading Maps...</div>;

  // Render Map
  return (
    <div className="tracking-page-container">
      {/* Absolute Back Button */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
        <BackButton />
      </div>

      <div className="map-container-full">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={donor?.location ? { lat: donor.location.lat, lng: donor.location.lng } : center}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            disableDefaultUI: true, // Cleaner look
            zoomControl: false,
            styles: [
              {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{ "visibility": "off" }]
              }
            ]
          }}
        >
          {/* Directions Renderer handles the path */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: false,
                preserveViewport: false,
                polylineOptions: {
                  strokeColor: "#000000",
                  strokeWeight: 5
                }
              }}
            />
          )}

          {/* If no route yet, show markers independently */}
          {!directions && donor?.location && (
            <Marker position={{ lat: donor.location.lat, lng: donor.location.lng }} />
          )}
        </GoogleMap>
      </div>
      {/* 🔔 Donation Completed Notification */}
      {donationNotification && (
        <div
          style={{
            background: "#e8f5e9",
            border: "1px solid #66bb6a",
            padding: "14px",
            borderRadius: "12px",
            margin: "15px",
            fontWeight: "600",
            color: "#2e7d32",
            zIndex: 20
          }}
        >
          <span>
            ✅ {donationNotification.message}
          </span>


          <button
            style={{
              display: "block",
              marginTop: "10px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: "#2e7d32",
              color: "#fff",
              fontWeight: "600"
            }}
            onClick={async () => {
              await updateDoc(
                doc(db, "notifications", donationNotification.id),
                { read: true }
              );
              setDonationNotification(null);
            }}
          >
            Acknowledge
          </button>
        </div>
      )}


      {/* Bottom Sheet - Uber Style */}
      {donor && (
        <motion.div
          className="tracking-bottom-sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 500 }}
          dragElastic={0.05}
          dragMomentum={false}
          style={{ touchAction: 'none' }}
        >
          {/* Drag Handle */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '15px' }}>
            <div style={{ width: '40px', height: '5px', background: '#ccc', borderRadius: '10px' }}></div>
          </div>

          <div className="sheet-header">
            <div className="status-text-block">
              <h2 className="status-title">On the way</h2>
              <span style={{ color: '#757575', fontSize: '14px', fontWeight: '500' }}>
                Drop-off: {(requestDetails?.hospitalName || "Hospital").substring(0, 20)}...
              </span>
            </div>
            <div className="time-badge">
              <span style={{ fontSize: '18px' }}>⚡</span>
              {duration || "Calculating..."}
            </div>
          </div>

          <div className="driver-profile-section">
            <div className="driver-avatar-circle">
              {donor.fullName ? donor.fullName.charAt(0).toUpperCase() : "D"}
            </div>
            <div className="driver-info-block">
              <h3 className="driver-name">{donor.fullName || "Lifeline Donor"}</h3>
              <div className="driver-subtext">
                <span style={{ color: '#d32f2f', fontWeight: '800' }}>{donor.bloodGroup}</span> Donor • 4.9 ★
              </div>
              <div className="vehicle-info">
                {distance ? `Current Location: ${distance} away` : `Arriving from ${donor.city || "Nearby"}`}
              </div>
            </div>
          </div>

          {/* Polished Action Grid for Receiver */}
          <div className="sheet-actions-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>

            {/* 1. Call Donor */}
            <button
              className="action-icon-btn"
              onClick={() => window.location.href = `tel:${donor.mobileNumber || ''}`}
            >
              <div className="action-icon-circle" style={{ color: '#000' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <span className="action-label">Call</span>
            </button>

            {/* 2. Message */}
            <button className="action-icon-btn">
              <div className="action-icon-circle" style={{ color: '#000' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <span className="action-label">Message</span>
            </button>

            {/* 3. Donor Details */}
            <button
              className="action-icon-btn"
              onClick={() => setShowDonorDetails(true)}
            >
              <div className="action-icon-circle" style={{ color: '#1976d2' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <span className="action-label">Donor Details</span>
            </button>
          </div>

          {/* Primary Action Button (Mark as Received) */}
          <div style={{ paddingBottom: '20px', marginTop: '10px' }}>
            <button
              className="primary-action-btn btn-green"
              onClick={() => setShowConfirmReceived(true)} // Changed to trigger confirmation
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark as Received
            </button>
          </div>
        </motion.div>
      )}

      {/* Donor Details Modal */}
      {showDonorDetails && donor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="settings-modal" style={{ width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="about-header" style={{ marginBottom: '20px' }}>
              <h2>Donor Profile</h2>
              <span className="close-icon" onClick={() => setShowDonorDetails(false)}>✕</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#555' }}>
                {donor.fullName ? donor.fullName.charAt(0).toUpperCase() : "D"}
              </div>
              <h2 style={{ margin: 0 }}>{donor.fullName}</h2>
              <span style={{ background: '#e3f2fd', color: '#1976d2', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                {donor.bloodGroup} Donor
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="detail-item">
                <label className="input-label">Contact Number</label>
                <div style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {donor.mobileNumber}
                  <a href={`tel:${donor.mobileNumber}`} style={{ color: '#2e7d32', fontWeight: 'bold', textDecoration: 'none' }}>CALL</a>
                </div>
              </div>
              <div className="detail-item">
                <label className="input-label">Location</label>
                <div style={{ fontSize: '15px' }}>{donor.city}, {donor.state}</div>
              </div>
              {donor.age && (
                <div className="detail-item">
                  <label className="input-label">Age</label>
                  <div style={{ fontSize: '15px' }}>{donor.age}</div>
                </div>
              )}
              <div className="detail-item">
                <label className="input-label">Verification</label>
                <div style={{ fontSize: '14px', color: '#2e7d32' }}>✅ Verified Donor</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDonorDetails(false)}
            style={{
              width: '100%', padding: '12px', marginTop: '25px',
              background: '#000', color: 'white', border: 'none',
              borderRadius: '12px', fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>
      )}
      {/* Custom Confirmation Overlay */}
      {showConfirmReceived && (
        <div className="success-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
          <div className="success-card" style={{ background: 'white', borderRadius: '24px' }}>
            <div className="success-icon-lottie" style={{ background: '#e8f5e9', color: '#2e7d32' }}>❓</div>
            <h2 style={{ fontSize: '22px' }}>Confirm Receipt</h2>
            <p>
              Have you successfully received the blood? <br />
              This will mark the request as fulfilled.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="success-dashboard-btn"
                onClick={() => setShowConfirmReceived(false)}
                style={{ background: '#f5f5f5', color: '#333', boxShadow: 'none' }}
              >
                Not Yet
              </button>
              <button
                className="success-dashboard-btn"
                onClick={handleMarkReceived}
              >
                Yes, Received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Screen Overlay */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-icon-lottie">🎉</div>
            <h2>Donation Successfully Completed</h2>
            <p>
              Your blood request has been successfully fulfilled.
            </p>
            <button
              className="success-dashboard-btn"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );

}
