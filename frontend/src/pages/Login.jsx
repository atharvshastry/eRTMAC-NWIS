import React, { useEffect, useState } from 'react';
import { Database, Eye, EyeOff, LockKeyhole, UserRound, ArrowRight, Activity } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import drillingRigImage from '../assets/drilling-rig.svg';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const welcomeMessage = 'Welcome back. The journey continues.';

  useEffect(() => {
    if (welcomeText.length >= welcomeMessage.length) return undefined;
    const timer = window.setTimeout(() => {
      setWelcomeText(welcomeMessage.slice(0, welcomeText.length + 1));
    }, 55);
    return () => window.clearTimeout(timer);
  }, [welcomeText]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (!login(username.trim(), password)) {
      setError('Invalid username or password. Please check your credentials and try again.');
      return;
    }
    navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
  };

  return (
    <main className="login-page min-h-screen bg-[#080808] text-zinc-100 md:grid md:grid-cols-2">
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-[350px]">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] text-white">
              <Database className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">NWIS <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">OIL</span></div>
              <p className="text-xs text-zinc-500">Nearby Wells Intelligence System</p>
            </div>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Sign in to your account</h1>
            <p className="mt-2 text-sm text-zinc-500">Enter your Oil India Limited credentials below to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-5">
            <div className="grid gap-2">
              <label htmlFor="username" className="text-sm font-medium leading-none text-zinc-300">Username</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required className="login-input w-full rounded-lg border border-white/[0.1] bg-[#101012] px-3 py-3 pl-10 text-sm text-white shadow-sm outline-none placeholder:text-zinc-600 focus:border-blue-500" placeholder="Oil001" />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium leading-none text-zinc-300">Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="login-input w-full rounded-lg border border-white/[0.1] bg-[#101012] px-3 py-3 pl-10 pr-10 text-sm text-white shadow-sm outline-none placeholder:text-zinc-600 focus:border-blue-500" placeholder="Password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex h-full w-10 items-center justify-center text-zinc-500 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-xs text-rose-400">{error}</p>}

            <button type="submit" className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">Sign In <ArrowRight className="h-4 w-4" /></button>
          </form>

          <p className="mt-7 text-center text-[11px] text-zinc-600">Demo access for the NWIS SIH prototype</p>
        </div>
      </section>

      <section className="login-visual relative hidden min-h-screen overflow-hidden border-l border-white/[0.08] bg-[#0d1118] md:block">
        <div className="login-right-accent absolute right-8 top-8 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-white"><Activity className="h-3.5 w-3.5" /> Operations Intelligence</div>
        <div className="flex h-full flex-col items-center justify-center px-10 text-center">
          <img src={drillingRigImage} alt="Oil drilling rig" className="mb-10 w-52 opacity-90" />
          <p className="login-right-white mb-3 text-[10px] font-mono uppercase tracking-[0.24em] text-white">Oil India Limited</p>
          <h2 className="login-right-white max-w-md text-3xl font-semibold leading-tight text-white">Nearby Wells Intelligence System</h2>
          <p className="login-right-white mt-6 max-w-md text-lg font-medium text-white">“{welcomeText}<span className="animate-pulse text-white">|</span>”</p>
          <p className="login-right-white mt-3 text-sm text-white">Engineering context for safer, faster drilling decisions.</p>
        </div>
      </section>
    </main>
  );
}
