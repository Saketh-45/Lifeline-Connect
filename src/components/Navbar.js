import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { FiLogOut, FiBell, FiUser } from "react-icons/fi";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import emailjs from "emailjs-com"; // ✅ ADDED
import { FiSettings } from "react-icons/fi";
import UserSettingsModal from "./UserSettingsModal";
import logo from "../assets/logo.png";
import "../App.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profileData, setProfileData] = useState(null); // ✅ ADDED
  const [fullName, setFullName] = useState(""); // ✅ ADDED

  // ✅ ADDED (Notifications)
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ ADDED (EmailJS form states)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch full profile for initial
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) setProfileData(snap.data());
      } else {
        setProfileData(null);
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ ADDED (Fetch Notifications + 30s Auto-Expiration)
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      // Snapshot Listener for Real-time Data
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Initial filtering for obviously old stuff on load
        // But the robust check is in the interval below.
        setNotifications(notifs);
      });

      return () => {
        unsubscribe();
      };
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Update unread count whenever notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => n.status === "unread").length);
  }, [notifications]);

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation(); // Prevent clicking the item itself

    // 1. Optimistic UI Update: Remove immediately from view
    setNotifications(prev => prev.filter(n => n.id !== id));

    // 2. Perform actual delete
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error("Error deleting notification:", err);
      // Optional: Re-fetch or revert if error (omitted for simplicity as fetch will sync eventually)
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.status === "unread") {
      try {
        await updateDoc(doc(db, "notifications", notif.id), {
          status: "read",
        });
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
    setShowNotifications(false);
    // Optional: navigate based on notification type
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => n.status === "unread");
    unread.forEach(async (n) => {
      try {
        await updateDoc(doc(db, "notifications", n.id), {
          status: "read",
        });
      } catch (err) {
        console.error("Error marking all read:", err);
      }
    });
  };

  // ⛔ prevent flicker
  if (checking) return null;

  const publicPages = ["/", "/login", "/register"];
  const isPublicPage = publicPages.includes(location.pathname);

  // ✅ ADDED (Send Message logic)
  const sendMessage = () => {
    if (!name || !email || !subject || !message) {
      toast.error("Please fill all fields");
      return;
    }

    emailjs
      .send(
        "service_fem3w3p",
        "template_qve9dbp",
        {
          name,
          email,
          subject,
          message,
        },
        "ndujZnbGbhDWnbth2"
      )
      .then(
        async () => {
          // ✅ NOTIFICATION: Message Sent
          if (user) {
            await addDoc(collection(db, "notifications"), {
              toUserId: user.uid,
              message: "Your message has been sent to support. We will get back to you shortly.",
              status: "unread",
              createdAt: serverTimestamp(),
            });
          }

          toast.success("Message sent successfully!");
          setName("");
          setEmail("");
          setSubject("");
          setMessage("");
        },
        () => {
          toast.error("Failed to send message. Please try again.");
        }
      );
  };

  return (
    <>
      <div className="navbar">
        <div className="nav-container">
          {/* LEFT */}
          <div className="nav-left">
            <div className="nav-logo-container">
              <img src={logo} alt="Lifeline Connect" />
            </div>
            <div className="nav-divider"></div>
            <strong className="nav-brand">
              Lifeline <span>Connect</span>
            </strong>
          </div>

          {/* RIGHT */}
          <div className="nav-right">
            {isPublicPage && (
              <>
                <button className="nav-btn" onClick={() => navigate("/")}>Home</button>
                <button className="nav-btn" onClick={() => navigate("/login")}>Login</button>
                <button className="nav-btn nav-btn-cta" onClick={() => navigate("/register")}>Register</button>
              </>
            )}

            {!isPublicPage && user && (
              <>
                <button className="nav-btn" onClick={() => setShowAbout(true)}>About Us</button>
                <button className="nav-btn" onClick={() => setShowContact(true)}>Contact Us</button>

                <div className="nav-notification-container">
                  <button
                    className="nav-btn-icon"
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications && unreadCount > 0) markAllRead();
                    }}
                  >
                    <FiBell size={20} />
                    {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                  </button>

                  {showNotifications && (
                    <div className="notification-dropdown">
                      <div className="notification-header">
                        <h3>Notifications</h3>
                      </div>
                      <div className="notification-list">
                        {notifications.length === 0 ? (
                          <div className="no-notifications">No notifications</div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`notification-item ${notif.status}`}
                              onClick={() => handleNotificationClick(notif)}
                            >
                              <div className="notif-content">
                                <p>{notif.message}</p>
                                <span className="notification-time">
                                  {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString([], {
                                    month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  }) : "Just now"}
                                </span>
                              </div>
                              <button
                                className="delete-notif-btn"
                                onClick={(e) => handleDeleteNotification(e, notif.id)}
                                aria-label="Delete Notification"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="profile-trigger-container"
                  onClick={() => setShowSettings(true)}
                  title="My Account"
                >
                  <div className="profile-avatar-circle">
                    {profileData?.fullName ? profileData.fullName.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() || "U")}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ABOUT US MODAL */}
      {showAbout && (
        <div className="about-overlay">
          <div className="about-modal">
            <div className="about-header">
              <h2>About Lifeline Connect</h2>
              <span className="close-icon" onClick={() => setShowAbout(false)}>
                ✕
              </span>
            </div>
            <div className="about-content">
              <p>
                Lifeline Connect is a digital healthcare support platform designed
                to provide quick, reliable, and secure access to essential
                medical assistance. The platform aims to bridge the gap between
                individuals and healthcare services during critical situations.
              </p>

              <p>
                By offering a simple and user-friendly interface, Lifeline
                Connect allows users to register, authenticate securely, and
                access healthcare-related support without technical complexity.
                The system focuses on reliability, accessibility, and data
                security.
              </p>

              <p>
                Designed for individuals, caregivers, and healthcare support
                systems, Lifeline Connect enhances trust and response efficiency
                by combining modern web technologies with secure authentication.
                Our goal is to ensure timely help and dependable digital support
                when it matters most.
              </p>
            </div>
            <div className="about-footer">
              <button className="logout-confirm" onClick={() => setShowAbout(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT US MODAL */}
      {showContact && (
        <div className="about-overlay">
          <div className="contact-modal">
            <div className="about-header">
              <h2>Contact Us</h2>
              <span className="close-icon" onClick={() => setShowContact(false)}>
                ✕
              </span>
            </div>

            <div className="contact-body">
              <div className="contact-left">
                <p>
                  We’re here to help you with any questions, feedback, or support
                  related to the Lifeline Connect platform.
                </p>
                <h4>Reach Us</h4>
                <p>📧 xyz702173@gmail.com</p>
                <p>📞 +91-9000071546</p>
                <p>📍 MLR Institute of Technology</p>
                <p>🎓 Computer Science & Engineering</p>

                <h4>When to Contact Us?</h4>
                <ul>
                  <li>Technical support or issue reporting</li>
                  <li>Feedback and feature suggestions</li>
                  <li>Academic or project-related queries</li>
                  <li>Collaboration or guidance requests</li>
                </ul>
              </div>
            </div>

            <div className="contact-right">
              <h3>Send Us a Message</h3>

              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <textarea
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>

              <button className="logout-confirm" onClick={sendMessage}>Send Message</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <UserSettingsModal
          show={showSettings}
          onHide={() => setShowSettings(false)}
          user={user}
          logout={async () => {
            await signOut(auth);
            navigate("/");
          }}
        />
      )}
    </>
  );
}

export default Navbar;
