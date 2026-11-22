import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Mail,
  ShieldCheck,
  FileCheck2,
  Lock,
  Globe,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/brand/Logo';

interface RolePreset {
  role: string;
  label: string;
  name: string;
  email: string;
  password: string;
  accentClass: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    role: 'OWNER',
    label: 'Owner',
    name: 'P. K. Banerjee',
    email: 'owner@howrahsteel.in',
    password: 'OwnerSecretPassword2026!',
    accentClass: 'text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]',
  },
  {
    role: 'QA_INSPECTOR',
    label: 'QA Inspector',
    name: 'R. K. Chatterjee',
    email: 'inspector@howrahsteel.in',
    password: 'InspectorPassword2026!',
    accentClass: 'text-[#047857] bg-[#ECFDF5] border-emerald-200',
  },
  {
    role: 'DISPATCH',
    label: 'Dispatch',
    name: 'A. K. Sen',
    email: 'dispatch@howrahsteel.in',
    password: 'DispatchPassword2026!',
    accentClass: 'text-[#1D4ED8] bg-[#EFF6FF] border-blue-200',
  },
  {
    role: 'VIEWER',
    label: 'Customs Auditor',
    name: 'Customs Auditor',
    email: 'auditor@howrahsteel.in',
    password: 'AuditorPassword2026!',
    accentClass: 'text-[#52525B] bg-[#F4F4F5] border-[#E4E4E7]',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/app/shipments';

  const { loginWithPin, login, loginDemo } = useAuth();
  const [authTab, setAuthTab] = useState<'pin' | 'credentials'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMsg('PIN must be at least 4 digits.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ok = await loginWithPin(pin);
      if (ok) {
        navigate(returnUrl);
      } else {
        setErrorMsg('Invalid inspector code. Enter your 6-digit authenticator code.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Work email and password are required.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const ok = await login(email, password);
      if (ok) {
        navigate(returnUrl);
      } else {
        setErrorMsg('Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRolePreset = (pEmail: string, pPass: string) => {
    setAuthTab('credentials');
    setEmail(pEmail);
    setPassword(pPass);
    setErrorMsg(null);
  };

  const handleDemoAccess = async () => {
    setIsLoading(true);
    try {
      await loginDemo();
      navigate(returnUrl);
    } catch {
      navigate('/app/shipments');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#09090B] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Column: Minimalist Enterprise Form */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-14 bg-[#FFFFFF]">
        {/* Top Brand Row */}
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="HeatLedger AI Home">
            <Logo isLight={false} size="sm" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] hover:text-[#09090B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Center Auth Form */}
        <div className="w-full max-w-sm mx-auto py-10 space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#09090B]">
              Sign in to HeatLedger
            </h1>
            <p className="text-sm text-[#52525B]">
              Authenticate to access plant QA dossiers, heat ledgers, and Clause 6 signing.
            </p>
          </div>

          {/* Segmented Method Switcher with Spring Pill */}
          <div className="grid grid-cols-2 p-1 bg-[#F4F4F5] rounded-lg border border-[#E4E4E7]">
            <button
              type="button"
              onClick={() => {
                setAuthTab('pin');
                setErrorMsg(null);
              }}
              className={`relative py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                authTab === 'pin' ? 'text-[#09090B]' : 'text-[#52525B] hover:text-[#09090B]'
              }`}
            >
              {authTab === 'pin' && (
                <motion.span
                  layoutId="login-method-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-md bg-[#FFFFFF] shadow-xs border border-[#E4E4E7]"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Floor PIN (QA)</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('credentials');
                setErrorMsg(null);
              }}
              className={`relative py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                authTab === 'credentials' ? 'text-[#09090B]' : 'text-[#52525B] hover:text-[#09090B]'
              }`}
            >
              {authTab === 'credentials' && (
                <motion.span
                  layoutId="login-method-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-md bg-[#FFFFFF] shadow-xs border border-[#E4E4E7]"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Email &amp; Password</span>
              </span>
            </button>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                role="alert"
                className="px-3.5 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] font-medium"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {authTab === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="inspector-pin-input"
                  className="block text-xs font-medium text-[#09090B]"
                >
                  Factory Floor Inspector PIN
                </label>
                <input
                  id="inspector-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  autoFocus
                  className="w-full h-11 px-4 bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg text-center font-mono text-lg tracking-[0.4em] text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
                <div className="flex items-center justify-between text-xs text-[#52525B] pt-0.5">
                  <span>10-minute step-up signing session</span>
                  <span className="font-mono text-xs text-[#A1A1AA]">RFC 6238 TOTP</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full h-10 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Verifying PIN...</span>
                ) : (
                  <>
                    <span>Authenticate Inspector</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="work-email-input"
                  className="block text-xs font-medium text-[#09090B]"
                >
                  Work Email
                </label>
                <input
                  id="work-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="inspector@howrahsteel.in"
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="account-password-input"
                  className="block text-xs font-medium text-[#09090B]"
                >
                  Password
                </label>
                <input
                  id="account-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full h-10 px-3.5 bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg text-sm text-[#09090B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Subtle Divider for Role / Sandbox Quick Access */}
          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center pt-2" aria-hidden="true">
              <div className="w-full border-t border-[#E4E4E7]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#FFFFFF] px-3 text-xs text-[#52525B]">
                Quick role access &amp; sandbox
              </span>
            </div>
          </div>

          {/* Compact Role Presets Grid */}
          <div className="grid grid-cols-2 gap-2">
            {ROLE_PRESETS.map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() => handleSelectRolePreset(preset.email, preset.password)}
                className="p-2.5 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#E4E4E7] text-left transition-colors cursor-pointer group"
              >
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-medium border mb-1 ${preset.accentClass}`}
                >
                  {preset.label || preset.role}
                </span>
                <span className="block text-xs font-medium text-[#09090B] truncate">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={isLoading}
            className="w-full h-10 px-4 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-[#059669]" />
            <span>Launch Sandbox Plant Workspace</span>
          </button>
        </div>

        {/* Bottom Security Footnote */}
        <div className="flex items-center justify-between text-xs text-[#52525B] border-t border-[#E4E4E7] pt-4">
          <span>OWASP ASVS 4.0 · Rate-limited</span>
          <Link to="/verify" className="text-[#047857] hover:underline font-medium">
            Public Verifier →
          </Link>
        </div>
      </div>

      {/* Right Column: Deep-Carbon Architectural Proof Panel */}
      <div
        className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#0A0C10] text-[#F4F4F5] flex-col justify-between p-12 xl:p-16 border-l border-[#E4E4E7] relative overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#111318] border border-white/[0.08] text-xs font-mono text-[#A1A1AA]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            <span>EN 10204:2004 · EU REG 2026/1963</span>
          </span>
          <span className="text-xs font-mono text-[#A1A1AA]">IN-WB-HOWRAH-01</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg space-y-8 my-auto"
        >
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] leading-[1.15] text-[#F4F4F5]">
              Cryptographic proof for every melt, heat, and customs dossier.
            </h2>
            <p className="text-sm leading-relaxed text-[#A1A1AA]">
              Built for Indian metallurgical QA teams exporting under the EU Carbon Border
              Adjustment Mechanism definitive regime. Preserve upstream mill certificates byte-for-byte
              and seal every dispatch with verifiable Ed25519 signatures.
            </p>
          </div>

          {/* Architectural Specification List */}
          <div className="rounded-xl bg-[#111318] border border-white/[0.08] divide-y divide-white/[0.08]">
            <div className="p-4 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.08] flex items-center justify-center text-[#34D399] shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-[#F4F4F5]">
                  EN 10204 Clause 6 Preservation
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Byte-identical original preservation of upstream mill Type 3.1 certificates
                  bundled as Annex A alongside signed exporter covers.
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.08] flex items-center justify-center text-[#34D399] shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-[#F4F4F5]">
                  Ed25519 + Tamper-Evident SHA-256
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Every signed cover sheet and Annex A hash is cryptographically sealed with
                  10-minute step-up QA Inspector PIN authorization.
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.08] flex items-center justify-center text-[#34D399] shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-[#F4F4F5]">
                  EU &amp; UK CBAM Customs Readiness
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  Automated CN-code scoping, Melt-and-Pour crude steel attribution, and structured
                  XML communication templates for European importers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Technical Telemetry Strip */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.08] text-xs">
          <div>
            <div className="text-[#A1A1AA]">Signature Standard</div>
            <div className="font-mono text-[#F4F4F5] mt-0.5">Ed25519 / SHA-256</div>
          </div>
          <div>
            <div className="text-[#A1A1AA]">Traceability</div>
            <div className="font-mono text-[#F4F4F5] mt-0.5">Heat-to-Container</div>
          </div>
          <div>
            <div className="text-[#A1A1AA]">Customs Export</div>
            <div className="font-mono text-[#F4F4F5] mt-0.5">EU CBAM XML + ZIP</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
