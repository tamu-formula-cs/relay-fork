"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const roles = ["", "BUSINESS", "ENGINEER"];

const subteamsByRole: { [key: string]: string[] } = {
  BUSINESS: ["", "FINANCE", "LOGISTICS", "MARKETING", "SALES"],
  ENGINEER: ["", "AERODYNAMICS", "BATTERY", "CHASSIS", "DISTRIBUTED BMS", "ELECTRONICS", "POWERTRAIN", "SOFTWARE", "SUSPENSION"],
};

interface UserInfoFormProps {
  sessionEmail: string;
  sessionName: string;
}

const UserInfoForm: React.FC<UserInfoFormProps> = ({ sessionEmail, sessionName }) => {
  const [role, setRole] = useState(roles[0]);
  const [subteam, setSubteam] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setSubteam("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setIsSubmitted(false);
    setError(null);

    try {
      const response = await fetch("/api/auth/NewUserInfo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: sessionEmail, name: sessionName, role, subteam, phone }),
      });

      if (response.ok) {
        const result = await response.json();
        setIsSubmitted(true);
        router.push("/");
      }
    } catch (error) {
      console.error("An error occurred during submission:", error);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <h2>{sessionName}, complete your profile!</h2>

        <label>
          Phone Number:
          <input 
            type="text"
            value={phone} 
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </label>

        <label>
          Role:
          <select value={role} onChange={(e) => handleRoleChange(e.target.value)} required disabled={!phone} >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role || "Select a role"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Subteam:
          <select value={subteam} onChange={(e) => setSubteam(e.target.value)} required disabled={!role || !phone} >
            {subteamsByRole[role]?.map((subteam) => (
              <option key={subteam} value={subteam}>
                {subteam || "Select a subteam"}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={isSubmitted || !role || !subteam || !phone}>
          {isSubmitted ? "Submitted" : "Submit"}
        </button>

        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
};

export default UserInfoForm;
