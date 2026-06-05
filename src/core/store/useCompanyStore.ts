import { create } from "zustand";

interface Company {
  id: string;
  name: string;
}

interface CompanyState {
  activeCompany: Company | null;
  activeBranch: Company | null;
  setActiveCompany: (company: Company | null) => void;
  setActiveBranch: (branch: Company | null) => void;
}

export const useCompanyStore = create<CompanyState>((set) => {
  const companyId = localStorage.getItem("active_company_id");
  const companyName = localStorage.getItem("active_company_name");
  const branchId = localStorage.getItem("active_branch_id");
  const branchName = localStorage.getItem("active_branch_name");

  return {
    activeCompany: companyId && companyName ? { id: companyId, name: companyName } : null,
    activeBranch: branchId && branchName ? { id: branchId, name: branchName } : null,

    setActiveCompany: (company) => {
      if (company) {
        localStorage.setItem("active_company_id", company.id);
        localStorage.setItem("active_company_name", company.name);
      } else {
        localStorage.removeItem("active_company_id");
        localStorage.removeItem("active_company_name");
      }
      set({ activeCompany: company });
    },

    setActiveBranch: (branch) => {
      if (branch) {
        localStorage.setItem("active_branch_id", branch.id);
        localStorage.setItem("active_branch_name", branch.name);
      } else {
        localStorage.removeItem("active_branch_id");
        localStorage.removeItem("active_branch_name");
      }
      set({ activeBranch: branch });
    },
  };
});
