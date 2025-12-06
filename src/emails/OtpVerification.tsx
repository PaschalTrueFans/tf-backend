import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Text,
    Link,
} from "@react-email/components";
import * as React from "react";

interface OtpVerificationProps {
    otp?: string;
    date?: string;
}

export const OtpVerification = ({
    otp = "123456",
    date,
}: OtpVerificationProps) => {
    return (
        <Html>
            <Head />
            <Preview>Your verification code for True Fans</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    {/* HEADER */}
                    <Section style={styles.headerSection}>
                        <Text style={styles.brand}>True Fans</Text>
                    </Section>

                    {/* CONTENT */}
                    <Section style={styles.contentSection}>
                        <Text style={styles.hi}>Secure Authentication</Text>

                        <Text style={styles.paragraph}>
                            Hello,
                        </Text>
                        <Text style={styles.paragraph}>
                            You've requested to reset your password. Please use the One-Time
                            Password (OTP) below to complete your verification process.
                        </Text>

                        {/* OTP BLOCK */}
                        <Section style={styles.featuresBlock}>
                            <Text style={styles.featuresTitle}>Your Verification Code</Text>
                            <Text style={{ ...styles.featureTitle, fontSize: '32px', textAlign: 'center', letterSpacing: '8px', fontFamily: 'monospace', margin: '20px 0' }}>
                                {otp}
                            </Text>
                            <Text style={{ ...styles.featureDesc, textAlign: 'center' }}>
                                This code is valid for 10 minutes.
                            </Text>
                        </Section>

                        <Text style={styles.paragraph}>
                            If you didn't request this password reset, please ignore this email or
                            contact our support team immediately.
                        </Text>
                        <Text style={styles.paragraph}>
                            <strong>Important:</strong> Never share your OTP with anyone. Our
                            team will never ask for your verification code via email, phone,
                            or any other method.
                        </Text>

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
                            <Link style={styles.footerLink} href="https://truefans.com/help">
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

export default OtpVerification;

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
