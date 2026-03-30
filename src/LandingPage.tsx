import { motion } from 'motion/react';
import {
  Mic,
  Sparkles,
  Flame,
  PhoneCall,
  MessageCircle,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Globe,
  Zap,
  BookOpen,
  Trophy,
  Play,
  AudioWaveform,
  ShieldCheck,
  ChartColumnBig,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: PhoneCall,
    title: 'Live AI speaking room',
    desc: 'Real-time voice practice with an AI tutor that keeps the conversation natural and confidence-building.',
  },
  {
    icon: MessageCircle,
    title: 'Bilingual chat tutor',
    desc: 'Ask questions comfortably, translate thoughts when needed, and keep learning without pressure.',
  },
  {
    icon: Users,
    title: 'Community voice practice',
    desc: 'Find other learners online and practice live with real people when you want extra fluency.',
  },
  {
    icon: Trophy,
    title: 'Progress that feels motivating',
    desc: 'XP, streaks, levels, and goals keep the experience closer to a modern learning website than a plain app.',
  },
  {
    icon: BookOpen,
    title: 'Session history and transcripts',
    desc: 'Review earlier conversations, notice your mistakes, and see how your speaking is improving over time.',
  },
  {
    icon: Globe,
    title: 'Useful real-life topics',
    desc: 'Practice interviews, travel, doctor visits, shopping, and everyday English that you will actually use.',
  },
];

const proof = [
  { value: '15+', label: 'guided topics', icon: BookOpen },
  { value: '5', label: 'voice styles', icon: AudioWaveform },
  { value: '24/7', label: 'practice access', icon: ShieldCheck },
  { value: '100%', label: 'confidence focused', icon: ChartColumnBig },
];

const testimonials = [
  {
    name: 'Priya S.',
    city: 'Pune',
    text: 'Interview practice reduced my hesitation a lot. I no longer panic when I speak English.',
  },
  {
    name: 'Rahul M.',
    city: 'Mumbai',
    text: 'The live AI voice room feels smooth and polished. Practice no longer feels boring.',
  },
  {
    name: 'Sneha K.',
    city: 'Nagpur',
    text: 'Having chat and speaking in one place makes it much easier to practice every day.',
  },
];

