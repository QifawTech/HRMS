// import api from "./axios";

// // Company settings
// export const getCompanySettings = () => api.get("/settings/company");
// export const updateCompanySettings = (data) => api.put("/settings/company", data);

// // Account
// export const getMyAccount = () => api.get("/settings/account");
// export const updateEmail = (newEmail, currentPassword) =>
//   api.put("/settings/account/email", {
//     new_email: newEmail,
//     current_password: currentPassword,
//   });
// export const updatePassword = (currentPassword, newPassword) =>
//   api.put("/settings/account/password", {
//     current_password: currentPassword,
//     new_password: newPassword,
//   });

// export const uploadCompanyLogo = (file) => {
//   const formData = new FormData();
//   formData.append("file", file);
//   return api.post("/settings/company/logo", formData, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
// };

import api from "./axios";

// Company settings
export const getCompanySettings = () => api.get("/settings/company");
export const updateCompanySettings = (data) => api.put("/settings/company", data);

// Account
export const getMyAccount = () => api.get("/settings/account");
export const updateEmail = (newEmail, currentPassword) =>
  api.put("/settings/account/email", {
    new_email: newEmail,
    current_password: currentPassword,
  });
export const updatePassword = (currentPassword, newPassword) =>
  api.put("/settings/account/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });

export const uploadCompanyLogo = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/settings/company/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ============================================
// PROFESSIONAL TAX SLABS (NEW)
// ============================================

// Manager: get all PT slabs (for settings page view)
export const getProfessionalTaxSlabs = () =>
  api.get("/settings/professional-tax");

// Manager: update PT slabs (bulk replace)
export const updateProfessionalTaxSlabs = (slabs) =>
  api.put("/settings/professional-tax", { slabs });