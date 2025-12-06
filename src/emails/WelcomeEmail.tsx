import {
    Body,
    Button,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Text,
    Link,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
    name?: string;
    platformUrl?: string;
    date?: string;
}

export const WelcomeEmail = ({
    name = "Creator",
    platformUrl = "https://truefans.com",
    date,
}: WelcomeEmailProps) => {
    const resolvedDate =
        date ??
        new Date().toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
        });

    return (
        <Html>
            <Head />
            <Preview>
                Welcome to True Fans — Start building your community today.
            </Preview>

            <Body style={styles.body}>
                <Container style={styles.container}>
                    {/* HEADER */}
                    <Section style={styles.headerSection}>
                        <Text style={styles.brand}>True Fans</Text>
                    </Section>

                    {/* CONTENT */}
                    <Section style={styles.contentSection}>
                        <Text style={styles.hi}>Hi {name},</Text>

                        <Text style={styles.paragraph}>
                            Welcome to <strong>True Fans</strong>. This is your space to grow
                            an engaged audience, earn directly from your creativity, and build
                            a community that truly supports you.
                        </Text>

                        <Text style={styles.paragraph}>
                            Here are a few things you can do right now to make the most of
                            your account.
                        </Text>

                        {/* FEATURE BLOCK */}
                        <Section style={styles.featuresBlock}>
                            <Text style={styles.featuresTitle}>Quick starts</Text>

                            {/* ICON 1 — USERS */}
                            <div style={styles.featureRow}>
                                <div style={styles.iconColumn}>
                                    <svg
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        stroke="#000"
                                        strokeWidth="1.8"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <circle cx="12" cy="7" r="4" />
                                        <path d="M5.5 21v-1a6.5 6.5 0 0 1 13 0v1" />
                                    </svg>
                                </div>

                                <div style={styles.featureTextColumn}>
                                    <Text style={styles.featureTitle}>Grow your audience</Text>
                                    <Text style={styles.featureDesc}>
                                        Discover other creators and connect with communities built
                                        around shared interests.
                                    </Text>
                                </div>
                            </div>

                            {/* ICON 2 — EARNINGS */}
                            <div style={styles.featureRow}>
                                <div style={styles.iconColumn}>
                                    <svg
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#000"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect x="3" y="4" width="18" height="14" rx="2" />
                                        <path d="M3 10h18" />
                                        <circle cx="8" cy="14" r="2" />
                                    </svg>
                                </div>

                                <div style={styles.featureTextColumn}>
                                    <Text style={styles.featureTitle}>Monetize your work</Text>
                                    <Text style={styles.featureDesc}>
                                        Offer memberships, exclusive content, or perks to your
                                        dedicated supporters.
                                    </Text>
                                </div>
                            </div>

                            {/* ICON 3 — CHAT */}
                            <div style={styles.featureRow}>
                                <div style={styles.iconColumn}>
                                    <svg
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#000"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1l-4.1 1 1.1-3.9A8.4 8.4 0 0 1 3 12a8.5 8.5 0 0 1 17 0z" />
                                    </svg>
                                </div>

                                <div style={styles.featureTextColumn}>
                                    <Text style={styles.featureTitle}>Engage directly</Text>
                                    <Text style={styles.featureDesc}>
                                        Send updates, share content, and build stronger relationships
                                        through conversation.
                                    </Text>
                                </div>
                            </div>

                            {/* ICON 4 — LINK */}
                            <div style={styles.featureRow}>
                                <div style={styles.iconColumn}>
                                    <svg
                                        width="28"
                                        height="28"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#000"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M10 14a3 3 0 0 1 0-4l4-4a3 3 0 0 1 4 4l-1 1" />
                                        <path d="M14 10a3 3 0 0 1 0 4l-4 4a3 3 0 0 1-4-4l1-1" />
                                    </svg>
                                </div>

                                <div style={styles.featureTextColumn}>
                                    <Text style={styles.featureTitle}>Centralize your links</Text>
                                    <Text style={styles.featureDesc}>
                                        Share a single link that leads fans to your content,
                                        offerings, and social profiles.
                                    </Text>
                                </div>
                            </div>
                        </Section>

                        {/* CTA */}
                        <Section style={styles.ctaSection}>
                            <Button href={platformUrl} style={styles.ctaButton}>
                                Set up your page
                            </Button>
                        </Section>

                        {/* HELP TEXT */}
                        <Section style={styles.helpSection}>
                            <Text style={styles.helpText}>
                                If you need help, our support team is always available.
                            </Text>
                        </Section>
                    </Section>

                    {/* FOOTER */}
                    <Section style={styles.footerSection}>
                        <Text style={styles.footerNote}>
                            This is an automated message — please do not reply directly.{" "}
                            <Link style={styles.footerLink} href={`${platformUrl}/help`}>
                                Visit Help Center
                            </Link>
                        </Text>

                        <Text style={styles.copyright}>
                            © {new Date().getFullYear()} True Fans. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default WelcomeEmail;

/* ---------------------- STYLES ---------------------- */
const styles: { [k: string]: React.CSSProperties } = {
    body: {
        margin: 0,
        padding: 0,
        backgroundColor: "#ffffff",
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    container: {
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
    },
    headerSection: {
        padding: "36px 24px",
        borderRadius: "12px",
        textAlign: "center",
        color: "#fff",
        background:
            "linear-gradient(90deg, #117145 0%, #117145 50%, #9485BE 70%, #F394BC 85%, #F6CC90 100%)",
    },
    brand: {
        fontSize: "28px",
        fontWeight: 700,
        margin: 0,
    },
    headerDate: {
        fontSize: "13px",
        marginTop: "8px",
        opacity: 0.9,
    },
    contentSection: {
        paddingTop: "28px",
    },
    hi: {
        fontSize: "18px",
        fontWeight: 600,
        color: "#111",
        marginBottom: "12px",
    },
    paragraph: {
        fontSize: "15px",
        color: "#444",
        lineHeight: "22px",
        marginBottom: "12px",
    },
    featuresBlock: {
        backgroundColor: "#fbfbfc",
        padding: "18px",
        borderRadius: "10px",
        border: "1px solid #eee",
        marginTop: "16px",
    },
    featuresTitle: {
        fontSize: "16px",
        fontWeight: 700,
        marginBottom: "8px",
        textAlign: "center",
    },
    featureRow: {
        display: "flex",
        alignItems: "center", // center icon vertically with text
        gap: "8px",
        padding: "10px 0",
    },
    iconColumn: {
        width: "36px",
        display: "flex",
        justifyContent: "center",
        flexShrink: 0,
    },
    featureTextColumn: {
        flex: 1,
    },
    featureTitle: {
        fontSize: "14px",
        fontWeight: 600,
    },
    featureDesc: {
        fontSize: "13px",
        color: "#555",
        marginTop: "0px",
    },
    ctaSection: {
        textAlign: "center",
        marginTop: "20px",
    },
    ctaButton: {
        backgroundColor: "#000",
        color: "#fff",
        padding: "12px 28px",
        borderRadius: "8px",
        fontWeight: 700,
        fontSize: "15px",
        textDecoration: "none",
        display: "inline-block",
    },
    helpSection: {
        marginTop: "18px",
        textAlign: "center",
    },
    helpText: {
        fontSize: "14px",
        color: "#666",
    },
    footerSection: {
        marginTop: "26px",
        paddingTop: "12px",
        textAlign: "center",
    },
    footerNote: {
        fontSize: "13px",
        color: "#666",
        marginBottom: "10px",
    },
    footerLink: {
        color: "#117145",
        textDecoration: "none",
    },
    copyright: {
        fontSize: "13px",
        color: "#444",
    },
};
