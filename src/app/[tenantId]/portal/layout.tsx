import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.className}>
        {children}
        <Toaster />
    </div>
  );
}
