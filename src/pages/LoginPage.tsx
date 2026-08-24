
/**
 * LoginPage.tsx v2.1
 *
 * 4 vues dans un seul composant :
 *   "login"    — Connexion (email + mdp, ou ADMINSYS)
 *   "register" — Inscription (pseudo, âge, sexe, email, mdp)
 *   "forgot"   — Mot de passe oublié (envoi email)
 *   "reset"    — Réinitialisation (depuis le lien email, via ?token=xxx)
 *
 * v2.1 : per-field validation errors in RegisterView
 */

import { useCallback, useEffect, useId, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ThemeToggle } from "../shared/ui/ThemeToggle";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../shared/ui/ThemeContext";
import { validateUsername } from "../infrastructure/api/utils";

type View = "login" | "register" | "forgot" | "reset";

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

const IconMale = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="10" cy="14" r="6" />
    <path d="M20 4l-6 6" />
    <path d="M14 4h6v6" />
  </svg>
);

const IconFemale = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="8" r="6" />
    <path d="M12 14v8" />
    <path d="M9 19h6" />
  </svg>
);

const IconEye = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

// ─── Composant champ de saisie ────────────────────────────────────────────────

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  showToggle?: boolean;
  error?: string;
}

function Field({
  label, type = "text", value, onChange, placeholder,
  autoComplete, required, hint, showToggle, error,
}: FieldProps) {
  const [show, setShow] = useState(false);
  const uid = useId();
  const inputType = showToggle ? (show ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={uid}
        className="block text-xs font-semibold uppercase tracking-widest text-tertiary"
      >
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      <div className="relative">
        <input
          id={uid}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`w-full rounded-xl border bg-input px-4 py-3 pr-10 text-sm
                     text-primary placeholder-tertiary outline-none transition-all duration-200
                     focus:ring-2 ${
                       error
                         ? "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/20"
                         : "border-secondary focus:border-accent-primary/50 focus:ring-accent-primary/20"
                     }`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary
                       transition hover:text-secondary focus:outline-none"
            tabIndex={-1}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            <IconEye open={show} />
          </button>
        )}
      </div>
      {error
        ? <p className="text-[11px] text-rose-400 leading-relaxed">{error}</p>
        : hint && <p className="text-[11px] text-tertiary leading-relaxed">{hint}</p>
      }
    </div>
  );
}

// ─── Barre de force du mot de passe ───────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const colors = ["bg-rose-500", "bg-orange-400", "bg-amber-400", "bg-emerald-400"];
  const labels = ["Très faible", "Faible", "Moyen", "Fort"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {colors.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              idx < score ? colors[score - 1] : "bg-input"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-tertiary">
        Force : <span className={score < 2 ? "text-rose-400" : score < 3 ? "text-amber-400" : "text-emerald-400"}>
          {labels[score - 1] ?? "Très faible"}
        </span>
        {" · "}Min. 8 car., 1 majuscule, 1 chiffre
      </p>
    </div>
  );
}

// ─── Sélecteur de genre ───────────────────────────────────────────────────────

type Gender = "male" | "female" | "other";

