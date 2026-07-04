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

export const useCompanyStore = create<CompanyState>((set) => ({
    activeCompany: localStorage.getItem('active_company_id')
      ? {
          id: localStorage.getItem('active_company_id')!,
          name: localStorage.getItem('active_company_name') || '',
        }
      : null,
    activeBranch: localStorage.getItem('active_branch_id')
      ? {
          id: localStorage.getItem('active_branch_id')!,
          name: localStorage.getItem('active_branch_name') || '',
        }
      : null,

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
}));
