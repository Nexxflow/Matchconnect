import React from "react";
import { User, Mail, Phone } from "lucide-react";

export default function TermsContent({ theme = "dark" }) {
  const headingClass = `text-sm font-bold ${theme === "light" ? "text-black" : "text-white"}`;
  return (
    <div className={`space-y-6 text-xs leading-relaxed ${theme === "light" ? "text-black" : "text-neutral-300"}`}>
      {/* Intro Notice */}
      <div
        className="p-3.5 rounded-xl"
        style={{
          backgroundColor: theme === "light" ? "#f0fdf4" : "#181b18",
          border: `1px solid ${theme === "light" ? "#bbf7d0" : "#283028"}`,
          color: theme === "light" ? "#166534" : "#cbd5e1"
        }}
      >
        <p>
          Please read these Terms &amp; Conditions carefully before completing your account registration.
          By accepting these terms, you agree to be bound by all the conditions listed below.
        </p>
      </div>

      {/* Section 1 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            1
          </span>
          <h3 className={headingClass}>About MatchConnect</h3>
        </div>
        <p className="pl-7">
          MatchConnect (&quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;) is a cricket team management and ground-booking platform
          currently operated by <strong>Vignesh</strong>, based in Tamil Nadu, India. MatchConnect helps users find teams,
          book grounds, organize tournaments, book umpires, and manage live scoring for local cricket matches.
        </p>
        <p className="pl-7">
          By creating an account or using MatchConnect, you agree to these Terms &amp; Conditions. If you do not
          agree, please do not use the platform.
        </p>
      </section>

      {/* Section 2 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            2
          </span>
          <h3 className={headingClass}>Eligibility</h3>
        </div>
        <p className="pl-7">
          You must be at least 18 years old, or have permission from a parent/guardian, to create an account.
          By registering, you confirm that the information you provide (name, email, phone number, team details)
          is accurate and belongs to you.
        </p>
      </section>

      {/* Section 3 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            3
          </span>
          <h3 className={headingClass}>Accounts</h3>
        </div>
        <ul className="pl-7 space-y-1.5 list-disc list-outside ml-4 marker:text-green-500">
          <li>You are responsible for keeping your login credentials confidential.</li>
          <li>You are responsible for all activity that happens under your account.</li>
          <li>
            One account per person. Creating multiple accounts to bypass restrictions (e.g. tournament
            entry limits) is not allowed.
          </li>
          <li>
            We may suspend or terminate accounts that violate these terms, post false information, or
            misuse the platform (fake ground listings, harassment of other users, payment fraud).
          </li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            4
          </span>
          <h3 className={headingClass}>Ground Bookings</h3>
        </div>
        <ul className="pl-7 space-y-1.5 list-disc list-outside ml-4 marker:text-green-500">
          <li>
            Ground listings are provided by ground owners/managers. MatchConnect facilitates the booking
            but does not own or manage any ground listed on the platform.
          </li>
          <li>
            Booking a ground through MatchConnect confirms your slot subject to availability and payment confirmation.
          </li>
          <li>
            MatchConnect is not responsible for the physical condition of a ground, disputes with ground staff,
            or cancellations made directly by the ground owner outside the app. Report such issues to us so we can remove or flag the listing.
          </li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            5
          </span>
          <h3 className={headingClass}>Payments</h3>
        </div>
        <p className="pl-7">
          Payments on MatchConnect (ground bookings, umpire bookings, tournament entry fees) are processed
          through <strong>Razorpay</strong>, a licensed third-party payment gateway. We do not store your card,
          UPI, or bank details on our servers &mdash; Razorpay handles and secures all payment data under its own
          terms and PCI-DSS compliance standards.
        </p>
        <p className="pl-7">
          MatchConnect is not liable for payment failures, delays, or errors caused by Razorpay, your bank, or
          your network provider. If a payment is deducted but the booking does not confirm, contact us with your
          transaction ID and we will help resolve it.
        </p>
      </section>

      {/* Section 6 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            6
          </span>
          <h3 className={headingClass}>Cancellations &amp; Refunds</h3>
        </div>
        <ul className="pl-7 space-y-1.5 list-disc list-outside ml-4 marker:text-green-500">
          <li>
            <strong>Weather or ground unavailability:</strong> Full refund if a booking is cancelled due to
            conditions outside your control (rain, ground closure by the owner, etc.).
          </li>
          <li>
            <strong>User-initiated cancellation, 24+ hours before the slot:</strong> Partial refund (a cancellation
            fee may apply).
          </li>
          <li>
            <strong>User-initiated cancellation, less than 24 hours before the slot:</strong> No refund.
          </li>
          <li>
            <strong>Tournament entry fees:</strong> Refundable only if the tournament is cancelled by the organizer
            before it starts.
          </li>
          <li>
            Approved refunds are processed back to the original payment method within 5&ndash;7 business days.
          </li>
        </ul>
      </section>

      {/* Section 7 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            7
          </span>
          <h3 className={headingClass}>Tournaments &amp; Challenges</h3>
        </div>
        <p className="pl-7">
          Tournament organizers and teams that post match challenges are responsible for the accuracy of the details
          they post (dates, venue, fees, prizes). MatchConnect is a listing and coordination platform &mdash; it does not
          guarantee that a posted tournament or challenge will take place exactly as described, and is not a party
          to the arrangement between competing teams.
        </p>
      </section>

      {/* Section 8 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            8
          </span>
          <h3 className={headingClass}>Umpire &amp; Scorer Bookings</h3>
        </div>
        <p className="pl-7">
          Umpires and scorers listed on MatchConnect are independent individuals, not employees or agents of
          MatchConnect. We facilitate the booking and payment; the quality of officiating, punctuality, and conduct
          during a match is a matter between the booking team and the umpire/scorer. Disputes can be reported to us
          and repeat offenders may be removed from the platform.
        </p>
      </section>

      {/* Section 9 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            9
          </span>
          <h3 className={headingClass}>User Conduct</h3>
        </div>
        <p className="pl-7">You agree not to:</p>
        <ul className="pl-7 space-y-1.5 list-disc list-outside ml-4 marker:text-green-500">
          <li>Post false or misleading information (fake teams, fake grounds, fake umpire listings, fake reviews).</li>
          <li>Harass, threaten, abuse, or discriminate against other users.</li>
          <li>Use the platform for any unlawful purpose.</li>
          <li>Attempt to hack, scrape, or interfere with the platform’s security or normal operation.</li>
          <li>Share another user’s personal contact details (phone number, address) publicly without consent.</li>
        </ul>
      </section>

      {/* Section 10 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            10
          </span>
          <h3 className={headingClass}>Privacy</h3>
        </div>
        <p className="pl-7">
          We collect the information you provide at signup (name, email, phone, team details) to run the core
          features of the app &mdash; teammate grouping, bookings, notifications, and match coordination. We do not
          sell your personal data to third parties. Payment information is handled entirely by Razorpay, not stored by us.
        </p>
      </section>

      {/* Section 11 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            11
          </span>
          <h3 className={headingClass}>Limitation of Liability</h3>
        </div>
        <p className="pl-7">
          MatchConnect is provided &ldquo;as is.&rdquo; We do our best to keep bookings, payments, and listings accurate and reliable,
          but to the fullest extent permitted by law, we are not liable for:
        </p>
        <ul className="pl-7 space-y-1.5 list-disc list-outside ml-4 marker:text-green-500">
          <li>Injuries or accidents occurring during matches, practice, or travel to/from a ground.</li>
          <li>Disputes between users, teams, ground owners, or umpires.</li>
          <li>Loss or damage arising from ground conditions or third-party negligence.</li>
          <li>
            Service interruptions caused by third parties (payment gateway downtime, SMS/email delivery failures, internet outages).
          </li>
        </ul>
      </section>

      {/* Section 12 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            12
          </span>
          <h3 className={headingClass}>Changes to These Terms</h3>
        </div>
        <p className="pl-7">
          We may update these Terms &amp; Conditions from time to time as the platform grows. Continued use of
          MatchConnect after changes are posted means you accept the updated terms. Material changes will be
          highlighted in the app when you next log in.
        </p>
      </section>

      {/* Section 13 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            13
          </span>
          <h3 className={headingClass}>Governing Law</h3>
        </div>
        <p className="pl-7">
          These terms are governed by the laws of India. Any disputes will be subject to the jurisdiction of the
          courts in Tamil Nadu.
        </p>
      </section>

      {/* Section 14 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center text-[10px] font-bold shrink-0">
            14
          </span>
          <h3 className={headingClass}>Contact Us</h3>
        </div>
        <p className="pl-7">Questions, complaints, or refund requests &mdash; reach out anytime:</p>
        <div
          className="ml-7 p-3.5 rounded-xl space-y-2"
          style={{
            backgroundColor: theme === "light" ? "#f8fafc" : "#191c19",
            border: `1px solid ${theme === "light" ? "#e2e8f0" : "#293329"}`
          }}
        >
          <div className={`flex items-center gap-2 font-semibold ${theme === "light" ? "text-black" : "text-white"}`}>
            <User className={`w-3.5 h-3.5 ${theme === "light" ? "text-emerald-600" : "text-green-400"}`} />
            <span>Name: Vignesh</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className={`w-3.5 h-3.5 ${theme === "light" ? "text-emerald-600" : "text-green-400"}`} />
            <span>Email: </span>
            <a
              href="mailto:djvicky21dj@gmail.com"
              className={`${theme === "light" ? "text-emerald-600 hover:text-emerald-700 font-semibold" : "text-green-400 hover:text-green-300"} underline font-mono`}
            >
              djvicky21dj@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className={`w-3.5 h-3.5 ${theme === "light" ? "text-emerald-600" : "text-green-400"}`} />
            <span>Phone: </span>
            <a
              href="tel:+918680862510"
              className={`${theme === "light" ? "text-emerald-600 hover:text-emerald-700 font-semibold" : "text-green-400 hover:text-green-300"} underline font-mono`}
            >
              +91 86808 62510
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
