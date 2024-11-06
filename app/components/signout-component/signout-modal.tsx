import React from 'react';
import { signOut } from 'next-auth/react';
import styles from "./signout.module.css"

interface SignOutModalProps {
    onClose: () => void;
  }
  
  const SignOutModal: React.FC<SignOutModalProps> = ({ onClose }) => {
    const handleSignOut = () => {
      signOut({ callbackUrl: '/', redirect: true });
    };
  
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <h2 className={styles.modalTitle}>Sign Out</h2>
          <p className={styles.modalMessage}>Are you sure you want to sign out?</p>
          <div className={styles.buttonGroup}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.signOutButton} onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  export default SignOutModal;