function GenderSelector({
  value,
  onChange,
  error,
}: {
  value: Gender | "";
  onChange: (v: Gender) => void;
  error?: string;
}) {
  const uid = useId();
  const options: { value: Gender; label: string; icon: React.ReactNode }[] = [
    { value: "male",   label: "Homme",  icon: <IconMale /> },
    { value: "female", label: "Femme",  icon: <IconFemale /> },
    { value: "other",  label: "Autre",  icon: <span className="text-sm">⚧</span> },
  ];

  return (
    <div className="space-y-1.5">
      <span
        id={`${uid}-gender`}
        className="block text-xs font-semibold uppercase tracking-widest text-tertiary"
      >
        Genre <span className="text-rose-400">*</span>
      </span>
      <div
        role="group"
        aria-labelledby={`${uid}-gender`}
        className={`grid grid-cols-3 gap-2 rounded-xl transition-all ${
          error ? "ring-1 ring-rose-500/40" : ""
        }`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs
                        font-semibold transition-all duration-200 ${
              value === opt.value
                ? "border-accent-primary/50 bg-accent-primary/15 text-accent-secondary ring-1 ring-accent-primary/30"
                : "border-primary bg-input text-tertiary hover:bg-card hover:text-secondary"
            }`}
          >
            <span className={value === opt.value ? "text-accent-secondary" : "text-tertiary"}>
              {opt.icon}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-[11px] text-rose-400 leading-relaxed">{error}</p>}
    </div>
  );
}

// ─── Bouton de soumission ─────────────────────────────────────────────────────

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-xl bg-accent-primary px-4 py-3 font-bold text-white
                 shadow-lg shadow-accent-primary/20 transition-all duration-200
                 hover:bg-accent-secondary hover:shadow-accent-primary/30
                 disabled:cursor-not-allowed disabled:opacity-50
                 active:scale-[0.99]"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {loadingLabel ?? "Chargement…"}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// ─── Vue : Connexion ──────────────────────────────────────────────────────────

function LoginView({
  onSwitch,
  onForgot,
}: {
  onSwitch: () => void;
  onForgot: () => void;
}) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (!identifier.trim() || !password) return;
      setLoading(true);
      const err = await login(identifier.trim(), password);
      if (err) setError(err);
      setLoading(false);
    },
    [identifier, password, login]
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Le backend n'accepte que l'email pour les joueurs ; seul le compte
          administrateur se connecte par son identifiant (ALPHATEN). */}
      <Field
        label="Email"
        type="text"
        value={identifier}
        onChange={setIdentifier}
        placeholder="votre@email.com"
        autoComplete="username"
        required
      />
      <div className="space-y-2">
        <Field
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          showToggle
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgot}
            className="text-xs text-tertiary transition hover:text-accent-secondary underline underline-offset-2"
          >
            Mot de passe oublié ?
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <SubmitButton loading={loading} label="Se connecter" loadingLabel="Connexion…" />

      <p className="text-center text-sm text-tertiary">
        Pas encore de compte ?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-accent-secondary transition hover:text-accent-primary underline underline-offset-2"
        >
          S'inscrire
        </button>
      </p>
    </form>
  );
}

// ─── Sélecteur de mode de jeu ─────────────────────────────────────────────────

type PlayMode = "solo" | "multiplayer";

function PlayModeSelector({
  value,
  onChange,
  error,
}: {
  value: PlayMode | "";
  onChange: (v: PlayMode) => void;
  error?: string;
}) {
  const uid = useId();
  const options: { value: PlayMode; emoji: string; label: string; desc: string }[] = [
    {
      value: "solo",
      emoji: "🧑‍💻",
      label: "Solo",
      desc: "Tu joues seul. Tes flags te sont attribués personnellement.",
    },
    {
      value: "multiplayer",
      emoji: "👥",
      label: "Équipe",
      desc: "Tu rejoins ou crées une équipe. Les flags sont partagés entre membres.",
    },
  ];

  return (
    <div className="space-y-1.5">
      <span
        id={`${uid}-playmode`}
        className="block text-xs font-semibold uppercase tracking-widest text-tertiary"
      >
        Mode de jeu <span className="text-rose-400">*</span>
      </span>
      <div
        role="group"
        aria-labelledby={`${uid}-playmode`}
        className={`grid grid-cols-2 gap-2 ${error ? "ring-1 ring-rose-500/40 rounded-xl" : ""}`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left
                        transition-all duration-200 ${
              value === opt.value
                ? "border-accent-primary/50 bg-accent-primary/15 ring-1 ring-accent-primary/30"
                : "border-primary bg-input hover:bg-card hover:text-secondary"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{opt.emoji}</span>
              <span className={`text-sm font-bold ${value === opt.value ? "text-accent-secondary" : "text-primary"}`}>
                {opt.label}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-tertiary">{opt.desc}</p>
          </button>
        ))}
      </div>
      {error && <p className="text-[11px] text-rose-400 leading-relaxed">{error}</p>}
    </div>
  );
}

// ─── Vue : Inscription ────────────────────────────────────────────────────────

function RegisterView({ onSwitch }: { onSwitch: () => void }) {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [playMode, setPlayMode] = useState<PlayMode | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    const usernameErr = validateUsername(username);
    if (usernameErr) next.username = usernameErr;

    if (!email.trim()) {
      next.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Adresse email invalide";
    }

    if (!password) {
      next.password = "Le mot de passe est requis";
    } else if (password.length < 8) {
      next.password = "Au moins 8 caractères requis";
    }

    if (!confirm) {
      next.confirm = "Veuillez confirmer le mot de passe";
    } else if (password !== confirm) {
      next.confirm = "Les mots de passe ne correspondent pas";
    }

    const ageNum = parseInt(age, 10);
    if (!age.trim()) {
      next.age = "L'âge est requis";
    } else if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      next.age = "Âge invalide (minimum 13 ans)";
    }

    if (!gender) next.gender = "Veuillez sélectionner votre genre";

    if (!playMode) next.playMode = "Veuillez choisir un mode de jeu";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    const ageNum = parseInt(age, 10);
    setLoading(true);
    const err = await register({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      age: ageNum,
      gender: gender as Gender,
      playMode: playMode as PlayMode,
    });
    if (err) setServerError(err);
    setLoading(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Pseudo"
          value={username}
          onChange={setUsername}
          placeholder="YourUsername"
          autoComplete="username"
          required
          hint="3–30 car., lettres/chiffres/_/-"
          error={errors.username}
        />
        <Field
          label="Âge"
          type="number"
          value={age}
          onChange={setAge}
          placeholder="18"
          autoComplete="bday-year"
          required
          error={errors.age}
        />
      </div>

      <GenderSelector value={gender} onChange={setGender} error={errors.gender} />

      <PlayModeSelector
        value={playMode}
        onChange={setPlayMode}
        error={errors.playMode}
      />

      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="votre@email.com"
        autoComplete="email"
        required
        error={errors.email}
      />

      <Field
        label="Mot de passe"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        showToggle
        error={errors.password}
      />
      <PasswordStrength password={password} />

      <Field
        label="Confirmer le mot de passe"
        value={confirm}
        onChange={setConfirm}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        showToggle
        error={errors.confirm}
      />

      {serverError && <ErrorBox message={serverError} />}

      <SubmitButton loading={loading} label="Créer mon compte" loadingLabel="Inscription…" />

      <p className="text-center text-sm text-tertiary">
        Déjà un compte ?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-accent-secondary transition hover:text-accent-primary underline underline-offset-2"
        >
          Se connecter
        </button>
      </p>
    </form>
  );
}

// ─── Vue : Mot de passe oublié ────────────────────────────────────────────────

function ForgotView({ onBack }: { onBack: () => void }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
      setLoading(false);
    },
    [email, forgotPassword]
  );

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-4xl">
            📧
          </div>
        </div>
        <div>
          <h3 className="font-bold text-primary">Email envoyé !</h3>
          <p className="mt-2 text-sm text-tertiary leading-relaxed">
            Si un compte est associé à <strong className="text-secondary">{email}</strong>,
            vous recevrez un lien de réinitialisation dans quelques minutes.
          </p>
          <p className="mt-2 text-xs text-tertiary">Vérifiez aussi vos spams.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 mx-auto text-sm text-accent-secondary transition hover:text-accent-primary"
        >
          <IconArrowLeft /> Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm text-tertiary leading-relaxed">
        Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>
      <Field
        label="Adresse email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="votre@email.com"
        autoComplete="email"
        required
      />
      <SubmitButton loading={loading} label="Envoyer le lien" loadingLabel="Envoi…" />
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 mx-auto text-sm text-tertiary transition hover:text-secondary"
      >
        <IconArrowLeft /> Retour
      </button>
    </form>
  );
}

// ─── Vue : Réinitialisation du mot de passe ───────────────────────────────────

function ResetView({ token }: { token: string }) {
  const { validateResetToken, resetPassword } = useAuth();
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    validateResetToken(token).then(setValid);
  }, [token, validateResetToken]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
      setLoading(true);
      const err = await resetPassword(token, password);
      if (err) { setError(err); setLoading(false); return; }
      setSuccess(true);
      setLoading(false);
    },
    [password, confirm, token, resetPassword]
  );

  if (valid === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary/30 border-t-accent-primary" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">⚠️</div>
        <div>
          <h3 className="font-bold text-rose-300">Lien invalide ou expiré</h3>
          <p className="mt-2 text-sm text-tertiary">
            Ce lien de réinitialisation est invalide ou a expiré (durée : 1 heure).
          </p>
        </div>
        <a
          href="/login"
          className="inline-block text-sm text-accent-secondary underline underline-offset-2 hover:text-accent-primary transition"
        >
          Demander un nouveau lien
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-4xl">
            ✅
          </div>
        </div>
        <div>
          <h3 className="font-bold text-primary">Mot de passe mis à jour !</h3>
          <p className="mt-2 text-sm text-tertiary">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-accent-secondary underline underline-offset-2 hover:text-accent-primary transition"
        >
          <IconArrowLeft /> Se connecter
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Nouveau mot de passe"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        showToggle
      />
      <PasswordStrength password={password} />

      <Field
        label="Confirmer le mot de passe"
        value={confirm}
        onChange={setConfirm}
        placeholder="••••••••"
        autoComplete="new-password"
        required
        showToggle
      />

      {error && <ErrorBox message={error} />}

      <SubmitButton loading={loading} label="Réinitialiser" loadingLabel="Mise à jour…" />
    </form>
  );
}

// ─── Composant erreur ─────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-500/30
                                  bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      <span className="mt-0.5 shrink-0 text-base">⚠️</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Titre et sous-titre des vues ─────────────────────────────────────────────

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  login:    { title: "Connexion",           subtitle: "Bienvenue sur CTF Arena" },
  register: { title: "Créer un compte",     subtitle: "Rejoignez la compétition" },
  forgot:   { title: "Mot de passe oublié", subtitle: "Récupérez votre accès" },
  reset:    { title: "Nouveau mot de passe", subtitle: "Choisissez un mot de passe sécurisé" },
};

// ─── Page principale ──────────────────────────────────────────────────────────

export default function LoginPage() {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [view, setView] = useState<View>(resetToken ? "reset" : "login");

  const meta = VIEW_META[view];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary p-4">
      {/* Fond animé */}
      {theme === "violet" && (
        <>
          <div
            className="pointer-events-none fixed left-1/4 top-1/4 h-96 w-96 rounded-full opacity-20 blur-[100px]"
            style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }}
          />
          <div
            className="pointer-events-none fixed right-1/4 bottom-1/4 h-64 w-64 rounded-full opacity-10 blur-[80px]"
            style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }}
          />
        </>
      )}

      {/* Sélecteur thème */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl
                          border border-accent-primary/30 bg-accent-primary/20 text-3xl
                          shadow-lg shadow-accent-primary/10">
            🏴
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary">CTF Arena</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-tertiary">
            Capture The Flag Platform
          </p>
        </div>

        {/* Carte */}
        <div className="rounded-3xl border border-primary bg-card p-8 shadow-theme backdrop-blur-xl">
          {/* En-tête de la vue */}
          <div className="mb-6">
            {(view === "forgot" || view === "reset") && view !== "reset" && (
              <button
                type="button"
                onClick={() => setView("login")}
                className="mb-3 flex items-center gap-1.5 text-xs text-tertiary transition hover:text-secondary"
              >
                <IconArrowLeft /> Retour
              </button>
            )}

            {/* Tabs Login / Register */}
            {(view === "login" || view === "register") && (
              <div className="mb-6 flex rounded-xl bg-input p-1">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    view === "login"
                      ? "bg-accent-primary text-white shadow-md"
                      : "text-tertiary hover:text-secondary"
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => setView("register")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    view === "register"
                      ? "bg-accent-primary text-white shadow-md"
                      : "text-tertiary hover:text-secondary"
                  }`}
                >
                  Inscription
                </button>
              </div>
            )}

            {/* Titre et sous-titre */}
            <h2 className="text-xl font-black text-primary">{meta.title}</h2>
            <p className="mt-0.5 text-sm text-tertiary">{meta.subtitle}</p>
          </div>

          {/* Contenu de la vue */}
          {view === "login" && (
            <LoginView
              onSwitch={() => setView("register")}
              onForgot={() => setView("forgot")}
            />
          )}
          {view === "register" && (
            <RegisterView onSwitch={() => setView("login")} />
          )}
          {view === "forgot" && (
            <ForgotView onBack={() => setView("login")} />
          )}
          {view === "reset" && resetToken && (
            <ResetView token={resetToken} />
          )}
        </div>
      </div>
    </div>
  );
}

