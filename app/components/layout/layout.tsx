"use client";

import Link from 'next/link';
import styles from './layout.module.css';
import LogoIcon from "../../../assets/logo.svg";
import Image from 'next/image';
import TeamLogo from "../../../assets/fsae.svg";
import BacklogIcon from "../../../assets/backlog.svg";
import ArchiveIcon from "../../../assets/archive.svg";
import DashboardIcon from "../../../assets/dashboard.svg";
import SupportIcon from "../../../assets/support.svg";
import FinanceIcon from "../../../assets/finance.svg";
import DownloadIcon from "../../../assets/download.svg";
import AccountIcon from "../../../assets/account.svg";
import InventoryIcon from "../../../assets/checklists.svg";
import { Toaster } from '../toast/toaster';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import SignOutModal from '../signout-component/signout-modal';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const { data: session } = useSession();
  const email = session?.user.email;
  const admins = process.env.NEXT_PUBLIC_ADMINS?.split(",") || [];
  const isAdmin = email ? admins.includes(email) : false;
  const [windowWidth, setWindowWidth] = useState(0);

  // Load sidebar state from local storage on component mount
  useEffect(() => {
    // Set initial window width
    setWindowWidth(window.innerWidth);
    
    // Handle window resize
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
  
    window.addEventListener('resize', handleResize);
  
    // Load stored state or set default based on screen size
    const storedState = localStorage.getItem('sidebar-collapsed');
    if (storedState) {
      setIsCollapsed(JSON.parse(storedState));
    } else {
      // Default to collapsed if screen width is less than 768px (typical mobile breakpoint)
      setIsCollapsed(window.innerWidth < 768);
    }
    setIsLoadingSidebar(false);
  
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 768) {
      setIsCollapsed(true);
    }
  }, [windowWidth]);

  useEffect(() => {
    if (!session) {
      router.push('/account');
    }
  }, [session, router]);

  // Render nothing or a loading indicator while checking auth status or loading sidebar state
  if (isLoadingSidebar) {
    return null;
  }

  // If user is not authenticated, do not render anything (router.push will handle redirection)
  if (!session) {
    return null;
  }

  // Sidebar toggle function
  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsedState));
  };

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
          {
            isAdmin &&
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
          }
          <li className={pathname === '/finance' ? styles.active : ''}>
            <Link href="/finance">
              <Image 
                src={FinanceIcon} 
                alt="Finance" 
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
          <li className={pathname === '/inventory' ? styles.active : ''}>
            <Link href="/inventory">
              <Image 
                src={InventoryIcon} 
                alt="Inventory" 
                width={16} 
                height={16}
                className={pathname === '/inventory' ? styles.activeIcon : ''}
              />
              <span>Inventory</span>
            </Link>
          </li>
        </ul>

        <div className={styles.bottomSection}>
          <div className={styles.teamLogoContainer}>
            <Image src={TeamLogo} alt="Team Logo" width={100} height={35} />
          </div>
          
          <div className={styles.menuLabel}>OTHER</div>
          
          <ul className={styles.navLinks}>
          <li>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowSignOutModal(true);
                }}
              >
                <Image 
                  src={AccountIcon} 
                  alt="Account" 
                  width={16} 
                  height={16}
                  className={pathname === '/account' ? styles.activeIcon : ''}
                />
                <span>Account</span>
              </a>
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
        {showSignOutModal && (
          <SignOutModal onClose={() => setShowSignOutModal(false)} />
        )}
        <Toaster />
      </main>
    </div>
  );
}