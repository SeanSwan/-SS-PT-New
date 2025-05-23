import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ListContainer = styled.div`
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 800px;
  margin: auto;
`;

const ListItem = styled.div`
  padding: 10px;
  border-bottom: 1px solid #eee;
  &:last-child {
    border-bottom: none;
  }
`;

const UserList = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const response = await fetch('/api/users'); // Your API endpoint
      const data = await response.json();
      setUsers(data);
    };

    fetchUsers();
  }, []);

  return (
    <ListContainer>
      {users.map(user => (
        <ListItem key={user.id}>
          {user.name} - {user.role}
        </ListItem>
      ))}
    </ListContainer>
  );
};

export default UserList;