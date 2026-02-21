"use client";

import NavBar from "@/components/navBar/NavBar";
import Footer from "@/components/footer/Footer";
import FloatingProgressIndicator from "@/components/floatingProgressIndicator/FloatingProgressIndicator";

import { usePathname } from "next/navigation";
import { Provider } from "react-redux";
import { store } from "@/store/store";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "@/lib/queryClient";

import { BackgroundGenerationProvider } from "@/contexts/BackgroundGenerationContext";
import JobSeekerRealtime from "@/components/JobSeekerRealtime";
import { Toaster } from "react-hot-toast";

const queryClient = getQueryClient();

export default function ClientProviders({ children }) {
    const pathname = usePathname();

    // EXACT URLs where footer should appear
    const FOOTER_VISIBLE_ROUTES = [
        "/",
        "/signin/jobseeker",
        "/signin/employer",
    ];

    const showFooter = FOOTER_VISIBLE_ROUTES.includes(pathname);

    return (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <BackgroundGenerationProvider>

                    <NavBar />

                    <main style={{ flex: 1, backgroundColor: "#ffffff" }}>
                        <JobSeekerRealtime />
                        <Toaster position="top-right" />
                        {children}
                    </main>

                    {showFooter && <Footer />}

                    <FloatingProgressIndicator />

                    {process.env.NODE_ENV === "development" && (
                        <ReactQueryDevtools
                            initialIsOpen={false}
                            buttonPosition="bottom-left"
                        />
                    )}

                </BackgroundGenerationProvider>
            </QueryClientProvider>
        </Provider>
    );
}
