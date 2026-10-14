import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

const FONT = "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.role === "MANAGER") {
        navigate("/manager/dashboard");
      } else if (data.role === "EMPLOYEE") {
        navigate("/employee/dashboard");
      } else {
        setError("Unknown role");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ Inter font — Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .login-wrapper,
        .login-wrapper * {
          font-family: ${FONT};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f8fc;
          padding: 20px 16px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #fff;
          border-radius: 14px;
          border: 1px solid #eef0f4;
          padding: 40px 32px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04),
                      0 8px 24px rgba(16, 24, 40, 0.06);
        }

        .login-title {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.4px;
          text-align: center;
          margin: 0 0 6px;
        }

        .login-subtitle {
          font-size: 13.5px;
          font-weight: 400;
          color: #64748b;
          text-align: center;
          margin: 0 0 28px;
        }

        .login-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
          margin-bottom: 6px;
        }

        .login-input-wrap {
          position: relative;
        }

        .login-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 14px;
          font-family: ${FONT};
          color: #0f172a;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .login-input::placeholder {
          color: #94a3b8;
        }

        .login-input:hover:not(:disabled) {
          border-color: #cbd5e1;
        }

        .login-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }

        .login-input:disabled {
          background: #f8fafc;
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-input.with-icon {
          padding-right: 44px;
        }

        .login-eye {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }

        .login-eye:hover {
          color: #475569;
          background: #f1f5f9;
        }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          margin-bottom: 18px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: #b91c1c;
          line-height: 1.5;
        }

        .login-btn {
          width: 100%;
          height: 44px;
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14.5px;
          font-weight: 600;
          font-family: ${FONT};
          color: #fff;
          background: #6366f1;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.05s;
        }

        .login-btn:hover:not(:disabled) {
          background: #4f46e5;
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @keyframes login-spin {
          to { transform: rotate(360deg); }
        }

        .login-spin {
          animation: login-spin 0.7s linear infinite;
        }

        /* ===== Mobile ===== */
        @media (max-width: 480px) {
          .login-wrapper {
            padding: 16px 14px;
          }

          .login-card {
            padding: 32px 22px;
            border-radius: 12px;
          }

          .login-title {
            font-size: 20px;
          }

          .login-input {
            height: 46px;
            font-size: 15px; /* iOS zoom prevent */
          }

          .login-btn {
            height: 46px;
            font-size: 15px;
          }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-card">
          {/* Header */}
          <h3 className="login-title">Employee ERP</h3>
          <p className="login-subtitle">Sign in to your account</p>

          {/* Error */}
          {error && (
            <div className="login-error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="on">
            {/* Email */}
            <div className="mb-3">
              <label className="login-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="login-label" htmlFor="password">
                Password
              </label>
              <div className="login-input-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="login-input with-icon"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spin" style={{ display: "inline-block" }}>
                    ⟳
                  </span>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              marginTop: 24,
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            © {new Date().getFullYear()} Qifaw Technologies
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;