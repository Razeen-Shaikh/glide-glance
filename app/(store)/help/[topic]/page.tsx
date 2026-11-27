import { notFound } from "next/navigation";

const pages: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping",
    body: [
      "Standard delivery is ₹49 and becomes free when the merchandise total after discounts is ₹999 or more.",
      "Express delivery is ₹99 and is handed to the courier ahead of standard orders.",
      "Orders are packed from our studio and shipped across India. Tracking appears on the order once it is marked shipped.",
    ],
  },
  returns: {
    title: "Returns",
    body: [
      "Delivered orders can be returned within 7 days from the delivery date.",
      "Request the return from your order page. The store reviews it before a refund is issued.",
      "Prepaid refunds go back through Razorpay. Cash on delivery refunds are arranged manually after the return is received.",
    ],
  },
  contact: {
    title: "Contact",
    body: [
      "Write to care@glideglance.test for order questions.",
      "Glide Glance, 12 Residency Road, Bengaluru 560025.",
    ],
  },
  privacy: {
    title: "Privacy",
    body: [
      "We store the account, address, and order details needed to fulfil a purchase.",
      "Passwords are hashed. Payment card data is handled by Razorpay and is not stored on this server.",
      "You can ask for account deactivation from the store team.",
    ],
  },
  terms: {
    title: "Terms",
    body: [
      "Prices are shown in INR and include GST.",
      "An online order is confirmed only after the server verifies the Razorpay signature and the payment with Razorpay.",
      "Stock is reserved for 30 minutes while a prepaid payment is pending.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(pages).map((topic) => ({ topic }));
}

export default async function HelpPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const page = pages[topic];
  if (!page) notFound();
  return (
    <article className="mx-auto grid max-w-2xl gap-4">
      <h1 className="text-4xl font-medium">{page.title}</h1>
      {page.body.map((paragraph) => (
        <p key={paragraph} className="leading-7 text-muted-foreground">{paragraph}</p>
      ))}
    </article>
  );
}
