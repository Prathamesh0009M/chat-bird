import React, { useState } from "react";
import "./Setting.css";

const languages = ["en", "hi", "mr", "kn", "es", "fr", "de", "ja", "zh", "ar", "pt", "ru", "it"];
const statuses = ["online", "offline", "away", "busy", "invisible"];

const Setting = () => {

    const user = JSON.parse(localStorage.getItem("user"));

    const [formData, setFormData] = useState({
        name: user?.name || "",
        username: user?.username || "",
        email: user?.email || "",
        preferredLanguage: user?.preferredLanguage || "en",
        bio: user?.bio || "",
        phoneNumber: user?.phoneNumber || "",
        status: user?.status || "offline",
        autoTranslate: user?.autoTranslate ?? true,
        avatar: null,
        coverPhoto: null,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleFileChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.files[0],
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = new FormData();
        for (let key in formData) {
            data.append(key, formData[key]);
        }
        console.log(data);

        try {
            const res = await fetch("/api/user/update-profile", {
                method: "PUT",
                body: data,
            });

            const result = await res.json();
            alert("Profile updated successfully!");
        } catch (error) {
            alert("Error updating profile");
        }
    };

    return (
        <div className="settings-container">
            <h2 className="settings-title">Account Settings</h2>

            <form className="settings-form" onSubmit={handleSubmit}>

                <div className="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Username</label>
                    <input type="text" name="username" value={formData.username} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Phone Number</label>
                    <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Preferred Language</label>
                    <select name="preferredLanguage" value={formData.preferredLanguage} onChange={handleChange}>
                        {languages.map((lang) => (
                            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                        {statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Bio</label>
                    <textarea name="bio" rows="3" value={formData.bio} onChange={handleChange} />
                </div>

                <div className="form-check">
                    <input
                        type="checkbox"
                        name="autoTranslate"
                        checked={formData.autoTranslate}
                        onChange={handleChange}
                    />
                    <span>Enable Auto Translate</span>
                </div>

                <div className="form-group">
                    <label>Avatar</label>
                    <input type="file" name="avatar" onChange={handleFileChange} accept="image/*" />
                </div>

                <div className="form-group">
                    <label>Cover Photo</label>
                    <input type="file" name="coverPhoto" onChange={handleFileChange} accept="image/*" />
                </div>

                <button className="save-btn">Save Changes</button>
            </form>
        </div>
    );
};

export default Setting;
