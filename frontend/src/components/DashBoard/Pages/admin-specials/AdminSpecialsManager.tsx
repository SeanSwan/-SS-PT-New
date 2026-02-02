import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../../../../services/api';
import { AdminSpecial, AdminSpecialFormData, Package } from './adminSpecials.types';
import { Container, Header, Title, AddButton } from './adminSpecials.styles';
import AdminSpecialsTable from './AdminSpecialsTable';
import AdminSpecialsModal from './AdminSpecialsModal';

const defaultFormData = (): AdminSpecialFormData => ({
  name: '',
  description: '',
  bonusSessions: 1,
  bonusDuration: 60,
  applicablePackageIds: [],
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
});

const AdminSpecialsManager: React.FC = () => {
  const [specials, setSpecials] = useState<AdminSpecial[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<AdminSpecial | null>(null);
  const [formData, setFormData] = useState<AdminSpecialFormData>(defaultFormData());

  const fetchSpecials = useCallback(async () => {
    try {
      const response = await apiService.get('/admin/specials');
      setSpecials(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch specials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const response = await apiService.get('/storefront');
      const pkgs = response.data.data?.packages || response.data.data || [];
      setPackages(pkgs.map((p: any) => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  }, []);

  useEffect(() => {
    fetchSpecials();
    fetchPackages();
  }, [fetchSpecials, fetchPackages]);

  const openCreateModal = () => {
    setEditingSpecial(null);
    setFormData(defaultFormData());
    setShowModal(true);
  };

  const openEditModal = (special: AdminSpecial) => {
    setEditingSpecial(special);
    setFormData({
      name: special.name,
      description: special.description || '',
      bonusSessions: special.bonusSessions,
      bonusDuration: special.bonusDuration,
      applicablePackageIds: special.applicablePackageIds || [],
      startDate: special.startDate.split('T')[0],
      endDate: special.endDate.split('T')[0]
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };

      if (editingSpecial) {
        await apiService.put(`/admin/specials/${editingSpecial.id}`, payload);
      } else {
        await apiService.post('/admin/specials', payload);
      }

      setShowModal(false);
      fetchSpecials();
    } catch (error) {
      console.error('Failed to save special:', error);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await apiService.patch(`/admin/specials/${id}/toggle`);
      fetchSpecials();
    } catch (error) {
      console.error('Failed to toggle special:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this special?')) return;
    try {
      await apiService.delete(`/admin/specials/${id}`);
      fetchSpecials();
    } catch (error) {
      console.error('Failed to delete special:', error);
    }
  };

  const handlePackageToggle = (pkgId: number) => {
    setFormData((prev) => ({
      ...prev,
      applicablePackageIds: prev.applicablePackageIds.includes(pkgId)
        ? prev.applicablePackageIds.filter((id) => id !== pkgId)
        : [...prev.applicablePackageIds, pkgId]
    }));
  };

  return (
    <Container>
      <Header>
        <Title>Admin Specials</Title>
        <AddButton onClick={openCreateModal}>+ Add Special</AddButton>
      </Header>

      {loading ? (
        <Container>Loading...</Container>
      ) : (
        <AdminSpecialsTable
          specials={specials}
          packages={packages}
          onEdit={openEditModal}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}

      <AdminSpecialsModal
        show={showModal}
        editingSpecial={editingSpecial}
        formData={formData}
        packages={packages}
        onClose={() => setShowModal(false)}
        onChange={setFormData}
        onSave={handleSave}
        onTogglePackage={handlePackageToggle}
      />
    </Container>
  );
};

export default AdminSpecialsManager;
