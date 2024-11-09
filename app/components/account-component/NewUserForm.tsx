"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../../assets/logo.svg";
import styles from "./new-user.module.css";
import { useToast } from "../toast/use-toast";
import Image from "next/image";
import { Toaster } from "../toast/toaster";

const roles = ["", "BUSINESS", "ENGINEER"];

const subteamsByRole = {
  BUSINESS: ["", "FINANCE", "OPERATIONS"],
  ENGINEER: ["", "AERODYNAMICS", "BATTERY", "CHASSIS", "DISTRIBUTED BMS", "ELECTRONICS", "POWERTRAIN", "SUSPENSION", "DISTRIBUTED BMS", "SOFTWARE"],
};

const UserInfoForm: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [subteam, setSubteam] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const router = useRouter();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setRole(newRole);
    setSubteam("");
  };

  const handleSubteamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubteam(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setIsSubmitted(false);

    if (password !== confirmPassword) {
      toast({
          title: "Passwords Do Not Match",
          description: "Your passwords do not match. Please try again.",
          variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/auth/NewUserInfo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name, role, subteam, phone, password }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
            title: "User created",
            description: "User created successfully!",
            variant: "affirmation",
        });
        router.push("/account");
      } else {
        const result = await response.json();
        toast({
          title: "Error",
          description: result.error + ".",
          variant: "destructive",
      });
      }
    } catch (error) {
      console.error("An error occurred during submission:", error);
      toast({
        title: "Unexpected Error Occured",
        description: "Something unexpected happened. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={styles.newMain}>
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <h2 className={styles.heading}>Create Your Account</h2>

        <div className={styles.newRow}>
          <div className={styles.inputGroup}>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              required
              className={styles.inputField}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              required
              className={styles.inputField}
            />
          </div>
        </div>

        <div className={styles.newRow}>
          <div className={styles.inputGroup}>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className={styles.inputField}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Confirm Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              className={styles.inputField}
            />
          </div>
        </div>

        <div className={styles.newRow}>
          <div className={styles.inputGroup}>
            <label>Role:</label>
            <select value={role} onChange={handleRoleChange} required className={styles.inputField}>
              <option value="" disabled>
                Select a role
              </option>
              {roles.slice(1).map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </div>

          {role && (
            <div className={styles.inputGroup}>
              <label>Subteam:</label>
              <select value={subteam} onChange={handleSubteamChange} required className={styles.inputField}>
                <option value="" disabled>
                  Select a subteam
                </option>
                {subteamsByRole[role as keyof typeof subteamsByRole].slice(1).map((subteamOption) => (
                  <option key={subteamOption} value={subteamOption}>
                    {subteamOption}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label>Phone Number:</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            required
            className={styles.inputField}
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={
            isSubmitted ||
            !email ||
            !name ||
            !phone ||
            !password ||
            !confirmPassword ||
            !role ||
            !subteam
          }
        >
          {isSubmitted ? "Submitted" : "Submit"}
        </button>
      </form>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <Image src={Logo.src} alt="Relay Logo" height={40} width={40}/>
          <span className={styles.footerText}>Relay</span>
        </div>
        <p className={styles.footerInfo}>Made in CSTX</p>
      </footer>
      <Toaster />
    </div>
  );
};

export default UserInfoForm;
