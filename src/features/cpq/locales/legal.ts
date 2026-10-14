export type LegalListItem = {
  label: string;
  text: string;
};

export type LegalContact = {
  label: string;
  value: string;
  href?: string;
};

export type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: LegalListItem[];
  contacts?: LegalContact[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

const supportEmail = "support@uprealdigital.com";
const supportMailto = `mailto:${supportEmail}`;
const officeAddress = "188 Saint-Denis Saint-Jean-Sur-Richelieu, Quebec, Canada, J3B 1S5";

export const legalChrome = {
  returnToConfigurator: "Return to Configurator",
  effectiveDate: "Effective Date:",
  lastUpdated: "Last Updated:",
  supportEmail,
} as const;

export const termsDocument: LegalDocument = {
  title: "Terms and Conditions",
  effectiveDate: "October 14, 2026",
  lastUpdated: "October 14, 2026",
  intro:
    'Welcome to 17332521 CANADA INC. ("we," "us," or "our"). By accessing our website, using our custom building configurator, or requesting a quote, you agree to be bound by these Terms and Conditions.',
  sections: [
    {
      title: "1. Services Provided",
      paragraphs: [
        "17332521 CANADA INC. provides software and services enabling customers to design, quote, and communicate regarding custom buildings and outdoor structures.",
      ],
    },
    {
      title: "2. SMS Messaging Terms",
      paragraphs: [
        "By providing your phone number and opting in via our web forms, you expressly consent to receive 1-to-1 conversational text messages regarding your custom building quote, design edits, and order updates.",
      ],
      items: [
        {
          label: "Message Frequency:",
          text: "Message frequency varies based on your interactions and inquiries with our sales team.",
        },
        {
          label: "Cost:",
          text: "Message and data rates may apply depending on your mobile carrier plan.",
        },
        {
          label: "Opt-Out:",
          text: "You can cancel the SMS service at any time by texting STOP. After you send STOP, we will send a confirmation message to confirm you have been unsubscribed.",
        },
        {
          label: "Help:",
          text: `If you experience issues with the messaging program, reply HELP for more assistance or contact ${supportEmail}.`,
        },
        {
          label: "Carriers:",
          text: "Wireless carriers are not liable for delayed or undelivered messages.",
        },
      ],
    },
    {
      title: "3. Intellectual Property",
      paragraphs: [
        "All content, 3D configurator tools, visual assets, and trademarks displayed on uprealdigital.com are the property of 17332521 CANADA INC. and are protected by applicable copyright and intellectual property laws.",
      ],
    },
    {
      title: "4. Limitation of Liability",
      paragraphs: [
        "To the fullest extent permitted by law, 17332521 CANADA INC. shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our platform or communication services.",
      ],
    },
    {
      title: "5. Contact Information",
      paragraphs: ["For questions regarding these Terms and Conditions, please contact:"],
      contacts: [
        { label: "Email:", value: supportEmail, href: supportMailto },
        { label: "Address:", value: officeAddress },
      ],
    },
  ],
};

export const privacyDocument: LegalDocument = {
  title: "Privacy Policy",
  effectiveDate: "October 14, 2026",
  lastUpdated: "October 14, 2026",
  intro:
    'At 17332521 CANADA INC. ("we," "us," or "our"), respecting your privacy and protecting your personal information is a top priority. This Privacy Policy outlines how we collect, use, and safeguard your personal data when you use our website, custom building configurator, and customer messaging services.',
  sections: [
    {
      title: "1. Information We Collect",
      paragraphs: [
        "We collect information you provide directly to us when requesting a quote, configuring a building, or communicating with us. This includes:",
      ],
      items: [
        {
          label: "Contact Information:",
          text: "Name, email address, phone number, and delivery address.",
        },
        {
          label: "Building Specifications:",
          text: "Custom building designs, preferences, and quote details.",
        },
        {
          label: "Communication Logs:",
          text: "Messages sent to or received from our sales representatives via SMS, email, or web chat.",
        },
      ],
    },
    {
      title: "2. How We Use Your Information",
      paragraphs: ["We use your personal information strictly to deliver requested services, including:"],
      items: [
        { label: "", text: "Generating and delivering custom building quotes and design previews." },
        { label: "", text: "Facilitating 1-to-1 conversational messaging regarding your inquiries." },
        { label: "", text: "Sending order status, delivery, and appointment updates." },
      ],
    },
    {
      title: "3. SMS Opt-In and Mobile Information Disclosure",
      paragraphs: [
        "No mobile information will be shared with third parties/affiliates for marketing or promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with or sold to any third parties.",
      ],
    },
    {
      title: "4. How to Opt-Out of SMS Communications",
      paragraphs: [
        `If you no longer wish to receive text messages from us, you may opt out at any time by replying STOP to any text message you receive. For additional assistance, reply HELP or contact us at ${supportEmail}.`,
      ],
    },
    {
      title: "5. Data Security",
      paragraphs: [
        "We implement industry-standard administrative, technical, and physical safeguards to protect your personal data against unauthorized access, loss, or misuse.",
      ],
    },
    {
      title: "6. Contact Us",
      paragraphs: ["If you have questions about this Privacy Policy, please contact us at:"],
      contacts: [
        { label: "Email:", value: supportEmail, href: supportMailto },
        { label: "Address:", value: officeAddress },
      ],
    },
  ],
};
