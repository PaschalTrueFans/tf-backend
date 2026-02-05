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

interface PasswordChangedProps {
    email?: string;
    date?: string;
    ipAddress?: string;
    supportUrl?: string;
}

export const PasswordChanged = ({
    email = "user@example.com",
    date = new Date().toLocaleString(),
    ipAddress = "192.168.1.1",
    supportUrl = "https://truefans.com/support",
}: PasswordChangedProps) => {
    return (
        <Html>
            <Head />
            <Preview>Security Notification: Password Changed</Preview>
            <Body style={styles.body}>
                <Container style={styles.container}>
                    {/* HEADER */}
                    <Section style={styles.headerSection}>
                        <Text style={styles.brand}>Ruutz</Text>
                    </Section>

                    {/* CONTENT */}
                    <Section style={styles.contentSection}>
                        <Text style={styles.hi}>Security Notification</Text>

                        <Text style={styles.paragraph}>
                            Your Password Has Been Changed
                        </Text>
                        <Text style={styles.paragraph}>
                            This is a confirmation that the password for your Ruutz account
                            has been successfully changed.
                        </Text>

                        {/* INFO BLOCK */}
                        <Section style={styles.featuresBlock}>
                            <div style={styles.featureRow}>
                                <Text style={styles.featureTitle}>Account Email:</Text>
                                <Text style={{ ...styles.featureDesc, marginLeft: 'auto' }}>{email}</Text>
                            </div>
                            <div style={styles.featureRow}>
                                <Text style={styles.featureTitle}>Changed On:</Text>
                                <Text style={{ ...styles.featureDesc, marginLeft: 'auto' }}>{date}</Text>
                            </div>
                            <div style={styles.featureRow}>
                                <Text style={styles.featureTitle}>IP Address:</Text>
                                <Text style={{ ...styles.featureDesc, marginLeft: 'auto' }}>{ipAddress}</Text>
                            </div>
                        </Section>

                        <Section style={{ ...styles.featuresBlock, backgroundColor: '#fff5f5', borderColor: '#fc8181' }}>
                            <Text style={{ ...styles.featuresTitle, color: '#c53030', textAlign: 'left' }}>
                                ⚠️ Didn't make this change?
                            </Text>
                            <Text style={{ ...styles.paragraph, color: '#742a2a', marginBottom: 0 }}>
                                If you did not change your password, please contact our support
                                team immediately to secure your account.
                            </Text>
                        </Section>

                        <Text style={styles.paragraph}>
                            If you initiated this change, no further action is required. You
                            can now use your new password to log in to your account.
                        </Text>

                        {/* CTA */}
                        <Section style={styles.ctaSection}>
                            <Button href={supportUrl} style={styles.ctaButton}>
                                Contact Support
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
                            <Link style={styles.footerLink} href="https://truefans.com/help">
                                Visit Help Center
                            </Link>
                        </Text>

                        <Text style={styles.copyright}>
                            © {new Date().getFullYear()} Ruutz. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default PasswordChanged;

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
