import { ContactForm } from "@/components/contact-form";
import { SiteFooter, SiteHeader } from "@/components/site-shell";

export const metadata = {
  title: "Contact support",
  description: "Send the BrokenRepo team a question about a debugging challenge, your account, or a bug you found on the site.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <><SiteHeader/><main id="main-content" tabIndex={-1} className="contact-layout page-width">
    <section className="contact-copy">
      <h1>Tell us what got in your way.</h1>
      <p>Share the problem and where you found it. Your message goes directly to the person building BrokenRepo.</p>
      <dl>
        <div><dt>Best for</dt><dd>Challenge issues, account questions, and product feedback</dd></div>
        <div><dt>Reply to</dt><dd>The email address you enter in the form</dd></div>
      </dl>
    </section>
    <ContactForm/>
  </main><SiteFooter/></>;
}
