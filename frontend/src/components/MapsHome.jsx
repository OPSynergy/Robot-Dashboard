import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const getMapImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  if (imagePath.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  return imagePath;
};

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '260px',
  height: '180px',
  margin: '1rem',
  background: '#f8f9fa',
  borderRadius: '1rem',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  cursor: 'pointer',
  fontSize: '1.1rem',
  fontWeight: 600,
  color: '#2c3e50',
  transition: 'transform 0.15s, box-shadow 0.15s',
  position: 'relative',
  overflow: 'hidden',
};
const cardHover = {
  transform: 'scale(1.04)',
  boxShadow: '0 4px 18px rgba(44,62,80,0.13)',
};
const selectedStyle = {
  border: '3px solid #3498db',
};

const MapsHome = () => {
  const [maps, setMaps] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [selectedMapId, setSelectedMapId] = useState(() => {
    const saved = localStorage.getItem('selectedMapId');
    return saved ? parseInt(saved) : null;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMap, setNewMap] = useState({ map_name: '', map_type: '' });
  const [mapFile, setMapFile] = useState(null);
  const [mapPreview, setMapPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMaps = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/maps`);
      setMaps(response.data);
      if (response.data.length > 0 && !selectedMapId) {
        setSelectedMapId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching maps:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  useEffect(() => {
    if (selectedMapId) {
      localStorage.setItem('selectedMapId', selectedMapId);
      const selectedMap = maps.find(m => m.id === selectedMapId);
      if (selectedMap) {
        localStorage.setItem('lastMapType', selectedMap.map_type);
        localStorage.setItem('selectedMapImage', getMapImageUrl(selectedMap.map_image));
      }
    }
  }, [selectedMapId, maps]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMapFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMapPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMap = async () => {
    if (!newMap.map_name || !newMap.map_type || !mapFile) {
      alert('Please fill all fields and upload a map image');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('map_name', newMap.map_name);
      formData.append('map_type', newMap.map_type);
      formData.append('file', mapFile);
      
      await axios.post(`${API_BASE_URL}/maps/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setNewMap({ map_name: '', map_type: '' });
      setMapFile(null);
      setMapPreview(null);
      setShowAddModal(false);
      fetchMaps();
    } catch (error) {
      console.error('Error adding map:', error);
      alert('Failed to add map');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMap = async (mapId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this map?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/maps/${mapId}`);
      if (selectedMapId === mapId) {
        setSelectedMapId(null);
      }
      fetchMaps();
    } catch (error) {
      console.error('Error deleting map:', error);
      alert('Failed to delete map');
    }
  };

  const selectedMap = maps.find(m => m.id === selectedMapId);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading maps...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '70vh', gap: '1.5rem', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '900px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>Maps</h2>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
        {/* Add Map Card */}
        <div
          onClick={() => setShowAddModal(true)}
          onMouseEnter={() => setHovered('add')}
          onMouseLeave={() => setHovered(null)}
          title="Add Map"
          style={{
            ...cardStyle,
            background: '#fff',
            border: '2px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            ...(hovered === 'add' ? { ...cardHover, borderColor: '#3498db' } : {}),
          }}
        >
          <span style={{ fontSize: '3rem', color: '#999', fontWeight: 300, lineHeight: 1 }}>+</span>
          {hovered === 'add' && (
            <span style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>Add Map</span>
          )}
        </div>
        
        {maps.map((map) => (
            <div
              key={map.id}
              style={{
                ...(hovered === map.id ? { ...cardStyle, ...cardHover } : cardStyle),
                ...(selectedMapId === map.id ? selectedStyle : {}),
              }}
              onMouseEnter={() => setHovered(map.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelectedMapId(map.id)}
            >
              <button
                onClick={(e) => handleDeleteMap(map.id, e)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: '#e74c3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
              {map.map_image && (
                <img
                  src={getMapImageUrl(map.map_image)}
                  alt={map.map_name}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '0.5rem 0.5rem 0 0',
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={{ padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontWeight: 600 }}>{map.map_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.4rem' }}>{map.map_type}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMapId(map.id);
                  }}
                  style={{
                    padding: '4px 12px',
                    background: selectedMapId === map.id ? '#27ae60' : '#3498db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {selectedMapId === map.id ? '✓ Selected' : 'Select'}
                </button>
              </div>
            </div>
          ))}
      </div>

      {selectedMap && (
        <div style={{ marginTop: '1rem', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>{selectedMap.map_name}</h3>
          <img
            src={getMapImageUrl(selectedMap.map_image)}
            alt={selectedMap.map_name}
            style={{ maxWidth: '700px', maxHeight: '400px', width: '100%', height: 'auto', borderRadius: '0.7rem', boxShadow: '0 0.07rem 0.27rem rgba(0,0,0,0.04)' }}
          />
        </div>
      )}

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '2rem',
            minWidth: '400px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Add New Map</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Map Name</label>
                <input
                  type="text"
                  value={newMap.map_name}
                  onChange={(e) => setNewMap({ ...newMap, map_name: e.target.value })}
                  placeholder="e.g., Warehouse A"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Map Type</label>
                <input
                  type="text"
                  value={newMap.map_type}
                  onChange={(e) => setNewMap({ ...newMap, map_type: e.target.value })}
                  placeholder="e.g., storage, delivery, warehouse"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Upload Map Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                />
              </div>
              {mapPreview && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Preview</label>
                  <img
                    src={mapPreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }}
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMap({ map_name: '', map_type: '' });
                  setMapFile(null);
                  setMapPreview(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMap}
                disabled={uploading}
                style={{
                  padding: '10px 20px',
                  background: uploading ? '#95a5a6' : '#3498db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {uploading ? 'Uploading...' : 'Add Map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapsHome;
