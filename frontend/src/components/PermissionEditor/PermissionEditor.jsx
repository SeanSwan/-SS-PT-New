import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
`;

const RoleSelector = styled.select`
  padding: 8px;
  margin-bottom: 20px;
  width: 200px;
  border: 1px solid #ccc;
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  padding: 10px;
`;

const PermissionCheckbox = styled.label`
  display: block;
  background: #f9f9f9;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;

  input {
    margin-right: 10px;
  }
`;

const PermissionEditor = () => {
  const [selectedRole, setSelectedRole] = useState('guard');
  const [permissions, setPermissions] = useState({
    'View Schedule': false,
    'Edit Schedule': false,
    'View Reports': false,
    'Edit Reports': false,
    'Manage Users': false
  });

  useEffect(() => {
    // Simulate loading permissions for a role
    const rolePermissions = {
      'guard': {
        'View Schedule': true,
        'View Reports': true
      },
      'supervisor': {
        'View Schedule': true,
        'Edit Schedule': true,
        'View Reports': true
      },
      'admin': {
        'View Schedule': true,
        'Edit Schedule': true,
        'View Reports': true,
        'Edit Reports': true,
        'Manage Users': true
      }
    };
    setPermissions(rolePermissions[selectedRole]);
  }, [selectedRole]);

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handlePermissionChange = (permission) => {
    setPermissions(prevPermissions => ({
      ...prevPermissions,
      [permission]: !prevPermissions[permission]
    }));
  };

  return (
    <EditorContainer>
      <RoleSelector value={selectedRole} onChange={handleRoleChange}>
        <option value="guard">Guard</option>
        <option value="supervisor">Supervisor</option>
        <option value="admin">Admin</option>
      </RoleSelector>
      <PermissionsGrid>
        {Object.keys(permissions).map(permission => (
          <PermissionCheckbox key={permission}>
            <input
              type="checkbox"
              checked={permissions[permission]}
              onChange={() => handlePermissionChange(permission)}
            />
            {permission}
          </PermissionCheckbox>
        ))}
      </PermissionsGrid>
    </EditorContainer>
  );
};

export default PermissionEditor;