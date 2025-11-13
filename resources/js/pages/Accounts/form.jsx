import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../helpers/api";

const AccountsForm = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const editingId = React.useMemo(() => params?.id || location?.state?.editId || null, [params, location]);
  const [loading, setLoading] = React.useState(false);
  const [defaultInfo, setDefaultInfo] = React.useState({ defaultId: null, isDefault: false, wasDefault: false });
  const [initialValues, setInitialValues] = React.useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    account_type: "",
    swift_code: "",
    ifsc_code: "",
  });

  React.useEffect(() => {
    document.title = editingId ? "Edit Account" : "Add Account";
  }, [editingId]);

  // Fetch existing account when editing
  React.useEffect(() => {
    if (!editingId) return;
    let isMounted = true;
    setLoading(true);
    api.get(`/accounts/${editingId}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data || {};
        setInitialValues({
          account_name: data.account_name || "",
          bank_name: data.bank_name || "",
          account_number: data.account_number || "",
          account_type: data.account_type || "",
          swift_code: data.swift_code || "",
          ifsc_code: data.ifsc_code || "",
        });
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [editingId]);

  // Fetch default account id to toggle checkbox state
  React.useEffect(() => {
    let isMounted = true;
    api.get('/settings/default-account')
      .then(res => {
        if (!isMounted) return;
        const defId = res?.data?.account_id ?? null;
        const isDef = editingId ? Number(defId) === Number(editingId) : false;
        setDefaultInfo({ defaultId: defId, isDefault: isDef, wasDefault: isDef });
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [editingId]);

  const validation = useFormik({
    enableReinitialize: true,
    initialValues,
    validationSchema: Yup.object({
      account_name: Yup.string().required("Account name is required"),
      bank_name: Yup.string().required("Bank name is required"),
      account_number: Yup.string()
        .matches(/^[0-9]{6,20}$/,
          "Account number must be 6-20 digits")
        .required("Account number is required"),
      account_type: Yup.string().required("Account type is required"),
      swift_code: Yup.string()
        .matches(/^[A-Za-z0-9]{8}(?:[A-Za-z0-9]{3})?$/, "Invalid SWIFT code")
        .required("SWIFT code is required"),
      ifsc_code: Yup.string()
        .matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/,
          "Invalid IFSC code format")
        .required("IFSC code is required"),
    }),
    onSubmit: async (values, { setSubmitting, setErrors }) => {
      try {
        if (editingId) {
          await api.put(`/accounts/${editingId}`, values);
          // After saving, set or clear default if needed
          try {
            if (defaultInfo.isDefault) {
              await api.post('/settings/default-account', { account_id: Number(editingId) });
            } else if (defaultInfo.wasDefault && !defaultInfo.isDefault) {
              await api.post('/settings/default-account', { account_id: null });
            }
          } catch {}
          navigate("/accounts", { state: { updated: true } });
        } else {
          const res = await api.post("/accounts", values);
          const newId = res?.data?.id;
          try {
            if (defaultInfo.isDefault && newId) {
              await api.post('/settings/default-account', { account_id: Number(newId) });
            }
          } catch {}
          navigate("/accounts", { state: { created: true } });
        }
      } catch (e) {
        if (e?.response?.status === 422 && e.response.data?.errors) {
          // Map Laravel validation errors to Formik
          const backendErrors = e.response.data.errors;
          const mapped = Object.keys(backendErrors).reduce((acc, key) => {
            acc[key] = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : String(backendErrors[key]);
            return acc;
          }, {});
          setErrors(mapped);
        } else {
          alert(e?.response?.data?.message || e?.message || "Failed to save account");
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <>
      {/* Scoped style: use a specific class instead of unused .main-content and avoid !important */}
      <style>{`.accounts-form-container { background-color: #ffffff; }`}</style>
      <div className="container accounts-form-container" style={{ maxWidth: 720, marginTop: 24, backgroundColor: '#fff' }}>
      <h3 className="mb-3" style={{ fontWeight: 700, color: "#1a2942" }}>{editingId ? 'Edit Account' : 'Add Account'}</h3>
      {loading && (
        <div className="alert alert-info">Loading account...</div>
      )}
      <form onSubmit={validation.handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">Account name<span className="text-danger"> *</span></label>
          <input
            type="text"
            name="account_name"
            className="form-control"
            placeholder="Enter account name"
            value={validation.values.account_name}
            onChange={validation.handleChange}
            onBlur={validation.handleBlur}
          />
          {validation.touched.account_name && validation.errors.account_name && (
            <div className="text-danger small">{validation.errors.account_name}</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Bank<span className="text-danger"> *</span></label>
          <input
            type="text"
            name="bank_name"
            className="form-control"
            placeholder="Enter bank name"
            value={validation.values.bank_name}
            onChange={validation.handleChange}
            onBlur={validation.handleBlur}
          />
          {validation.touched.bank_name && validation.errors.bank_name && (
            <div className="text-danger small">{validation.errors.bank_name}</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Account number<span className="text-danger"> *</span></label>
          <input
            type="text"
            name="account_number"
            className="form-control"
            placeholder="Enter account number"
            value={validation.values.account_number}
            onChange={validation.handleChange}
            onBlur={validation.handleBlur}
          />
          {validation.touched.account_number && validation.errors.account_number && (
            <div className="text-danger small">{validation.errors.account_number}</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Account type<span className="text-danger"> *</span></label>
          <input
            type="text"
            name="account_type"
            className="form-control"
            placeholder="Enter account type (e.g., Savings, Current)"
            value={validation.values.account_type}
            onChange={validation.handleChange}
            onBlur={validation.handleBlur}
          />
          {validation.touched.account_type && validation.errors.account_type && (
            <div className="text-danger small">{validation.errors.account_type}</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">SWIFT code<span className="text-danger"> *</span></label>
          <input
            type="text"
            name="swift_code"
            className="form-control"
            placeholder="Enter SWIFT code"
            value={validation.values.swift_code}
            onChange={(e) => {
              // Uppercase automatically
              validation.setFieldValue("swift_code", e.target.value.toUpperCase());
            }}
            onBlur={validation.handleBlur}
          />
          {validation.touched.swift_code && validation.errors.swift_code && (
            <div className="text-danger small">{validation.errors.swift_code}</div>
          )}
        </div>

        <div className="mb-4">
          <label className="form-label">IFSC<span className="text-danger"> *</span></label>
          <input
            type="text"
            name="ifsc_code"
            className="form-control"
            placeholder="Enter IFSC code"
            value={validation.values.ifsc_code}
            onChange={(e) => validation.setFieldValue("ifsc_code", e.target.value.toUpperCase())}
            onBlur={validation.handleBlur}
          />
          {validation.touched.ifsc_code && validation.errors.ifsc_code && (
            <div className="text-danger small">{validation.errors.ifsc_code}</div>
          )}
        </div>

        {/* Default account checkbox */}
        <div className="form-check form-switch mb-4">
          <input
            className="form-check-input"
            type="checkbox"
            id="isDefaultAccount"
            checked={!!defaultInfo.isDefault}
            onChange={(e) => setDefaultInfo(prev => ({ ...prev, isDefault: e.target.checked }))}
          />
          <label className="form-check-label" htmlFor="isDefaultAccount">
            Default
          </label>
        </div>

        <div className="d-flex gap-2">
          <button
            type="submit"
            className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm"
            disabled={validation.isSubmitting}
          >
            {editingId ? 'Update Account' : 'Save Account'}
          </button>
          <button
            type="button"
            className="btn btn-light border rounded-pill px-4 py-2 fw-bold"
            onClick={() => navigate('/accounts')}
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </>
  );
};

export default AccountsForm;
