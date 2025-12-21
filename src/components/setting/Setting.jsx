import React, { useState } from "react";
import "./Setting.css";
// import { updateUserProfile } from "../../../../../vap/controllers/user";
import { updateUserProfileService } from "../../services/api";

const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी" },
    { code: "mr", name: "मराठी" },
    { code: "kn", name: "ಕನ್ನಡ" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "ja", name: "日本語" },
    { code: "zh", name: "中文" },
    { code: "ar", name: "العربية" },
    { code: "pt", name: "Português" },
    { code: "ru", name: "Русский" },
    { code: "it", name: "Italiano" }
];

const Setting = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    const [formData, setFormData] = useState({
        name: user?.name || "",
        email: user?.email || "",
        preferredLanguage: user?.preferredLanguage || "en",
        bio: user?.bio || "",
        autoTranslate: user?.autoTranslate ?? true,
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar?.url || null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Avatar size must be less than 5MB");
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('preferredLanguage', formData.preferredLanguage);
            data.append('bio', formData.bio);
            data.append('autoTranslate', formData.autoTranslate);

            if (avatarFile) {
                data.append('profilePicture', avatarFile);
            }



            const result = await updateUserProfileService(data, token);
            if (result?.data?.success) {
                alert("Profile updated successfully");
                localStorage.setItem("user", JSON.stringify(result.data.user));
            } else {
                alert("Failed to update profile. Please try again.");
            }   

        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error updating profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-wrapper">
            <div className="settings-container">
                <div className="settings-header">
                    <h2>Account Settings</h2>
                    <p>Manage your profile and preferences</p>
                </div>

                <form className="settings-form" onSubmit={handleSubmit}>
                    {/* Profile Picture */}
                    <div className="profile-section">
                        <div className="avatar-container">
                            <div className="avatar-display">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {formData.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            <label className="avatar-upload-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                                Change Photo
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="form-field">
                        <label>Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label>Bio</label>
                        <textarea
                            name="bio"
                            rows="3"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder="Tell us about yourself..."
                            maxLength="150"
                        />
                        <span className="char-count">{formData.bio?.length || 0}/150</span>
                    </div>

                    <div className="form-field">
                        <label>Preferred Language</label>
                        <select
                            name="preferredLanguage"
                            value={formData.preferredLanguage}
                            onChange={handleChange}
                        >
                            {languages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-field-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                name="autoTranslate"
                                checked={formData.autoTranslate}
                                onChange={handleChange}
                            />
                            <span>Enable Auto Translate</span>
                        </label>
                        <p className="field-hint">Automatically translate messages to your preferred language</p>
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="save-button" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Setting;