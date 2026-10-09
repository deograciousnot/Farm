// Where users reach a person. Shown in Settings, the legal pages, and suspension messages.
export const SUPPORT_EMAIL = 'ardesamsco@gmail.com';

export const LEGAL_UPDATED = '9 October 2026';

export type LegalDoc = {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export const TERMS: LegalDoc = {
  title: 'Terms of use',
  intro:
    'FarmConnect is run by Ardesams, a Kenyan company. By creating an account or using the app you agree to these terms. FarmConnect is in early testing, so features may change and things may occasionally break.',
  sections: [
    {
      heading: 'Who can use FarmConnect',
      body: 'You must be 18 or older. Use your real name or your farm or business name, keep your details accurate, and keep your password to yourself. One account per person or business.',
    },
    {
      heading: 'Advice from other farmers',
      body: "Posts, answers, and comments come from other users, not from FarmConnect, and are not professional advice. Check advice against your own conditions before acting on it. When using any spray, drug, or fertiliser, always follow the label and ask a qualified agronomist, vet, or extension officer when unsure. FarmConnect is not responsible for losses that come from acting on what users post.",
    },
    {
      heading: 'Buying and selling',
      body: 'FarmConnect helps buyers and sellers find each other. We are not a party to any sale. Price, quality, delivery, and payment are agreed directly between you, and we do not hold or process payments. Confirm who you are dealing with before paying, and never pay someone who refuses to answer basic questions. A "Verified" badge means we confirmed the seller is a real person or business we could contact. It is not a guarantee of quality or delivery.',
    },
    {
      heading: 'Official broadcasts',
      body: 'Broadcasts come from organisations we have checked. Each organisation is responsible for what it publishes. If a broadcast looks wrong, report it and we will review it.',
    },
    {
      heading: 'What you must not post',
      body: 'No spam, scams, fake listings, or fake reviews. No illegal goods or banned agrochemicals. No hate, harassment, threats, or sexual content. No other people\'s personal details without their consent. No pretending to be someone else, and no automated or bulk sign-ups.',
    },
    {
      heading: 'Your content',
      body: 'You own what you post. You give FarmConnect permission to store it and show it to other users in the app for as long as it stays up. You can delete your posts at any time, and deleting your account removes them.',
    },
    {
      heading: 'Moderation',
      body: 'Anyone can report content or accounts. We may remove content or suspend accounts that break these terms, and we will tell you why. Contact us if you think we got it wrong.',
    },
    {
      heading: 'Liability',
      body: 'We work to keep FarmConnect available and accurate, but we provide it as it is and cannot promise it will always work. As far as the law allows, FarmConnect is not liable for losses from using the app, from other users, or from deals made through it.',
    },
    {
      heading: 'Changes and governing law',
      body: 'We may update these terms. If the changes are important we will tell you in the app first. These terms are governed by the laws of Kenya.',
    },
    {
      heading: 'Contact',
      body: `Questions or complaints: ${SUPPORT_EMAIL}`,
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy policy',
  intro:
    'This explains what FarmConnect collects, why, and your rights under the Kenya Data Protection Act, 2019. FarmConnect is run by Ardesams, which is the data controller for your information.',
  sections: [
    {
      heading: 'What we collect',
      body: "Account details: your name, email address and/or phone number, and a password (stored only in scrambled form). Profile details you choose to add: role (farmer, buyer, or hobbyist), county and town, bio, photo, and interests. What you post: posts, questions, answers, comments, listings, photos and videos, orders, ratings, and reports. Technical details: the app version, and basic records of requests to our servers (such as IP address and time) used to keep the service secure. If crash reporting is switched on, we also collect anonymous crash details such as the screen and error.",
    },
    {
      heading: 'Why we use it',
      body: 'To run your account and show you posts, prices, and advice relevant to your area. To let other users see your public profile and what you post. To send you sign-in codes, account emails, and notifications. To prevent spam, fraud, and abuse. To produce anonymous regional statistics (for example, how many farmers in a county are asking about fall armyworm), which we may share with or sell to partners. These statistics never name or identify you, and very small groups are left out so no one can be singled out.',
    },
    {
      heading: 'Our legal basis',
      body: 'We process your data to provide the service you signed up for, with your consent (which you can withdraw by deleting your account), and where needed for our legitimate interest in keeping FarmConnect safe.',
    },
    {
      heading: 'What other users can see',
      body: 'Your name, photo, role, location, bio, posts, answers, comments, and listings are visible to other users. Verified sellers\' phone numbers are shown to buyers on their listings. Your email address and password are never shown to other users.',
    },
    {
      heading: 'Who processes it for us',
      body: 'We use trusted providers to run the service: MongoDB Atlas (database), Render (servers), Cloudinary (photos and videos), Resend (email), Africa\'s Talking (SMS codes), and Sentry (crash reports). Some of them store data on servers outside Kenya, under agreements that require them to protect it. We do not sell your personal data. Organisations that send broadcasts do not receive your personal details.',
    },
    {
      heading: 'How long we keep it',
      body: 'We keep your data while your account is open. When you delete your account in Settings, we delete your profile and everything you posted. For orders, the other party keeps a record of the order with your personal details removed. Backups are overwritten within 30 days.',
    },
    {
      heading: 'Your rights',
      body: `You can ask to see the data we hold about you, correct it, delete it, or object to how we use it, and you can ask for a copy. Most of this you can do yourself in the app (Edit profile, Delete account). For anything else, email ${SUPPORT_EMAIL} and we will reply within 7 days. You can also complain to the Office of the Data Protection Commissioner (odpc.go.ke).`,
    },
    {
      heading: 'Security',
      body: 'Passwords are stored scrambled, connections to our servers are encrypted, and access to the admin tools is limited and logged. No system is perfectly secure, so please use a password you don\'t use anywhere else.',
    },
    {
      heading: 'Children',
      body: 'FarmConnect is for people aged 18 and over. If you believe a child has created an account, contact us and we will remove it.',
    },
    {
      heading: 'Changes and contact',
      body: `If we change how we use your data, we will update this page and tell you in the app. Questions: ${SUPPORT_EMAIL}`,
    },
  ],
};
