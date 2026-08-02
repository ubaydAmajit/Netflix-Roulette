"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
export default function Header() {
    const [stuck, setStuck] = useState(false);
    const pathname = usePathname();
    useEffect(() => {
        const onScroll = () => setStuck(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return (<header className={`header${stuck ? " is-stuck" : ""}`}>
      
      <Link href="/" className="brand" aria-label="NextFlix — back to the roulette">
        
        <img src="/nextflix_logo.png" alt=""/>
        <span>NEXTFLIX</span>
      </Link>

      <nav>
        <Link href="/" className={`navlink${pathname === "/" ? " is-active" : ""}`}>
          Spin
        </Link>
        <Link href="/browse" className={`navlink${pathname?.startsWith("/browse") ? " is-active" : ""}`}>
          Browse
        </Link>
      </nav>
    </header>);
}