const steps = [
  {
    id: '01',
    title: 'Sign in quickly',
    desc: 'Sign in with Google and your progress will keep saving automatically.',
    icon: Zap,
  },
  {
    id: '02',
    title: 'Pick your mode',
    desc: 'Choose live speaking, AI chat, or a community call and start with the mode you need most.',
    icon: Play,
  },
  {
    id: '03',
    title: 'Practice and track',
    desc: 'Feedback, XP, streaks, transcripts, and daily goals all stay organized in one clean dashboard.',
    icon: Sparkles,
  },
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-[#fffaf4]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg shadow-brand-primary/20">
              <Mic size={20} />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight">BolDost</p>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">English Practice Studio</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-brand-primary">Features</a>
            <a href="#workflow" className="transition-colors hover:text-brand-primary">Workflow</a>
            <a href="#stories" className="transition-colors hover:text-brand-primary">Stories</a>
          </div>

          <button onClick={onGetStarted} className="btn-primary flex items-center gap-2 px-4 py-3 text-sm font-bold sm:px-5">
            Start Free <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <section className="relative px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-8%] top-16 h-72 w-72 rounded-full bg-brand-secondary/20 blur-3xl" />
          <div className="absolute right-[-4%] top-20 h-80 w-80 rounded-full bg-brand-accent/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="space-y-8"
          >
            <div className="section-label">
              <Sparkles size={14} />
              AI English tutor for Indian learners
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-[2.8rem] font-black leading-[0.94] tracking-tight sm:text-6xl xl:text-7xl">
                A premium
                <span className="gradient-text block py-2">clean learning space</span>
                built for speaking confidence
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:text-xl">
                BolDost is more than a simple app-style tool. It is a complete English practice website where live speaking,
                smart chat, community practice, progress tracking, and transcripts all come together in a clearer, more polished experience.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button onClick={onGetStarted} className="btn-primary flex items-center justify-center gap-3 px-8 py-4 text-base font-bold">
                <PhoneCall size={20} />
                Start Practicing
              </button>
              <a href="#features" className="btn-secondary flex items-center justify-center gap-3 px-8 py-4 text-base font-bold">
                Explore features <ArrowRight size={18} />
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
              <div className="flex -space-x-3">
                {['A', 'R', 'S', 'N'].map((letter, index) => (
                  <div
                    key={letter}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-sm font-black text-white shadow-md"
                    style={{ backgroundColor: ['#135d66', '#68b984', '#f4b860', '#d97757'][index] }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Star key={item} size={14} className="fill-brand-secondary text-brand-secondary" />
                  ))}
                </div>
                <p className="font-semibold">Designed for daily practice, not one-time demo use.</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="app-shell relative overflow-hidden p-3 sm:p-5">
              <div className="absolute inset-x-10 top-0 h-28 rounded-full bg-brand-primary/10 blur-3xl" />
              <div className="grid gap-4">
                <div className="soft-panel flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Today&apos;s Dashboard</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">Practice without fear</h3>
                  </div>
                  <div className="rounded-2xl bg-brand-primary px-4 py-3 text-white shadow-lg">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/70">Level</p>
                    <p className="font-display text-2xl font-extrabold">07</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="card overflow-hidden p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-brand-primary">Live speaking room</p>
                        <h4 className="mt-2 text-xl font-black">Order coffee practice</h4>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary text-white">
                        <Mic size={22} />
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] bg-gradient-to-br from-brand-primary to-[#1e7a6f] p-5 text-white">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                          <AudioWaveform size={20} />
                        </div>
                        <div>
                          <p className="font-bold">BolDost Voice Coach</p>
                          <p className="text-xs uppercase tracking-[0.22em] text-white/70">Speaking now</p>
                        </div>
                      </div>
                      <p className="rounded-[22px] border border-white/10 bg-white/10 p-4 text-sm leading-7 text-white/90">
                        Welcome back. Let&apos;s practice ordering coffee politely. Start with: "Hi, could I have..."
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="ml-auto max-w-[82%] rounded-[22px] rounded-tr-md bg-brand-primary px-4 py-3 text-sm font-medium text-white">
                        Hi, could I have one large cappuccino please?
                      </div>
                      <div className="max-w-[86%] rounded-[22px] rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                        Great sentence. Add "for here" or "to go" to sound even more natural.
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="card p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-secondary/20 text-[#a56410]">
                          <Flame size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Daily streak</p>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Keep momentum</p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="font-display text-4xl font-extrabold">12</p>
                        <p className="text-sm text-slate-500">days active</p>
                      </div>
                    </div>

                    <div className="card p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-accent/20 text-brand-accent">
                          <ChartColumnBig size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Practice growth</p>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">This week</p>
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        {[40, 64, 52, 80, 68, 95, 88].map((height, index) => (
                          <div key={index} className="flex-1 rounded-full bg-brand-primary/10 p-1">
                            <div className="rounded-full bg-gradient-to-t from-brand-primary to-brand-accent" style={{ height }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.8 }}
              className="card absolute -left-3 top-10 hidden items-center gap-3 px-4 py-3 lg:flex"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-secondary/20 text-[#a56410]">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-sm font-black">+60 XP</p>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Session reward</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 9, 0] }}
              transition={{ repeat: Infinity, duration: 3.2 }}
              className="card absolute -bottom-5 right-0 hidden items-center gap-3 px-4 py-3 lg:flex"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-accent/20 text-brand-accent">
                <Users size={18} />
              </div>
              <div>
                <p className="text-sm font-black">Community calls</p>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Practice together</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-[32px] bg-brand-dark px-6 py-8 text-white sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {proof.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              viewport={{ once: true }}
              className="rounded-[24px] border border-white/10 bg-white/5 p-5"
            >
              <item.icon size={18} className="mb-4 text-brand-secondary" />
              <p className="font-display text-4xl font-extrabold">{item.value}</p>
              <p className="mt-1 text-sm text-white/70">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 max-w-3xl space-y-4">
            <div className="section-label">
              <Sparkles size={14} />
              Features
            </div>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
              Every major feature now has
              <span className="gradient-text block py-2">website-level presentation</span>
              and a clearer learning flow
            </h2>
            <p className="text-lg leading-8 text-slate-600">
              Cleaner hierarchy, richer cards, clearer actions, better spacing, and a desktop-friendly layout make the full experience feel more polished.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                viewport={{ once: true }}
                className="card group p-7 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary transition-transform group-hover:scale-110">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl rounded-[36px] border border-white/60 bg-white/60 p-8 shadow-[0_28px_80px_rgba(18,52,59,0.08)] backdrop-blur-xl lg:p-12">
          <div className="mb-14 max-w-2xl space-y-4">
            <div className="section-label">
              <Play size={14} />
              Workflow
            </div>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Start speaking in 3 simple steps</h2>
            <p className="text-lg leading-8 text-slate-600">
              Onboarding stays simple, while the practice experience feels richer and more guided.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="soft-panel relative p-7"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20">
                    <step.icon size={24} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-[0.28em] text-brand-primary">{step.id}</span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="stories" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="section-label">
                <Star size={14} />
                Stories
              </div>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Learners feel the difference</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Better design is not only about appearance. When the interface feels calm and clear, practice becomes naturally easier.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className="card p-7"
              >
                <div className="mb-5 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} className="fill-brand-secondary text-brand-secondary" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-slate-700">&quot;{item.text}&quot;</p>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-sm font-black text-white">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[40px] bg-gradient-to-br from-brand-dark via-brand-primary to-[#1f7a75] px-8 py-14 text-white shadow-[0_32px_90px_rgba(18,52,59,0.22)] lg:px-16 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10">
              <Mic size={30} />
            </div>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Ready for the new BolDost experience?</h2>
            <p className="mt-5 text-lg leading-8 text-white/72">
              Live speaking, AI chat, community practice, transcripts, and your progress dashboard all come together in one stronger website experience.
            </p>
            <button onClick={onGetStarted} className="mt-8 rounded-2xl bg-white px-8 py-4 text-base font-black text-brand-primary shadow-xl transition-transform hover:scale-[1.02]">
              Open Dashboard
            </button>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-sm text-white/72">
              {['No complex setup', 'Google sign in', 'Practice anytime'].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-brand-secondary" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
