import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

export const metadata = {
  title: "Atract",
  description: "Job Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ height: "100%", overscrollBehavior: "none", overflowX: "visible" }}>
      <body style={{ margin: 0, padding: 0, overflowX: "visible" }}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
