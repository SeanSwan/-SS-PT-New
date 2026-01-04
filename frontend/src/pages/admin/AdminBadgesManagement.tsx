import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Award, UploadCloud, Plus, Save, Trash2 } from 'lucide-react';
import apiService from '../../services/api.service';
import { useToast } from '../../hooks/use-toast';

const PageContainer = styled(motion.div)`
  padding: 2rem;
  color: white;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 2rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const Card = styled.div`
  background: rgba(30, 41, 59, 0.6);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid rgba(59, 130, 246, 0.2);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: white;
  margin-bottom: 1rem;
`;

const UploadBox = styled.div`
  border: 2px dashed rgba(255,255,255,0.3);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  margin-bottom: 1rem;
`;

const BadgePreview = styled.img`
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin: 0 auto 1rem;
  display: block;
`;

const AdminBadgesManagement: React.FC = () => {
  const { toast } = useToast();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState(100);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchBadges = async () => {
      // This would be the real API call
      // const response = await apiService.get('/api/admin/badges');
      // setBadges(response.data);
      setLoading(false);
      try {
        const response = await apiService.get('/api/admin/badges');
        setBadges(response.data);
      } catch (error) {
        toast({ title: "Error", description: "Could not fetch badges.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchBadges();
  }, []);
  }, [toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        // This is the upload API call from the blueprint
        // const response = await apiService.post('/api/admin/media/upload', formData);
        // setImageUrl(response.data.url);
        
        // Mocking the upload
        setTimeout(() => {
          const mockUrl = URL.createObjectURL(file);
          setImageUrl(mockUrl);
          setIsUploading(false);
          toast({ title: "Image Uploaded", description: "Ready to save new badge." });
        }, 1500);
        // This endpoint is defined in CUSTOM-MEDIA-MANAGEMENT-BLUEPRINT.md
        const response = await apiService.post('/api/admin/media/upload', formData);
        setImageUrl(response.data.url);
        toast({ title: "Image Uploaded", description: "Ready to save new badge." });

      } catch (error) {
        toast({ title: "Upload Failed", variant: "destructive" });
        setIsUploading(false);
      }
    }
  };

  const handleSaveBadge = async () => {
    if (!name || !description || !imageUrl) {
      toast({ title: "Missing Fields", description: "Please fill all fields and upload an image.", variant: "destructive" });
      return;
    }

    const payload = { name, description, xpReward, imageUrl };

    try {
      // const response = await apiService.post('/api/admin/badges', payload);
      // setBadges([response.data, ...badges]);
      
      // Mocking save
      setBadges([{ ...payload, id: Date.now() }, ...badges]);
      const response = await apiService.post('/api/admin/badges', payload);
      setBadges([response.data, ...badges]);

      // Reset form
      setName('');
      setDescription('');
      setXpReward(100);
      setImageUrl('');
      setImageFile(null);

      toast({ title: "Badge Saved!", variant: "success" });
    } catch (error) {
      toast({ title: "Save Failed", variant: "destructive" });
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!window.confirm("Are you sure you want to delete this badge?")) return;

    try {
      await apiService.delete(`/api/admin/badges/${badgeId}`);
      setBadges(badges.filter(b => b.id !== badgeId));
      toast({ title: "Badge Deleted", variant: "success" });
    } catch (error) {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  return (
    <PageContainer>
      <Title>Badge Management</Title>
      <Grid>
        <Card>
          <h2>Existing Badges</h2>
          {loading ? <p>Loading badges...</p> : (
            <div>
              {badges.length === 0 ? <p>No badges created yet.</p> : (
                badges.map(badge => (
                  <div key={badge.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <img src={badge.imageUrl} alt={badge.name} style={{ width: 50, height: 50 }} />
                    <div>
                      <strong>{badge.name}</strong>
                      <p style={{ margin: 0, fontSize: '0.8rem' }}>{badge.description}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem' }}>XP: {badge.xpReward}</p>
                    </div>
                    <button style={{ marginLeft: 'auto' }}><Trash2 size={16} /></button>
                    <button onClick={() => handleDeleteBadge(badge.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
        <Card>
          <h2>Create New Badge</h2>
          <Input placeholder="Badge Name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <Input type="number" placeholder="XP Reward" value={xpReward} onChange={e => setXpReward(Number(e.target.value))} />
          
          <input type="file" id="badge-upload" hidden onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />
          <UploadBox onClick={() => document.getElementById('badge-upload')?.click()}>
            {isUploading ? <p>Uploading...</p> : imageUrl ? <BadgePreview src={imageUrl} /> : <UploadCloud />}
            <p>{imageUrl ? "Change Image" : "Upload Badge Image (PNG, JPG, GIF)"}</p>
          </UploadBox>

          <button 
            onClick={handleSaveBadge}
            style={{ width: '100%', padding: '1rem', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            <Save size={16} style={{ marginRight: '0.5rem' }} />
            Save New Badge
          </button>
        </Card>
      </Grid>
    </PageContainer>
  );
};

export default AdminBadgesManagement;