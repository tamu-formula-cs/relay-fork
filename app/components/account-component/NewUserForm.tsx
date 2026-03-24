"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Logo from "../../../assets/logo.svg";
import styles from "./new-user.module.css";
import { useToast } from "../toast/use-toast";
import Image from "next/image";
import { Toaster } from "../toast/toaster";

const roles = ["", "BUSINESS", "ENGINEER"];

const subteamsByRole = {
  BUSINESS: ["", "FINANCE", "OPERATIONS", "MARKETING"],
  ENGINEER: ["", "AERODYNAMICS", "BATTERY", "CHASSIS","ELECTRONICS", "POWERTRAIN", "SUSPENSION", "DISTRIBUTED BMS", "SOFTWARE"],
};

const UserInfoForm: React.FC = () => {
  const { toast } = useToast();
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [role, setRole] = useState("");
  const [subteam, setSubteam] = useState("");
  const [phone, setPhone] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const carriers = ["", "AT&T", "Verizon", "T-Mobile", "Sprint"];

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

    try {
      const response = await fetch("/api/auth/NewUserInfo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, role, subteam, phone, carrier }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
            title: "Account created",
            description: "Your account has been created successfully!",
            variant: "affirmation",
        });
        await update();
        router.push("/");
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
        <h2 className={styles.heading}>Complete Your Account</h2>

        <div className={styles.newRow}>
          <div className={styles.inputGroup}>
            <label>Email:</label>
            <input
              type="email"
              value={session?.user?.email ?? ""}
              disabled
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

        <div className={styles.newRow}>
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

          <div className={styles.inputGroup}>
            <label>Cell Carrier:</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              required
              className={styles.inputField}
            >
              <option value="" disabled>
                Select a carrier
              </option>
              {carriers.slice(1).map((carrierOption) => (
                <option key={carrierOption} value={carrierOption}>
                  {carrierOption}
                </option>
              ))}
            </select>
          </div>

        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={
            isSubmitted ||
            !name ||
            !phone ||
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
