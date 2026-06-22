import React, { useState, useEffect } from 'react';
import rolesApi from '@/services/rolesApi';

interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
  roleName?: string;
}

interface HierarchyFilterProps {
  onSelectionChange: (selectedEmployeeId: string | null) => void;
  userRole: string; // "SUPER_ADMIN", "HR", "TEAM_LEAD", "EMPLOYEE"
  currentUserId: number;
}

export function HierarchyFilter({ onSelectionChange, userRole, currentUserId }: HierarchyFilterProps) {
  const [hrs, setHrs] = useState<UserInfo[]>([]);
  const [teamLeads, setTeamLeads] = useState<UserInfo[]>([]);
  const [employees, setEmployees] = useState<UserInfo[]>([]);

  const [selectedHrId, setSelectedHrId] = useState<number | null>(null);
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // 1. Fetch initial data based on role
  useEffect(() => {
    rolesApi.get('/api/users').then(res => {
      const allUsers = res.data || [];
      // Role bucket happens after this!
      setHrs(allUsers.filter((u: UserInfo) => u.roleName === 'HR'));
      setTeamLeads(allUsers.filter((u: UserInfo) => u.roleName === 'TEAM_LEAD' || u.roleName === 'TEAM LEADERS'));
      setEmployees(allUsers.filter((u: UserInfo) => u.roleName === 'EMPLOYEE'));
    }).catch(err => {
      console.error('Failed to fetch initial users', err);
    });
  }, [userRole, currentUserId]);

  // 2. Fetch Team Leaders when HR is selected
  useEffect(() => {
    if (selectedHrId) {
      setTeamLeads([]);
      setEmployees([]);
      setSelectedTeamLeadId(null);
      setSelectedEmployeeId(null);
      fetchDirectReports(selectedHrId).then(users => {
        setTeamLeads(users.filter(u => u.roleName === 'TEAM_LEAD' || u.roleName === 'TEAM LEADERS'));
      });
    }
  }, [selectedHrId]);

  // 3. Fetch Employees when Team Leader is selected
  useEffect(() => {
    if (selectedTeamLeadId) {
      setEmployees([]);
      setSelectedEmployeeId(null);
      fetchDirectReports(selectedTeamLeadId).then(users => {
        setEmployees(users.filter(u => u.roleName === 'EMPLOYEE'));
      });
    }
  }, [selectedTeamLeadId]);

  const fetchDirectReports = async (supervisorId: number): Promise<UserInfo[]> => {
    try {
      const res = await rolesApi.get(`/api/users/${supervisorId}/direct-reports`);
      return res.data || [];
    } catch (err) {
      console.error('Failed to fetch direct reports', err);
      return [];
    }
  };

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedEmployeeId(val === '' ? null : val);
    onSelectionChange(val === '' ? null : val);
  };

  return (
    <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-gray-50 rounded-md border">
      <h3 className="text-sm font-semibold text-gray-700 w-full mb-2">Hierarchy Filter</h3>
      
      {/* Super Admin sees HR Dropdown */}
      {userRole === 'SUPER_ADMIN' && (
        <select 
          className="border rounded p-2 text-sm min-w-[200px]"
          value={selectedHrId || ''}
          onChange={(e) => setSelectedHrId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- All HRs --</option>
          {hrs.map(hr => (
            <option key={hr.id} value={hr.id}>{hr.firstName} {hr.lastName}</option>
          ))}
        </select>
      )}

      {/* Super Admin or HR sees Team Leaders Dropdown */}
      {(userRole === 'SUPER_ADMIN' || userRole === 'HR') && (
        <select 
          className="border rounded p-2 text-sm min-w-[200px]"
          value={selectedTeamLeadId || ''}
          onChange={(e) => setSelectedTeamLeadId(e.target.value ? Number(e.target.value) : null)}
          disabled={userRole === 'SUPER_ADMIN' && !selectedHrId}
        >
          <option value="">-- All Team Leaders --</option>
          {teamLeads.map(tl => (
            <option key={tl.id} value={tl.id}>{tl.firstName} {tl.lastName}</option>
          ))}
        </select>
      )}

      {/* Everyone sees Employee Dropdown */}
      {userRole !== 'EMPLOYEE' && (
        <select 
          className="border rounded p-2 text-sm min-w-[200px]"
          value={selectedEmployeeId || ''}
          onChange={handleEmployeeChange}
          disabled={(userRole === 'HR' && !selectedTeamLeadId) || (userRole === 'SUPER_ADMIN' && !selectedTeamLeadId)}
        >
          <option value="">-- All Employees --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.employeeId}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
          ))}
        </select>
      )}
    </div>
  );
}
