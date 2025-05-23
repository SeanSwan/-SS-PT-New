import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import {
    Camera, Image, Video, Upload, FileText, Trash2, Pencil,
    Link, Eye, X, Calendar, Search, AlertTriangle, File, Grid, List,
    Filter, ChevronDown, Clock, Play, Loader2, Lock, Copy, Check, Volume2
} from 'lucide-react';
// Import the updated MediaFile type where 'id' is required
import { MediaFile } from '../../types/reports';

// --- Props Interface Definition ---
interface MediaManagementSystemProps {
  onMediaSelect: (media: MediaFile[]) => void;
  initialMedia?: Partial<MediaFile>[]; // Allow partial for initial loading
  clientId?: string;
  reportId?: string;
}

// --- Utility Functions ---
const generateId = (): string => Math.random().toString(36).substring(2, 15);

const getFileType = (file: File | { name?: string; type?: string }): MediaFile['type'] => {
    const fileName = file.name || '';
    const fileType = (file as File).type || ''; // Prefer File.type if available
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType === 'application/pdf') return 'document';

    if (!extension) return 'other';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'mkv'].includes(extension)) return 'video';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(extension)) return 'document';
    if (['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(extension)) return 'audio';
    return 'other';
};

const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDateSafe = (dateInput?: Date | string): string => {
    if (!dateInput) return 'N/A';
    try {
        const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        return format(dateObj, 'MMM d, yyyy');
    } catch (e) { return 'Invalid Date'; }
};

const generateDummyMedia = (): MediaFile[] => []; // Keep empty for production

// Map initial data, ensuring required 'id' is present
const mapInitialMedia = (media: Partial<MediaFile>[]): MediaFile[] => media.map((item): MediaFile => {
    const ensureDateObject = (d: any): Date | undefined => {
        if (d instanceof Date && !isNaN(d.getTime())) return d;
        if (typeof d === 'string') { try { const p = new Date(d); if (!isNaN(p.getTime())) return p; } catch { /* ignore */ } }
        return undefined;
    };
    const getIsoString = (d: any): string => { const dateObj = ensureDateObject(d); return dateObj ? dateObj.toISOString() : new Date().toISOString(); };

    const fileType = item.type || getFileType({ name: item.name, type: undefined }) || 'other'; // Determine type early

    return {
        id: item.id || generateId(), // Ensure ID exists
        url: item.url || '#',
        name: item.name || 'Unnamed file',
        type: fileType,
        size: typeof item.size === 'number' ? item.size : 0,
        thumbnail: item.thumbnail || (fileType === 'image' ? item.url : undefined),
        dateCreated: ensureDateObject(item.dateCreated) ?? new Date(),
        description: item.description || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
        expiryDate: ensureDateObject(item.expiryDate),
        shareLink: item.shareLink,
        uploadedAt: getIsoString(item.uploadedAt),
        file: item.file // Include the File object if provided initially
    };
});

// --- Styled Components (Using transient props) ---
const Section = styled.div` /* ... */ `;
const SectionTitle = styled.h3` /* ... */ `;
const TitleWithIcon = styled.div` /* ... */ `;
const ViewModeButtons = styled.div` /* ... */ `;
const ViewModeButton = styled(Button)` /* ... */ `;
const MediaTabs = styled(Tabs)` /* ... */ `;
const MediaTabsList = styled(TabsList)` /* ... */ `;
const MediaTabsTrigger = styled(TabsTrigger)` /* ... */ `;
const FilterRow = styled.div` /* ... */ `;
const SearchInput = styled.div` /* ... */ `;
const SearchIcon = styled.div` /* ... */ `;
const Input = styled.input` /* ... */ `;
const FilterDropdown = styled.div` /* ... */ `;
const FilterButton = styled(Button)` /* ... */ `;
const FilterMenu = styled.div<{ $open: boolean }>` /* ... */ `;
const FilterOption = styled.div` /* ... */ `;
const DropZoneContainer = styled.div` /* ... */ `;
const DropZoneIcon = styled.div` /* ... */ `;
const DropZoneText = styled.div` /* ... */ `;
const DropZoneSubtext = styled.div` /* ... */ `;
const FilesContainer = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const FileCard = styled.div<{ $viewMode: 'grid' | 'list'; $selected: boolean }>` /* ... */ `;
const FilePreview = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const FileCardContent = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const FileInfo = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const FileName = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const FileDetails = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const FileActions = styled.div<{ $viewMode: 'grid' | 'list' }>` /* ... */ `;
const IconButton = styled.button` /* ... */ `;
const SelectBox = styled.div<{ $selected: boolean }>` /* ... */ `;
const TypeBadge = styled(Badge)` /* ... */ `;
const EmptyState = styled.div` /* ... */ `;
const EmptyStateIcon = styled.div` /* ... */ `;
const EmptyStateTitle = styled.div` /* ... */ `;
const EmptyStateText = styled.div` /* ... */ `;
const BulkActions = styled.div` /* ... */ `;
const BulkActionsInfo = styled.div` /* ... */ `;
const BulkActionsButtons = styled.div` /* ... */ `;
const BulkActionButton = styled(Button)` /* ... */ `;
const ModalOverlay = styled.div` /* ... */ `;
const Modal = styled.div` /* ... */ `;
const ModalHeader = styled.div` /* ... */ `;
const ModalTitle = styled.div` /* ... */ `;
const ModalCloseButton = styled.button` /* ... */ `;
const ModalContent = styled.div` /* ... */ `;
const ModalActions = styled.div` /* ... */ `;
const VideoPreview = styled.div` /* ... */ `;
const ImagePreview = styled.div` /* ... */ `;
const PreviewPlaceholder = styled.div` /* ... */ `;
const FormGroup = styled.div` /* ... */ `;
const FormLabel = styled.label` /* ... */ `;
const FormInput = styled.input` /* ... */ `;
const FormTextarea = styled.textarea` /* ... */ `;
const CopyInput = styled.div` /* ... */ `;
const CopyInputField = styled.input` /* ... */ `;
const CopyButton = styled.button` /* ... */ `;
const ExpiryBadge = styled(Badge)` /* ... */ `;
const ShareOptions = styled.div` /* ... */ `;
const ShareOptionsTitle = styled.div` /* ... */ `;
const ShareOptionsGrid = styled.div` /* ... */ `;
const FileMetadata = styled.div` /* ... */ `;
const MetadataTitle = styled.div` /* ... */ `;
const MetadataGrid = styled.div` /* ... */ `;
const MetadataItem = styled.div` /* ... */ `;
const MetadataLabel = styled.div` /* ... */ `;
const MetadataValue = styled.div` /* ... */ `;
const UploadProgress = styled.div` /* ... */ `;
const ProgressBar = styled.div` /* ... */ `;
const ProgressFill = styled.div<{ $progress: number }>` /* ... */ `;
const ProgressInfo = styled.div` /* ... */ `;


/**
 * Media Management System Component
 */
const MediaManagementSystem: React.FC<MediaManagementSystemProps> = ({
  onMediaSelect,
  initialMedia = [],
  // clientId, // Optional prop is available
  // reportId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // --- State Declarations ---
  const [activeTab, setActiveTab] = useState<MediaFile['type'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterMenuOpen, setFilterMenuOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); // Store required string IDs
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [editForm, setEditForm] = useState({ name: '', description: '', tags: '', expiryDate: '' });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  // Initialize state with mapped initial media, ensuring IDs are present
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(() =>
    initialMedia.length > 0 ? mapInitialMedia(initialMedia) : generateDummyMedia()
  );
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // --- Effects ---
  // Initialize selection based on initialMedia IDs
  useEffect(() => {
    if (initialMedia.length > 0) {
      // Map initialMedia to ensure IDs exist and filter based on those guaranteed IDs
      const mappedInitial = mapInitialMedia(initialMedia);
      const initialIds = mediaFiles
        .filter(file => mappedInitial.some(initial => initial.id === file.id))
        .map(file => file.id); // Now file.id is guaranteed string
      setSelectedFiles(initialIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Notify parent on selection change
  useEffect(() => {
    const selectedMediaObjects = mediaFiles.filter(file => selectedFiles.includes(file.id));
    onMediaSelect(selectedMediaObjects);
  }, [selectedFiles, mediaFiles, onMediaSelect]);

  // --- Event Handlers & Callbacks ---
  const openFilePicker = () => fileInputRef.current?.click();
  const openVideoPicker = () => videoInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, _type: 'image' | 'video') => {
    if (e.target.files?.length) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
      setShowUploadModal(true);
    }
    if (e.target) e.target.value = ''; // Allow re-selecting the same file
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files?.length) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      setShowUploadModal(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);

  // Upload Simulation
  const handleUpload = useCallback(async () => {
      if (uploadedFiles.length === 0) return;
      setIsUploading(true); setUploadProgress(0);
      try {
          const newMediaFiles: MediaFile[] = [];
          for (let i = 0; i < uploadedFiles.length; i++) {
              const file = uploadedFiles[i];
              // Use mapInitialMedia logic to create consistent MediaFile objects with IDs
              const mappedFile = mapInitialMedia([{ name: file.name, size: file.size, file: file }])[0];
              // Simulate getting a final URL after upload (replace createObjectURL)
              mappedFile.url = `https://cdn.example.com/${mappedFile.id}/${file.name}`; // Placeholder URL
              if(mappedFile.type === 'image' && !mappedFile.thumbnail) mappedFile.thumbnail = mappedFile.url; // Use final URL for thumb

              newMediaFiles.push(mappedFile);
              setUploadProgress(((i + 1) / uploadedFiles.length) * 100);
              await new Promise(resolve => setTimeout(resolve, 200));
          }
          setMediaFiles(prev => [...newMediaFiles, ...prev]);
          // IDs are guaranteed strings here by mapInitialMedia
          setSelectedFiles(prev => [...prev, ...newMediaFiles.map(f => f.id)]);
          setTimeout(() => { setShowUploadModal(false); setIsUploading(false); setUploadedFiles([]); }, 500);
      } catch (error) { console.error('Upload error:', error); setIsUploading(false); }
  }, [uploadedFiles]); // Keep dependency

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]);
  }, []);

  const handlePreview = useCallback((file: MediaFile) => { setPreviewFile(file); setShowPreviewModal(true); }, []);

  const handleEdit = useCallback((file: MediaFile) => {
    setPreviewFile(file);
    setEditForm({
        name: file.name,
        description: file.description || '',
        tags: file.tags?.join(', ') || '',
        expiryDate: file.expiryDate ? format(file.expiryDate, "yyyy-MM-dd'T'HH:mm") : '' // Format Date obj
    });
    setFormErrors({});
    setShowEditModal(true);
 }, []);

  const handleShare = useCallback((file: MediaFile) => { if (file.type !== 'video' && !file.shareLink) return; setPreviewFile(file); setCopiedLink(false); setShowShareModal(true); }, []);

  const handleDelete = useCallback((fileIds: string[]) => {
    const idsToDelete = fileIds.length > 0 ? fileIds : selectedFiles;
    if (idsToDelete.length === 0) return;
    // idsToDelete are guaranteed strings from the input or selectedFiles state
    setSelectedFiles(idsToDelete);
    setShowDeleteModal(true);
  }, [selectedFiles]);

  const confirmDelete = useCallback(() => {
    // Since selectedFiles is string[], and file.id is string, this is safe
    setMediaFiles(prev => prev.filter(file => !selectedFiles.includes(file.id)));
    setShowDeleteModal(false);
    setSelectedFiles([]);
 }, [selectedFiles]);

  const saveFileEdits = useCallback(() => {
    if (!previewFile) return; // previewFile.id is string here
    const errors: { [key: string]: string } = {};
    if (!editForm.name.trim()) errors.name = 'Name is required';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    const tags = editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    let expiryDate: Date | undefined = undefined;
    if (editForm.expiryDate) { try { const d = new Date(editForm.expiryDate); if (!isNaN(d.getTime())) expiryDate = d; } catch { /* ignore */ } }
    setMediaFiles(prev => prev.map(file => file.id === previewFile.id ? { ...file, name: editForm.name.trim(), description: editForm.description.trim(), tags, expiryDate } : file));
    setShowEditModal(false); setFormErrors({});
 }, [previewFile, editForm]);

  const copyToClipboard = useCallback((text: string) => { navigator.clipboard.writeText(text).then(() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }, (err) => console.error('Copy failed:', err)); }, []);

  const handleBulkShare = useCallback(() => { const f = mediaFiles.find(file => selectedFiles.includes(file.id) && (file.type === 'video' || file.shareLink)); if (f) handleShare(f); }, [mediaFiles, selectedFiles, handleShare]);

  // --- Filter and Sort Files ---
  const filteredFiles = useMemo(() => {
    let files = [...mediaFiles];
    if (activeTab !== 'all') { files = files.filter(file => file.type === activeTab); }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      files = files.filter(file => file.name.toLowerCase().includes(term) || (file.description && file.description.toLowerCase().includes(term)) || (file.tags && file.tags.some(tag => tag.toLowerCase().includes(term))) );
    }
    return files.sort((a, b) => {
      const orderMultiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'date') {
        const dateA = a.dateCreated?.getTime() || 0;
        const dateB = b.dateCreated?.getTime() || 0;
        return (dateB - dateA) * orderMultiplier;
      }
      if (sortBy === 'name') { return a.name.localeCompare(b.name) * orderMultiplier; }
      if (sortBy === 'size') { return ((a.size ?? 0) - (b.size ?? 0)) * orderMultiplier; }
      return 0;
    });
  }, [mediaFiles, activeTab, searchTerm, sortBy, sortOrder]);

  // --- JSX Return (Using corrected types and safe access) ---
  return (
    <Section>
      <SectionTitle>
          <TitleWithIcon><Camera size={20} /> Media Evidence</TitleWithIcon>
          <ViewModeButtons>
              <ViewModeButton variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')} title="Grid View"><Grid size={16} /></ViewModeButton>
              <ViewModeButton variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')} title="List View"><List size={16} /></ViewModeButton>
          </ViewModeButtons>
      </SectionTitle>

      <MediaTabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as MediaFile['type'] | 'all')}>
          <MediaTabsList>
              <MediaTabsTrigger value="all"><FileText size={16} /> All</MediaTabsTrigger>
              <MediaTabsTrigger value="image"><Image size={16} /> Images</MediaTabsTrigger>
              <MediaTabsTrigger value="video"><Video size={16} /> Videos</MediaTabsTrigger>
              <MediaTabsTrigger value="document"><File size={16} /> Docs</MediaTabsTrigger>
              <MediaTabsTrigger value="audio"><Volume2 size={16} /> Audio</MediaTabsTrigger>
          </MediaTabsList>
      </MediaTabs>

      <FilterRow>
          <SearchInput>
              <SearchIcon><Search size={16} /></SearchIcon>
              <Input type="text" placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </SearchInput>
          <div>
              <Button variant="outline" onClick={openFilePicker}><Upload size={16} className="mr-2" /> Upload</Button>
              <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFileInputChange(e, 'image')} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} />
              <input ref={videoInputRef} type="file" multiple onChange={(e) => handleFileInputChange(e, 'video')} accept="video/*" style={{ display: 'none' }} />
              <FilterDropdown>
                  <FilterButton variant="outline" onClick={() => setFilterMenuOpen(!filterMenuOpen)} style={{ marginLeft: '0.5rem' }}>
                      <Filter size={16} /> Sort <ChevronDown size={14} />
                  </FilterButton>
                  <FilterMenu $open={filterMenuOpen}>
                      <FilterOption onClick={() => { setSortBy('date'); setSortOrder('desc'); setFilterMenuOpen(false); }}><Calendar size={16} /> Newest</FilterOption>
                      <FilterOption onClick={() => { setSortBy('date'); setSortOrder('asc'); setFilterMenuOpen(false); }}><Calendar size={16} /> Oldest</FilterOption>
                      <FilterOption onClick={() => { setSortBy('name'); setSortOrder('asc'); setFilterMenuOpen(false); }}><FileText size={16} /> Name (A-Z)</FilterOption>
                      <FilterOption onClick={() => { setSortBy('name'); setSortOrder('desc'); setFilterMenuOpen(false); }}><FileText size={16} /> Name (Z-A)</FilterOption>
                      <FilterOption onClick={() => { setSortBy('size'); setSortOrder('desc'); setFilterMenuOpen(false); }}><FileText size={16} /> Size (Largest)</FilterOption>
                      <FilterOption onClick={() => { setSortBy('size'); setSortOrder('asc'); setFilterMenuOpen(false); }}><FileText size={16} /> Size (Smallest)</FilterOption>
                  </FilterMenu>
              </FilterDropdown>
          </div>
      </FilterRow>

      <DropZoneContainer onDrop={handleDrop} onDragOver={handleDragOver} onClick={openFilePicker}>
          <DropZoneIcon><Upload size={48} /></DropZoneIcon>
          <DropZoneText>Drag & drop files or click to browse</DropZoneText>
          <DropZoneSubtext>Supports Images, Videos, PDFs, Documents</DropZoneSubtext>
      </DropZoneContainer>

      {selectedFiles.length > 0 && (
          <BulkActions>
              <BulkActionsInfo>{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</BulkActionsInfo>
              <BulkActionsButtons>
                  <BulkActionButton variant="outline" size="sm" onClick={handleBulkShare} disabled={!mediaFiles.some(f => selectedFiles.includes(f.id) && (f.type === 'video' || f.shareLink))}>
                      <Link size={14} /> Share
                  </BulkActionButton>
                  <BulkActionButton variant="destructive" size="sm" onClick={() => handleDelete(selectedFiles)}>
                      <Trash2 size={14} /> Delete Selected
                  </BulkActionButton>
              </BulkActionsButtons>
          </BulkActions>
      )}

      {filteredFiles.length > 0 ? (
        <FilesContainer $viewMode={viewMode}>
          {filteredFiles.map((file) => (
            <FileCard
                key={file.id} // ID is now guaranteed string
                $viewMode={viewMode}
                $selected={selectedFiles.includes(file.id)}
                onClick={() => toggleFileSelection(file.id)}
            >
              <SelectBox $selected={selectedFiles.includes(file.id)} onClick={(e) => { e.stopPropagation(); toggleFileSelection(file.id); }}>
                {selectedFiles.includes(file.id) && <Check size={12} />}
              </SelectBox>
              <FilePreview $viewMode={viewMode}>
                {file.type === 'image' && <img src={file.thumbnail ?? file.url} alt={file.name} />}
                {file.type === 'video' && ( <> {file.thumbnail ? <img src={file.thumbnail ?? file.url} alt={file.name} /> : <Video />} <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px' }}><Play size={16} color="white" /></div> </> )}
                {file.type === 'document' && <FileText />}
                {file.type === 'audio' && <Volume2 />}
                {file.type === 'other' && <File />}
              </FilePreview>
              <FileCardContent $viewMode={viewMode}>
                <FileInfo $viewMode={viewMode}>
                  <FileName $viewMode={viewMode} title={file.name}>{file.name}</FileName>
                  <FileDetails $viewMode={viewMode}>
                     <span>{formatFileSize(file.size)}</span>
                     <span>{formatDateSafe(file.dateCreated)}</span>
                     {file.expiryDate && (
                        <span style={{ color: new Date() > file.expiryDate ? '#ef4444' : '#6b7280' }}>
                            {new Date() > file.expiryDate ? 'Expired' : 'Expires'}: {formatDateSafe(file.expiryDate)}
                        </span>
                     )}
                  </FileDetails>
                </FileInfo>
                <FileActions $viewMode={viewMode}>
                  <IconButton onClick={(e) => { e.stopPropagation(); handlePreview(file); }} title="Preview"><Eye size={16} /></IconButton>
                  <IconButton onClick={(e) => { e.stopPropagation(); handleEdit(file); }} title="Edit"><Pencil size={16} /></IconButton>
                  {(file.type === 'video' || file.shareLink) && <IconButton onClick={(e) => { e.stopPropagation(); handleShare(file); }} title="Share"><Link size={16} /></IconButton>}
                  <IconButton onClick={(e) => { e.stopPropagation(); handleDelete([file.id]); }} title="Delete"><Trash2 size={16} color="#ef4444" /></IconButton>
                </FileActions>
              </FileCardContent>
            </FileCard>
          ))}
        </FilesContainer>
      ) : (
        <EmptyState>
          <EmptyStateIcon><FileText size={48} /></EmptyStateIcon>
          <EmptyStateTitle>No files found</EmptyStateTitle>
          <EmptyStateText>{searchTerm ? `No files matching "${searchTerm}".` : 'Upload files using the button or drag & drop.'}</EmptyStateText>
          <Button onClick={openFilePicker}><Upload size={16} className="mr-2" /> Upload Files</Button>
        </EmptyState>
      )}

      {/* --- Modals (Ensure safe date formatting where needed) --- */}
       {showPreviewModal && previewFile && (
         <ModalOverlay onClick={() => setShowPreviewModal(false)}>
           <Modal onClick={(e) => e.stopPropagation()}>
             <ModalHeader>
                 <ModalTitle> {/* ... Icon ... */} {previewFile.name} </ModalTitle>
                 <ModalCloseButton onClick={() => setShowPreviewModal(false)}><X size={18} /></ModalCloseButton>
             </ModalHeader>
             <ModalContent>
                 {/* ... Previews ... */}
                 <FileMetadata>
                     <MetadataTitle><FileText size={16} />Details</MetadataTitle>
                     <MetadataGrid>
                         <MetadataItem><MetadataLabel>Size</MetadataLabel><MetadataValue>{formatFileSize(previewFile.size)}</MetadataValue></MetadataItem>
                         <MetadataItem><MetadataLabel>Type</MetadataLabel><MetadataValue>{previewFile.type}</MetadataValue></MetadataItem>
                         <MetadataItem><MetadataLabel>Uploaded</MetadataLabel><MetadataValue>{formatDateSafe(previewFile.dateCreated)}</MetadataValue></MetadataItem>
                         {previewFile.expiryDate && <MetadataItem><MetadataLabel>Expires</MetadataLabel><MetadataValue>{formatDateSafe(previewFile.expiryDate)}</MetadataValue></MetadataItem>}
                     </MetadataGrid>
                 </FileMetadata>
             </ModalContent>
             <ModalActions> {/* ... Actions ... */} </ModalActions>
           </Modal>
         </ModalOverlay>
       )}

      {showEditModal && previewFile && (
        <ModalOverlay onClick={() => setShowEditModal(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            {/* ... Modal Header ... */}
            <ModalContent>
                {/* ... Form Fields ... */}
                {(previewFile.type === 'video') && (
                    <FormGroup>
                        <FormLabel htmlFor="edit-file-expiry">Expiry</FormLabel>
                        {/* Value is already pre-formatted in handleEdit */}
                        <FormInput id="edit-file-expiry" type="datetime-local" value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} min={format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
                    </FormGroup>
                )}
            </ModalContent>
             {/* ... Modal Actions ... */}
          </Modal>
        </ModalOverlay>
      )}

      {showShareModal && previewFile && (
        <ModalOverlay onClick={() => setShowShareModal(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            {/* ... Modal Header ... */}
            <ModalContent>
              <FormGroup>
                <FormLabel>Share Link</FormLabel>
                <CopyInput> {/* ... Input + Copy Button ... */} </CopyInput>
                {previewFile.expiryDate && (
                    <ExpiryBadge variant={new Date() > previewFile.expiryDate ? "destructive" : "outline"}>
                        <Clock size={14} /> {new Date() > previewFile.expiryDate ? 'Expired' : 'Expires'}: {formatDateSafe(previewFile.expiryDate)}
                    </ExpiryBadge>
                )}
              </FormGroup>
              {/* ... Share Options ... */}
            </ModalContent>
             {/* ... Modal Actions ... */}
          </Modal>
        </ModalOverlay>
      )}

      {showDeleteModal && ( <ModalOverlay> {/* ... Delete Confirmation ... */} </ModalOverlay> )}
      {showUploadModal && ( <ModalOverlay> {/* ... Upload Form/Progress ... */} </ModalOverlay> )}

    </Section>
  );
};

export default MediaManagementSystem;