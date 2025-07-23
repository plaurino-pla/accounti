import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const LandingPage: React.FC = () => {
  const { signIn } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "AI-Powered Invoice Detection",
      description: "Automatically detects invoices from your emails using advanced AI technology"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      title: "Multi-Language Support",
      description: "Processes invoices in multiple languages including English, Spanish, Portuguese, and Italian"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Smart Analytics",
      description: "Get insights into your spending patterns with detailed analytics and reports"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: "Secure & Private",
      description: "Your data is encrypted and secure. We never share your information"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Automatic Sync",
      description: "Automatically scans your emails every 6 hours for new invoices"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M15 7l3-3m0 0l-3-3m3 3H9" />
        </svg>
      ),
      title: "Manual Upload",
      description: "Upload invoices manually or let us scan your emails automatically"
    }
  ];

  const benefits = [
    "Save hours of manual data entry",
    "Never miss an invoice again",
    "Get organized financial records",
    "Export to Google Sheets automatically",
    "Access from anywhere, anytime",
    "Free to start, no credit card required"
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for individuals and small businesses",
      features: [
        "Up to 50 invoices per month",
        "Basic AI processing",
        "Email scanning",
        "Google Drive storage",
        "Google Sheets export",
        "Manual upload",
        "Basic analytics"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      description: "For growing businesses and professionals",
      features: [
        "Unlimited invoices",
        "Advanced AI processing",
        "Priority email scanning",
        "Enhanced analytics",
        "Duplicate detection",
        "Multi-language support",
        "Priority support",
        "Custom categories"
      ],
      cta: "Start Pro Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "per month",
      description: "For large organizations with custom needs",
      features: [
        "Everything in Pro",
        "Custom integrations",
        "Dedicated support",
        "Advanced reporting",
        "Team collaboration",
        "API access",
        "Custom branding",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const faqs = [
    {
      question: "How does the AI invoice detection work?",
      answer: "Our AI analyzes email attachments using advanced machine learning to identify invoices. It looks for keywords like 'invoice', 'factura', 'fattura', and other language equivalents, along with typical invoice patterns and structures."
    },
    {
      question: "What languages does Accounti support?",
      answer: "Accounti supports multiple languages including English, Spanish, Portuguese, Italian, and more. Our AI can detect and extract data from invoices in various languages automatically."
    },
    {
      question: "How secure is my data?",
      answer: "Your data is encrypted both in transit and at rest. We use industry-standard security practices and never share your information with third parties. All processing is done securely through Google's infrastructure."
    },
    {
      question: "Can I upload invoices manually?",
      answer: "Yes! You can upload PDF invoices directly through our dashboard. The system will process them the same way as email attachments, extracting data and organizing them automatically."
    },
    {
      question: "How often does the system scan for new invoices?",
      answer: "The system automatically scans your emails every 6 hours for new invoices. You can also manually trigger a scan anytime using the 'Fetch New Invoices' button."
    },
    {
      question: "What happens if the AI misidentifies a document?",
      answer: "Our AI is trained to be very accurate, but if it processes a non-invoice document, it will simply skip it and not extract any data. The system only processes documents it's confident are invoices."
    },
    {
      question: "Can I export my data?",
      answer: "Yes! All your invoice data is automatically exported to a Google Sheet that you can access anytime. You can also download individual invoices from Google Drive."
    },
    {
      question: "Is there a limit on file size?",
      answer: "Yes, the maximum file size for invoice uploads is 10MB. This covers most standard invoice PDFs while ensuring fast processing times."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Logo size="sm" showTagline={false} color="dark" />
          </div>
          <button
            onClick={signIn}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              AI-Powered
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Invoice Management
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Automatically scan your emails, detect invoices, and extract data with advanced AI. 
              Organize your finances effortlessly with our intelligent invoice processing system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={signIn}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Start Free Trial
              </button>
              <div className="flex items-center space-x-2 text-gray-600">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-10 blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                manage invoices
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform handles everything from detection to organization, 
              giving you back valuable time to focus on what matters most.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl border border-white/20"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, transparent
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                pricing
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your needs. Start free and upgrade as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 ${
                  plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={signIn}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-6 py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                Why choose
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Accounti?
                </span>
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Ready to get started?</h3>
                <p className="text-blue-100 mb-6">
                  Join thousands of users who have already automated their invoice management.
                </p>
                <button
                  onClick={signIn}
                  className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-200"
                >
                  Start Free Trial
                </button>
              </div>
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-yellow-900 font-bold text-sm">✨</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Questions
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about Accounti. Can't find the answer you're looking for? 
              Please contact our support team.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">{faq.question}</h3>
                  <svg
                    className={`w-6 h-6 text-gray-500 transform transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-8 pb-6">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start managing your invoices
            <span className="block">the smart way</span>
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join the future of invoice management. No setup fees, no hidden costs.
          </p>
          <button
            onClick={signIn}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 shadow-xl"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold">Accounti</span>
          </div>
          <p className="text-sm">
            © 2024 Accounti. All rights reserved. AI-powered invoice management made simple.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 