import { useNavigate, useLocation } from "react-router-dom";
import "../App.css";

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const getFallbackPath = (currentPath) => {
    if (currentPath === "/login" || currentPath === "/register") return "/";
    if (currentPath.startsWith("/request/")) return "/dashboard"; // Fallback for donor lists
    if (currentPath.startsWith("/receiver-view")) return "/my-requests";
    if (currentPath.startsWith("/donor-view")) return "/donor-matches";
    return "/dashboard";
  };

  const handleBack = () => {
    // Check if there is a history stack to go back to (idx > 0 usually implies strictly not the first page)
    // However, react-router's key is safer for distinguishing fresh loads in some contexts.
    // We'll use the window.history.state.idx check as a robust proxy for "is there a previous page".
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      const fallback = getFallbackPath(location.pathname);
      navigate(fallback, { replace: true });
    }
  };

  return (
    <button
      className="back-btn"
      onClick={handleBack}
      aria-label="Go back to previous page"
      title="Go Back"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Back
    </button>
  );
}

export default BackButton;
