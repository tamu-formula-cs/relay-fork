"use client";

import Link from 'next/link';
import styles from './Layout.module.css';
import LogoIcon from "../../../assets/logo.svg";
import Image from 'next/image';
import TeamLogo from "../../../assets/fsae.svg";
import BacklogIcon from "../../../assets/backlog.svg";
import ArchiveIcon from "../../../assets/archive.svg";
import DashboardIcon from "../../../assets/dashboard.svg";
import SupportIcon from "../../../assets/support.svg";
import FinanceIcon from "../../../assets/finance.svg"
import DownloadIcon from "../../../assets/download.svg"
import AccountIcon from "../../../assets/account.svg"
import { Toaster } from '../toast/toaster';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load sidebar state from local storage on component mount
  useEffect(() => {
    const storedState = localStorage.getItem('sidebar-collapsed');
    if (storedState) {
      setIsCollapsed(JSON.parse(storedState));
    }
    setIsLoading(false); // Indicate loading is complete
  }, []);

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsedState));
  };

  // Only render after loading is complete to prevent flickering
  if (isLoading) {
    return null;
  }

  return (
    <div className={styles.layout}>
      <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <button 
          className={styles.toggleButton}
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        <div className={styles.logoContainer}>
          <Image src={LogoIcon} alt="Logo" width={28} height={28} />
          <span className={styles.logoText}>Relay</span>
        </div>
        <div className={styles.divider} />
        
        <div className={styles.menuLabel}>MENU</div>
        
        <ul className={styles.navLinks}>
          <li className={pathname === '/' ? styles.active : ''}>
            <Link href="/">
              <Image 
                src={DashboardIcon} 
                alt="Dashboard" 
                width={16} 
                height={16}
                className={pathname === '/' ? styles.activeIcon : ''}
              />
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={pathname === '/backlog' ? styles.active : ''}>
            <Link href="/backlog">
              <Image 
                src={BacklogIcon} 
                alt="Backlog" 
                width={16} 
                height={16}
                className={pathname === '/backlog' ? styles.activeIcon : ''}
              />
              <span>Backlog</span>
            </Link>
          </li>
          <li className={pathname === '/finance' ? styles.active : ''}>
            <Link href="/finance">
              <Image 
                src={FinanceIcon} 
                alt="Backlog" 
                width={16} 
                height={16}
                className={pathname === '/finance' ? styles.activeIcon : ''}
              />
              <span>Finance</span>
            </Link>
          </li>
          <li className={pathname === '/archive' ? styles.active : ''}>
            <Link href="/archive">
              <Image 
                src={ArchiveIcon} 
                alt="Archive" 
                width={16} 
                height={16}
                className={pathname === '/archive' ? styles.activeIcon : ''}
              />
              <span>Archive</span>
            </Link>
          </li>
        </ul>

        <div className={styles.bottomSection}>
          <div className={styles.teamLogoContainer}>
            <Image src={TeamLogo} alt="Team Logo" width={100} height={35} />
          </div>
          
          <div className={styles.menuLabel}>OTHER</div>
          
          <ul className={styles.navLinks}>
          <li>  {/* LOGIN/ACCOUNT BUTTON */}
              <Link href="/account">
              <Image 
                src={AccountIcon} 
                alt="Account" 
                width="16" 
                height="16"
                className={pathname === '/account' ? styles.activeIcon : ''}
              />
              <span>Account</span>
              </Link>
          </li>
          <li>
            <Link 
              href="#"
              onClick={(e) => {
                e.preventDefault(); // Prevents navigation due to Link
                const headers = ["Item,Part Number,Notes,QTY to Buy,Cost,Vendor,Link"];
                const csvContent = headers.join("\n");
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", "Order_Template.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Image src={DownloadIcon} alt="Download" width={16} height={16} />
              <span>Order Template</span>
            </Link>
          </li>

            <li>
              <Link href="mailto:athulraj123@tamu.edu">
                <Image src={SupportIcon} alt="Support" width={16} height={16} />
                    <span>Support Center</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
      
      <main className={styles.main}>
        {children}
        <Toaster />
      </main>
    </div>
  );
}
