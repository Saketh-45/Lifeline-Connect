import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../App.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-logo-container">
          <img
            src={logo}
            alt="Lifeline Connect Logo"
          />
        </div>

        <h1>Lifeline <span>Connect</span></h1>
        <p className="hero-tagline">
          The most reliable digital platform for <b>real-time</b> blood donor matching and emergency healthcare support.
        </p>

        <div className="hero-buttons">
          <button className="primary-btn" onClick={() => navigate("/register")}>
            Join the Lifeline
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <h2>Why Lifeline Connect?</h2>

        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-placeholder">🩸</div>
            <h3>Quick Blood Requests</h3>
            <p>
              Request blood easily during emergencies and critical situations.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-placeholder">👥</div>
            <h3>Verified Donors</h3>
            <p>
              Only authenticated and registered donors are listed.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-placeholder">📍</div>
            <h3>Real-Time Availability</h3>
            <p>
              Donors update availability, preventing outdated matches.
            </p>
          </div>

          <div className="feature-card">
            <div className="icon-placeholder">🔐</div>
            <h3>Secure Platform</h3>
            <p>
              Your data is safely stored using Firebase authentication.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section">
        <h2>How It Works?</h2>

        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-title">Register & Login</div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-title">Choose Donor or Receiver</div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-title">Update Availability / Request Blood</div>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <div className="step-title">Get Connected Quickly</div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="cta-section">
        <div className="cta-card">
          <h2>Every Drop of <span>Blood</span> Matters</h2>
          <p>Join Lifeline Connect and help save lives by becoming a donor today.</p>

          <button className="primary-btn" onClick={() => navigate("/register")}>
            Get Started
          </button>
        </div>
      </section>
    </div>
  );
}

export default Home;
