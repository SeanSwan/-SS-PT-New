import React, { useEffect, useState } from 'react';
import { fetchGroups } from '../services/groupme';

const GuardList = () => {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const getGroups = async () => {
      const groupData = await fetchGroups();
      setGroups(groupData);
    };

    getGroups();
  }, []);

  return (
    <div className="guard-list">
      {groups.map((group) => (
        <div key={group.id} className="group-card">
          <h2>{group.name}</h2>
          <p>{group.description}</p>
        </div>
      ))}
    </div>
  );
};

export default GuardList;