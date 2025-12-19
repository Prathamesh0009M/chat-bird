import React, { useState } from "react";
import "./Login.css";
import { loginUser } from "../services/api";   // <-- imported loginUser
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      console.log("Sending Login Data:", formData);

      // ✅ Call the imported API function
      const response = await loginUser(
        formData.email,
        formData.password
      );

      if (response && response.data) {
        console.log("Login successful:", response.data);

        // 🔥 navigate to dashboard or home
        navigate("/");
      }

    } catch (err) {
      console.error("Login error:", err);
      alert("Invalid credentials");
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">Login</h2>

        <label>Email</label>
        <input
          type="email"
          name="email"
          placeholder="Enter email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          placeholder="Enter password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit" className="login-btn">Login</button>
      </form>
    </div>
  );
};

export default Login;
