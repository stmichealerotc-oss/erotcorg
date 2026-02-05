// SEO Helper Functions
class SEOHelper {
    constructor() {
        this.init();
    }

    init() {
        // Add structured data for better search engine understanding
        this.addStructuredData();
        
        // Update meta tags dynamically based on current section
        this.updateMetaTags();
        
        // Add breadcrumb navigation
        this.addBreadcrumbs();
    }

    addStructuredData() {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "Church",
            "name": "Saint Michael Eritrean Orthodox Church",
            "alternateName": "EROTC",
            "description": "Eritrean Orthodox Tewahdo Church serving the community in Western Australia",
            "url": "https://www.erotc.org",
            "telephone": "+61-XXX-XXX-XXX",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Perth",
                "addressRegion": "WA",
                "addressCountry": "AU"
            },
            "sameAs": [
                "https://www.facebook.com/erotc",
                "https://www.instagram.com/erotc"
            ],
            "hasOfferingCatalog": {
                "@type": "OfferingCatalog",
                "name": "Church Services",
                "itemListElement": [
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Service",
                            "name": "Sunday Service",
                            "description": "Weekly Sunday worship service"
                        }
                    },
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Service",
                            "name": "Kids Sunday School",
                            "description": "Educational program for children"
                        }
                    }
                ]
            }
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }

    updateMetaTags() {
        // Listen for navigation changes to update meta tags
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                const page = e.target.getAttribute('data-page');
                this.setMetaForPage(page);
            }
        });
    }

    setMetaForPage(page) {
        const metaData = {
            home: {
                title: "Saint Michael Eritrean Orthodox Church - EROTC",
                description: "Welcome to Saint Michael Eritrean Orthodox Church. Join our community for worship, kids programs, and spiritual growth."
            },
            about: {
                title: "About Us - Saint Michael Eritrean Orthodox Church",
                description: "Learn about our church history, mission, and community serving Eritrean Orthodox believers in Western Australia."
            },
            services: {
                title: "Church Services - Saint Michael Eritrean Orthodox Church",
                description: "Join us for Sunday services, special ceremonies, and spiritual gatherings at Saint Michael Church."
            },
            'kids-program': {
                title: "Kids Sunday School - Saint Michael Eritrean Orthodox Church",
                description: "Educational and fun programs for children to learn about Orthodox faith and traditions."
            },
            contact: {
                title: "Contact Us - Saint Michael Eritrean Orthodox Church",
                description: "Get in touch with Saint Michael Eritrean Orthodox Church. Find our location, service times, and contact information."
            }
        };

        if (metaData[page]) {
            document.title = metaData[page].title;
            
            const descMeta = document.querySelector('meta[name="description"]');
            if (descMeta) {
                descMeta.setAttribute('content', metaData[page].description);
            }
        }
    }

    addBreadcrumbs() {
        // Add breadcrumb structured data
        const breadcrumbData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://www.erotc.org"
                }
            ]
        };

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(breadcrumbData);
        document.head.appendChild(script);
    }
}

// Initialize SEO helper when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SEOHelper();
});