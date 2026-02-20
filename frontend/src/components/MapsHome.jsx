import React, { useEffect, useState } from 'react';
import storageMap from '../img/storage.png';
import deliveryMap from '../img/delivery.jpg';

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '260px',
  height: '180px',
  margin: '2rem',
  background: '#f8f9fa',
  borderRadius: '1rem',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  cursor: 'pointer',
  fontSize: '1.3rem',
  fontWeight: 600,
  color: '#2c3e50',
  transition: 'transform 0.15s, box-shadow 0.15s',
};
const cardHover = {
  transform: 'scale(1.04)',
  boxShadow: '0 4px 18px rgba(44,62,80,0.13)',
};

const MapsHome = () => {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(() => localStorage.getItem('lastMapType') || 'storage');

  useEffect(() => {
    localStorage.setItem('lastMapType', selected);
  }, [selected]);

  let mapImage = selected === 'delivery' ? deliveryMap : storageMap;
  let mapAlt = selected === 'delivery' ? 'Delivery Area Map' : 'Storage Area Map';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '70vh', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
        <div
          style={hovered === 'storage' ? { ...cardStyle, ...cardHover } : cardStyle}
          onMouseEnter={() => setHovered('storage')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => setSelected('storage')}
        >
          <span role="img" aria-label="storage" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏬</span>
          Storage area
        </div>
        <div
          style={hovered === 'delivery' ? { ...cardStyle, ...cardHover } : cardStyle}
          onMouseEnter={() => setHovered('delivery')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => setSelected('delivery')}
        >
          <span role="img" aria-label="delivery" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚚</span>
          Delivery area
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
        <img
          src={mapImage}
          alt={mapAlt}
          style={{ maxWidth: '700px', maxHeight: '400px', width: '100%', height: 'auto', borderRadius: '0.7rem', boxShadow: '0 0.07rem 0.27rem rgba(0,0,0,0.04)' }}
        />
      </div>
    </div>
  );
};

export default MapsHome; 