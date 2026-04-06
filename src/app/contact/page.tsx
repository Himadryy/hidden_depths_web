'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import Container from '@/components/ui/Container';
import emailjs from '@emailjs/browser';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<FormStatus>({ type: 'idle', message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Sending your message...' });

    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        throw new Error('Email service not configured');
      }

      await emailjs.send(serviceId, templateId, {
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone || 'Not provided',
        subject: formData.subject,
        message: formData.message,
      }, publicKey);

      setStatus({ type: 'success', message: 'Message sent successfully! We\'ll get back to you within 24 hours.' });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error('Contact form error:', error);
      setStatus({ type: 'error', message: 'Failed to send message. Please email us directly at hiddendepthsss@gmail.com' });
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] pt-24 pb-16">
      <Container>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-[var(--foreground)] mb-4">
            Get in Touch
          </h1>
          <p className="text-[var(--foreground)]/70 max-w-2xl mx-auto">
            Have questions about our services? Want to book a consultation? We&apos;re here to help. 
            Reach out and we&apos;ll respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-[var(--accent)]/10">
                  <Mail className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--foreground)] mb-1">Email Us</h3>
                  <a href="mailto:hiddendepthsss@gmail.com" className="text-[var(--accent)] hover:underline text-sm">
                    hiddendepthsss@gmail.com
                  </a>
                  <p className="text-[var(--foreground)]/60 text-xs mt-1">
                    We respond within 24 hours
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-[var(--accent)]/10">
                  <Phone className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--foreground)] mb-1">Call Us</h3>
                  <a href="tel:+919330705743" className="text-[var(--accent)] hover:underline text-sm">
                    +91 9330705743
                  </a>
                  <p className="text-[var(--foreground)]/60 text-xs mt-1">
                    Emergency support only
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-[var(--accent)]/10">
                  <MapPin className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-medium text-[var(--foreground)] mb-1">Location</h3>
                  <p className="text-[var(--foreground)]/70 text-sm">
                    Kolkata, West Bengal, India
                  </p>
                  <p className="text-[var(--foreground)]/60 text-xs mt-1">
                    Online sessions available worldwide
                  </p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-[var(--accent)]/5 rounded-2xl p-6 border border-[var(--accent)]/20">
              <h3 className="font-medium text-[var(--foreground)] mb-3">Session Hours</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[var(--foreground)]/70">
                  <span>Monday - Friday</span>
                  <span>9:00 AM - 8:00 PM</span>
                </div>
                <div className="flex justify-between text-[var(--foreground)]/70">
                  <span>Saturday</span>
                  <span>10:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between text-[var(--foreground)]/70">
                  <span>Sunday</span>
                  <span>By Appointment</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--card)] rounded-2xl p-6 md:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Send us a Message</h2>
              
              {status.type !== 'idle' && (
                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                  status.type === 'success' ? 'bg-green-500/10 text-green-600' :
                  status.type === 'error' ? 'bg-red-500/10 text-red-600' :
                  'bg-[var(--accent)]/10 text-[var(--accent)]'
                }`}>
                  {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
                   status.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : null}
                  <span className="text-sm">{status.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                    >
                      <option value="">Select a topic</option>
                      <option value="booking">Book a Session</option>
                      <option value="inquiry">General Inquiry</option>
                      <option value="services">Services Information</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={status.type === 'loading'}
                  className="w-full md:w-auto px-8 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status.type === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
