import { Link } from "react-router-dom";

const Unauthorized = () => (
  <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
    <div className="text-center">
      <h1 className="display-1 fw-bold text-danger">403</h1>
      <h3>Unauthorized</h3>
      <p className="text-muted">You don't have permission to access this page.</p>
      <Link to="/login" className="btn btn-primary mt-3">
        Back to Login
      </Link>
    </div>
  </div>
);

export default Unauthorized;