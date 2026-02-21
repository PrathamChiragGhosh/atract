import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, ShoppingBag, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import atractLogo from "@/assets/atract-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={atractLogo} alt="Atract" className="h-8 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Shop
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-hero opacity-5" />
          
          <div className="container py-20 md:py-32">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-atract-blue-light px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Recruitment Platform</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Build Your{" "}
                <span className="text-gradient">Dream Career</span>{" "}
                with Atract
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                From AI-powered job matching to professional essentials — everything you need to succeed in your career journey, all in one place.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/">
                  <Button size="lg" className="gap-2 text-lg px-8">
                    <ShoppingBag className="h-5 w-5" />
                    Explore Shop
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-secondary/50">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Everything for Your Career
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Atract brings together recruitment, professional development, and career essentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-card p-8 rounded-2xl border border-border shadow-card hover:shadow-product transition-shadow">
                <div className="w-14 h-14 bg-atract-blue-light rounded-xl flex items-center justify-center mb-6">
                  <Briefcase className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Professional Fashion
                </h3>
                <p className="text-muted-foreground mb-4">
                  Interview-ready suits, office wear, and accessories curated for career success.
                </p>
                <Link to="/category/fashion-men" className="text-primary font-medium inline-flex items-center gap-1 hover:underline">
                  Shop Fashion <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Feature 2 */}
              <div className="bg-card p-8 rounded-2xl border border-border shadow-card hover:shadow-product transition-shadow">
                <div className="w-14 h-14 bg-atract-blue-light rounded-xl flex items-center justify-center mb-6">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Career eBooks
                </h3>
                <p className="text-muted-foreground mb-4">
                  Expert guides on interviews, resume optimization, and thriving in the AI era.
                </p>
                <Link to="/category/ebooks" className="text-primary font-medium inline-flex items-center gap-1 hover:underline">
                  Browse eBooks <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Feature 3 */}
              <div className="bg-card p-8 rounded-2xl border border-border shadow-card hover:shadow-product transition-shadow">
                <div className="w-14 h-14 bg-atract-blue-light rounded-xl flex items-center justify-center mb-6">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  Tech Essentials
                </h3>
                <p className="text-muted-foreground mb-4">
                  Laptops, phones, and gadgets for the modern professional workspace.
                </p>
                <Link to="/category/electronics" className="text-primary font-medium inline-flex items-center gap-1 hover:underline">
                  View Electronics <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container">
            <div className="bg-gradient-hero rounded-3xl p-12 md:p-16 text-center text-primary-foreground">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Elevate Your Career?
              </h2>
              <p className="text-primary-foreground/90 mb-8 max-w-xl mx-auto">
                Browse our curated collection of professional essentials and career resources.
              </p>
              <Link to="/">
                <Button size="lg" variant="secondary" className="gap-2 text-lg px-8">
                  Start Shopping
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-secondary border-t border-border py-8">
        <div className="container text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src={atractLogo} alt="Atract" className="h-6 w-auto" />
          </Link>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Atract. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
