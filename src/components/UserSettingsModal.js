import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal, Button, Form, Row, Col, Tab, Nav, Alert } from 'react-bootstrap';
import { BsPerson, BsShieldCheck, BsXLg, BsBoxArrowRight, BsGear, BsPalette, BsTrash } from 'react-icons/bs';
import { auth, db } from '../services/firebase';
import { deleteUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';

const UserSettingsModal = ({ show, onHide, logout }) => {
    const [loading, setLoading] = useState(true);
    const [themeColor, setThemeColor] = useState(localStorage.getItem('themeColor') || '#e53935');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        dateOfBirth: "",
        gender: "",
        bloodGroup: "",
        email: "",
        phone: "",
        alternatePhone: "",
        state: "",
        city: "",
        address: "",
        availabilityToDonate: false
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const snap = await getDoc(doc(db, "users", user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    setFormData({
                        fullName: data.fullName || "",
                        dateOfBirth: data.dateOfBirth || "",
                        gender: data.gender || "",
                        bloodGroup: data.bloodGroup || "",
                        email: data.email || "",
                        phone: data.phone || "",
                        alternatePhone: data.alternatePhone || "",
                        state: data.state || "",
                        city: data.city || "",
                        address: data.address || "",
                        availabilityToDonate: data.availabilityToDonate || false
                    });
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        };

        if (show) fetchUserData();
    }, [show]);

    useEffect(() => {
        document.documentElement.style.setProperty('--primary-red', themeColor);
        localStorage.setItem('themeColor', themeColor);
    }, [themeColor]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async () => {
        try {
            const user = auth.currentUser;
            await updateDoc(doc(db, "users", user.uid), formData);

            await addDoc(collection(db, "notifications"), {
                toUserId: user.uid,
                message: "Your profile details have been updated successfully.",
                status: "unread",
                createdAt: serverTimestamp(),
            });

            toast.success("Profile updated successfully!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update profile");
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("No user found. Please login again.");
                return;
            }

            console.log("Starting account deletion for:", user.uid);

            // 1. Delete Firestore data first (requires auth)
            try {
                await deleteDoc(doc(db, "users", user.uid));
                console.log("Firestore document deleted");
            } catch (fsErr) {
                console.error("Firestore deletion failed:", fsErr);
                throw new Error(`data_deletion_failed: ${fsErr.message}`);
            }

            // 2. Delete Auth record
            try {
                await deleteUser(user);
                console.log("Auth user deleted");
            } catch (authErr) {
                console.error("Auth deletion failed:", authErr);
                throw authErr; // Re-throw to handle in main catch
            }

            toast.success("Account deleted successfully. We're sorry to see you go.");
            onHide();
            logout();
        } catch (err) {
            console.error("Full deletion error:", err);

            if (err.code === 'auth/requires-recent-login' || err.message?.includes('requires-recent-login')) {
                toast.error("SECURITY CHECK: For your protection, account deletion requires a very recent login. Please log out, log back in, and immediately try deleting your account again.");
            } else if (err.message?.includes('data_deletion_failed')) {
                toast.error("PERMISSION ERROR: We couldn't delete your profile data. You might not have the right permissions. Please contact administrator.");
            } else {
                toast.error(`ERROR: ${err.message || "An unexpected error occurred."} Please contact support with this info.`);
            }
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading && show) return null;

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="lg"
            contentClassName="white-theme-modal border-0"
            backdropClassName="blur-backdrop"
        >
            <div className="overflow-hidden position-relative">
                {/* LOGOUT CONFIRMATION OVERLAY */}
                {showLogoutConfirm && (
                    <div className="confirmation-overlay p-4">
                        <div className="text-center p-5 rounded-4 bg-white shadow-lg border" style={{ maxWidth: '400px' }}>
                            <div className="mb-4 text-danger">
                                <BsShieldCheck size={50} />
                            </div>
                            <h4 className="fw-bold mb-2">Secure Logout</h4>
                            <p className="text-muted mb-4">Are you sure you want to sign out of your Lifeline Account?</p>
                            <div className="d-flex gap-2 justify-content-center">
                                <Button variant="light" className="px-4 fw-bold" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
                                <Button variant="danger" className="px-4 fw-bold" onClick={() => { onHide(); logout(); }}>Yes, Logout</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* HEADER */}
                <Modal.Header className="px-4 py-3 border-0">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <BsShieldCheck size={22} /> User Account Hub
                    </Modal.Title>
                    <button className="btn-close-premium" onClick={onHide}>
                        <BsXLg />
                    </button>
                </Modal.Header>

                {/* DELETE ACCOUNT CONFIRMATION OVERLAY */}
                {showDeleteConfirm && (
                    <div className="confirmation-overlay p-4" style={{ backgroundColor: 'rgba(255, 230, 230, 0.98)' }}>
                        <div className="text-center p-5 rounded-4 bg-white shadow-lg border-danger border" style={{ maxWidth: '450px' }}>
                            <div className="mb-4 text-danger">
                                <BsTrash size={50} />
                            </div>
                            <h4 className="fw-bold mb-2 text-danger">Final Confirmation</h4>
                            <p className="text-dark mb-4">
                                This will <strong>permanently delete</strong> your Lifeline account, donor status, and history.
                                This action cannot be undone. Are you absolutely sure?
                            </p>
                            <Alert variant="warning" className="small py-2 px-3 mb-4">
                                <strong>Warning:</strong> You will be logged out immediately.
                            </Alert>
                            <div className="d-flex gap-2 justify-content-center">
                                <Button variant="light" className="px-4 fw-bold" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                                    Go Back
                                </Button>
                                <Button variant="danger" className="px-4 fw-bold" onClick={handleDeleteAccount} disabled={isDeleting}>
                                    {isDeleting ? "Deleting..." : "Yes, Delete Forever"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <Modal.Body className="p-0">
                    <Tab.Container defaultActiveKey="profile">
                        <Row className="g-0">
                            {/* SIDEBAR */}
                            <Col md={3} className="sidebar-col d-flex flex-column" style={{ minHeight: '520px' }}>
                                <Nav variant="pills" className="flex-column p-3 gap-2 flex-grow-1">
                                    <Nav.Item>
                                        <Nav.Link eventKey="profile" className="d-flex align-items-center gap-2 py-2 px-3 rounded-3">
                                            <BsPerson size={18} /> Update Profile
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="settings" className="d-flex align-items-center gap-2 py-2 px-3 rounded-3">
                                            <BsGear size={18} /> Preferences
                                        </Nav.Link>
                                    </Nav.Item>
                                </Nav>
                                <div className="p-3 mt-auto">
                                    <button className="sidebar-signout-btn w-100" onClick={() => setShowLogoutConfirm(true)}>
                                        <BsBoxArrowRight size={20} /> Sign Out
                                    </button>
                                </div>
                            </Col>

                            {/* CONTENT AREA */}
                            <Col md={9}>
                                <Tab.Content className="p-4 custom-scrollbar" style={{ height: '520px', overflowY: 'auto' }}>

                                    {/* UPDATE PROFILE TAB */}
                                    <Tab.Pane eventKey="profile">
                                        <div className="profile-section">
                                            <div className="profile-card">
                                                <div className="profile-card-title">
                                                    <BsPerson /> Identity & Medical
                                                </div>
                                                <Row className="g-3">
                                                    <Col md={6}>
                                                        <Form.Label>Full Name</Form.Label>
                                                        <Form.Control name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="John Doe" />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>Date of Birth</Form.Label>
                                                        <Form.Control type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>Gender</Form.Label>
                                                        <Form.Select name="gender" value={formData.gender} onChange={handleInputChange}>
                                                            <option value="">Select</option>
                                                            <option>Male</option>
                                                            <option>Female</option>
                                                            <option>Other</option>
                                                        </Form.Select>
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>Blood Group</Form.Label>
                                                        <Form.Select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                                                            <option value="">Select</option>
                                                            <option>A+</option><option>A-</option>
                                                            <option>B+</option><option>B-</option>
                                                            <option>AB+</option><option>AB-</option>
                                                            <option>O+</option><option>O-</option>
                                                        </Form.Select>
                                                    </Col>
                                                </Row>
                                            </div>

                                            <div className="profile-card">
                                                <div className="profile-card-title">
                                                    <BsGear /> Contact & Location
                                                </div>
                                                <Row className="g-3">
                                                    <Col md={12}>
                                                        <Form.Label>Email (Read-Only)</Form.Label>
                                                        <Form.Control value={formData.email} disabled />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>Mobile</Form.Label>
                                                        <Form.Control name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Primary" />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>Alt Mobile</Form.Label>
                                                        <Form.Control name="alternatePhone" value={formData.alternatePhone} onChange={handleInputChange} placeholder="Secondary" />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>State</Form.Label>
                                                        <Form.Control name="state" value={formData.state} onChange={handleInputChange} placeholder="State" />
                                                    </Col>
                                                    <Col md={6}>
                                                        <Form.Label>City</Form.Label>
                                                        <Form.Control name="city" value={formData.city} onChange={handleInputChange} placeholder="City" />
                                                    </Col>
                                                    <Col md={12}>
                                                        <Form.Label>Full Address</Form.Label>
                                                        <Form.Control as="textarea" rows={3} name="address" value={formData.address} onChange={handleInputChange} placeholder="Enter full address" />
                                                    </Col>
                                                </Row>
                                            </div>

                                            <Button variant="danger" className="w-100 fw-bold py-2 rounded-3 shadow-sm mb-4" onClick={handleSaveProfile} style={{ background: '#e53935' }}>
                                                Update Profile Details
                                            </Button>
                                        </div>
                                    </Tab.Pane>

                                    {/* PREFERENCES TAB */}
                                    <Tab.Pane eventKey="settings">
                                        <h5 className="fw-bold mb-4">Application Preferences</h5>

                                        {/* Color Themes */}
                                        <div className="theme-picker-card mb-4">
                                            <div className="d-flex align-items-center gap-2 mb-3 fw-bold text-dark">
                                                <BsPalette className="text-danger" /> Accent Color Theme
                                            </div>
                                            <p className="small text-muted mb-3">Choose a color highlight that matches your preference.</p>
                                            <div className="d-flex gap-3">
                                                {['#e53935', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b'].map(c => (
                                                    <div
                                                        key={c}
                                                        className={`theme-circle ${themeColor === c ? 'active' : ''}`}
                                                        style={{ background: c }}
                                                        onClick={() => setThemeColor(c)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Danger Zone: Delete Account */}
                                        <div className="delete-account-card">
                                            <div className="d-flex align-items-center gap-2 mb-2 fw-bold text-danger">
                                                <BsTrash /> Danger Zone
                                            </div>
                                            <p className="small text-muted mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                                            <Button variant="outline-danger" className="fw-bold rounded-3" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                                                Delete My Account
                                            </Button>
                                        </div>
                                    </Tab.Pane>
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Modal.Body>
                <Modal.Footer className="px-4 border-0">
                    <Button variant="secondary" onClick={onHide} className="rounded-3 px-4">Close Hub</Button>
                </Modal.Footer>
            </div>
        </Modal>
    );
};

export default UserSettingsModal;
