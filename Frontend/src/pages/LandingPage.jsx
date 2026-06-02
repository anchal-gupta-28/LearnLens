import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, Target, LineChart, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';
import heroImg from '../assets/hero.png';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-950 bg-gradient-premium">
      
      
      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="bg-primary-500/10 text-primary-400 px-4 py-1.5 rounded-full text-sm font-medium border border-primary-500/20 mb-6 inline-block">
              Intelligent Learning for Modern Education
            </span>
            <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter font-outfit">
              Bridge the Gap In <span className="text-gradient">Every Student's</span> Journey
            </h1>
            <p className="text-slate-400 text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed">
              LearnLens AI identifies knowledge gaps in real-time, provides personalized feedback, 
              and tracks progress with industry-leading analytics.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-lg py-4 px-10 flex items-center gap-2">
                Join Now <ArrowRight size={20} />
              </Link>
              <button className="glass py-4 px-10 rounded-xl text-white font-semibold hover:bg-white/10 transition-all border-white/20">
                View Live Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain size={32} />}
              title="AI Gap Analysis"
              desc="Our proprietary AI analyzes quiz results to pinpoint exact conceptual weaknesses."
            />
            <FeatureCard 
              icon={<Target size={32} />}
              title="Predictive Risk Level"
              desc="Identify students who need immediate intervention before they fall behind."
            />
            <FeatureCard 
              icon={<MessageSquare size={32} />}
              title="24/7 AI Tutor"
              desc="A personal tutor for every student, trained to explain complex concepts step-by-step."
            />
          </div>
        </div>
      </section>

      {/* Analytics Sneak Peek */}
      <section className="py-24 px-6 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Actionable Insights for <span className="text-primary-400">Educators</span>
            </h2>
            <ul className="space-y-6">
              {[
                "Topic-wise performance heatmaps",
                "Automated risk detection badges",
                "One-click reports for parents/admin",
                "Personalized intervention suggestions"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="text-emerald-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="glass p-4 rounded-3xl border-white/10 shadow-2xl relative group"
          >
            <div className="absolute inset-0 bg-primary-600/20 blur-[100px] -z-10 group-hover:bg-primary-600/30 transition-all" />
            <img
              src={heroImg}
              alt="Dashboard Preview"
              className="rounded-2xl w-full"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600"><rect width="100%" height="100%" fill="%23111a2b"/><text x="50%" y="50%" fill="%23ccc" font-size="24" text-anchor="middle" dominant-baseline="middle">Dashboard Preview</text></svg>'; }}
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass-card border-white/5 !p-8"
  >
    <div className="bg-primary-500/10 p-5 rounded-2xl w-fit mb-6 text-primary-400">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </motion.div>
);

export default LandingPage;
