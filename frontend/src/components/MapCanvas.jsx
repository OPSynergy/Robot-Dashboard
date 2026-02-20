import React, { useRef, useState, useEffect, useCallback } from 'react';

const GRID_SIZE = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const TRAIL_TYPES = [
  { label: 'Default', color: '#3366ff' },
  { label: 'Warning', color: '#fbbf24' },
  { label: 'Danger', color: '#e53935' },
];

const MapCanvas = ({ isOpen, onClose }) => {
  // Persist state across open/close
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(isOpen);
  const [drawing, setDrawing] = useState(false);
  const [trails, setTrails] = useState([[]]); // Array of trails, each trail is array of points
  const [trailType, setTrailType] = useState(0);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  // Editing state
  const [editMode, setEditMode] = useState('draw'); // 'draw' or 'select'
  const [selectedPoint, setSelectedPoint] = useState(null); // {trailIndex, pointIndex}
  const [draggingPoint, setDraggingPoint] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState(null); // {trailIndex, segmentIndex}
  
  const svgRef = useRef();

  // Animate open/close
  useEffect(() => {
    if (isOpen) setShow(true);
    else setTimeout(() => setShow(false), 250);
  }, [isOpen]);

  // Snap coordinates to grid if enabled
  const snapCoordinates = useCallback((x, y) => {
    if (!snapToGrid) return { x, y };
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE
    };
  }, [snapToGrid]);

  // Find closest point within threshold
  const findClosestPoint = useCallback((x, y, threshold = 10) => {
    for (let trailIndex = 0; trailIndex < trails.length; trailIndex++) {
      const trail = trails[trailIndex];
      for (let pointIndex = 0; pointIndex < trail.length; pointIndex++) {
        const point = trail[pointIndex];
        const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
        if (distance <= threshold) {
          return { trailIndex, pointIndex, distance };
        }
      }
    }
    return null;
  }, [trails]);

  // Find closest segment within threshold
  const findClosestSegment = useCallback((x, y, threshold = 15) => {
    for (let trailIndex = 0; trailIndex < trails.length; trailIndex++) {
      const trail = trails[trailIndex];
      for (let segmentIndex = 0; segmentIndex < trail.length - 1; segmentIndex++) {
        const p1 = trail[segmentIndex];
        const p2 = trail[segmentIndex + 1];
        
        // Calculate distance from point to line segment
        const A = x - p1.x;
        const B = y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
          xx = p1.x;
          yy = p1.y;
        } else if (param > 1) {
          xx = p2.x;
          yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }
        
        const distance = Math.sqrt((x - xx) ** 2 + (y - yy) ** 2);
        if (distance <= threshold) {
          return { trailIndex, segmentIndex, distance, insertX: xx, insertY: yy };
        }
      }
    }
    return null;
  }, [trails]);

  // Handle mouse wheel for zoom
  const handleWheel = (e) => {
    e.preventDefault();
    let newZoom = zoom - e.deltaY * 0.001;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(newZoom);
  };

  // Handle mouse drag for pan
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - offset.x) / zoom;
    const rawY = (e.clientY - rect.top - offset.y) / zoom;
    const { x, y } = snapCoordinates(rawX, rawY);
    
    if (editMode === 'select') {
      // Check if clicking on a point
      const closestPoint = findClosestPoint(x, y);
      if (closestPoint) {
        setSelectedPoint({ trailIndex: closestPoint.trailIndex, pointIndex: closestPoint.pointIndex });
        setDraggingPoint(true);
        return;
      }
      
      // Check if clicking on a segment to insert point
      const closestSegment = findClosestSegment(x, y);
      if (closestSegment) {
        const { trailIndex, segmentIndex, insertX, insertY } = closestSegment;
        const snappedCoords = snapCoordinates(insertX, insertY);
        
        setTrails(prev => {
          const newTrails = [...prev];
          const trail = [...newTrails[trailIndex]];
          trail.splice(segmentIndex + 1, 0, {
            x: snappedCoords.x,
            y: snappedCoords.y,
            timestamp: Date.now(),
            type: trail[0]?.type || 0
          });
          newTrails[trailIndex] = trail;
          return newTrails;
        });
        
        setSelectedPoint({ trailIndex, pointIndex: segmentIndex + 1 });
        setDraggingPoint(true);
        return;
      }
      
      // Clear selection if clicking on empty space
      setSelectedPoint(null);
      setDraggingPoint(false);
      return;
    }
    
    // Drawing mode
    if (e.target.getAttribute('data-canvas') === 'true') {
      setDrawing(true);
      setUndoStack([]);
      setRedoStack([]);
      setTrails((prev) => {
        const newTrails = [...prev];
        if (!drawing) newTrails.push([]);
        newTrails[newTrails.length - 1] = [{ x, y, timestamp: Date.now(), type: trailType }];
        return newTrails;
      });
    } else {
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setDraggingPoint(false);
    if (drawing) {
      setDrawing(false);
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  const handleMouseMove = (e) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - offset.x) / zoom;
      const rawY = (e.clientY - rect.top - offset.y) / zoom;
      const { x, y } = snapCoordinates(rawX, rawY);
      setMousePos({ x: x.toFixed(1), y: y.toFixed(1) });
      
      if (editMode === 'select') {
        // Update hovered segment for visual feedback
        const closestSegment = findClosestSegment(x, y);
        setHoveredSegment(closestSegment);
        
        // Handle point dragging
        if (draggingPoint && selectedPoint) {
          setTrails(prev => {
            const newTrails = [...prev];
            const trail = [...newTrails[selectedPoint.trailIndex]];
            trail[selectedPoint.pointIndex] = {
              ...trail[selectedPoint.pointIndex],
              x,
              y
            };
            newTrails[selectedPoint.trailIndex] = trail;
            return newTrails;
          });
        }
      } else if (drawing) {
        setTrails((prev) => {
          const newTrails = [...prev];
          const lastTrail = newTrails[newTrails.length - 1] || [];
          if (!lastTrail.length || lastTrail[lastTrail.length - 1].x !== x || lastTrail[lastTrail.length - 1].y !== y) {
            lastTrail.push({ x, y, timestamp: Date.now(), type: trailType });
            newTrails[newTrails.length - 1] = lastTrail;
          }
          return newTrails;
        });
      }
    }
    
    if (dragging && dragStart) {
      setOffset({
        x: dragStart.offsetX + (e.clientX - dragStart.x),
        y: dragStart.offsetY + (e.clientY - dragStart.y),
      });
    }
  };

  // Handle right-click for point deletion
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (editMode === 'select' && selectedPoint) {
      setTrails(prev => {
        const newTrails = [...prev];
        const trail = [...newTrails[selectedPoint.trailIndex]];
        trail.splice(selectedPoint.pointIndex, 1);
        
        // Remove trail if it becomes empty
        if (trail.length === 0) {
          newTrails.splice(selectedPoint.trailIndex, 1);
        } else {
          newTrails[selectedPoint.trailIndex] = trail;
        }
        
        return newTrails;
      });
      setSelectedPoint(null);
    }
  };

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    setTrails((prev) => {
      if (prev.length > 1) {
        setRedoStack((redo) => [prev[prev.length - 1], ...redo]);
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);
  const handleRedo = useCallback(() => {
    setRedoStack((redo) => {
      if (redo.length > 0) {
        setTrails((prev) => [...prev, redo[0]]);
        return redo.slice(1);
      }
      return redo;
    });
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === 'z') handleUndo();
      if (e.ctrlKey && e.key === 'y') handleRedo();
      if (e.key === 'Delete' && selectedPoint) {
        setTrails(prev => {
          const newTrails = [...prev];
          const trail = [...newTrails[selectedPoint.trailIndex]];
          trail.splice(selectedPoint.pointIndex, 1);
          if (trail.length === 0) {
            newTrails.splice(selectedPoint.trailIndex, 1);
          } else {
            newTrails[selectedPoint.trailIndex] = trail;
          }
          return newTrails;
        });
        setSelectedPoint(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleUndo, handleRedo, selectedPoint]);

  // Clear canvas
  const handleClear = () => {
    setTrails([[]]);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedPoint(null);
  };

  // Save as JSON
  const handleSave = () => {
    const data = trails.filter(t => t.length > 0);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trail.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Draw grid lines
  const gridLines = [];
  for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
    gridLines.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={CANVAS_HEIGHT} stroke="#e5e7eb" strokeWidth={1} />);
  }
  for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
    gridLines.push(<line key={`hz${y}`} x1={0} y1={y} x2={CANVAS_WIDTH} y2={y} stroke="#e5e7eb" strokeWidth={1} />);
  }

  // Only render modal if open or animating out
  if (!isOpen && !show) return null;

  // Styles
  const modalStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(30,32,38,0.85)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.25s',
    opacity: isOpen ? 1 : 0,
    pointerEvents: isOpen ? 'auto' : 'none',
  };
  const contentStyle = {
    background: '#fff',
    borderRadius: '1.2rem',
    boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
    padding: '0',
    minWidth: 340,
    width: '90vw',
    maxWidth: 900,
    minHeight: 400,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    transition: 'transform 0.25s',
    transform: isOpen ? 'scale(1)' : 'scale(0.97)',
  };
  const toolPanelStyle = {
    background: '#232428',
    color: '#fff',
    width: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '1.2rem 0',
    gap: '1.2rem',
    borderTopLeftRadius: '1.2rem',
    borderBottomLeftRadius: '1.2rem',
    minHeight: 400,
  };
  const toolBtnStyle = (active) => ({
    width: 32,
    height: 32,
    background: active ? '#3366ff' : '#fff2',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    marginBottom: 4,
    outline: active ? '2px solid #3366ff' : 'none',
    transition: 'background 0.2s',
  });
  const mainAreaStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 400,
    position: 'relative',
  };
  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.1rem 1.5rem 0.7rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 600,
    fontSize: '1.3rem',
    color: '#232428',
    background: '#fff',
  };
  const breadcrumbStyle = {
    fontSize: '1rem',
    color: '#888',
    marginBottom: 4,
    fontWeight: 500,
    letterSpacing: 0.1,
  };
  const closeBtnStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.7rem',
    color: '#888',
    cursor: 'pointer',
    marginLeft: '1.2rem',
    lineHeight: 1,
  };
  const zoomBtnStyle = {
    background: '#232428',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    width: 36,
    height: 36,
    fontSize: '1.3rem',
    marginLeft: 8,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    transition: 'background 0.2s',
  };
  const coordStyle = {
    position: 'absolute',
    left: 24,
    bottom: 18,
    background: 'rgba(30,32,38,0.85)',
    color: '#fff',
    borderRadius: 8,
    padding: '6px 16px',
    fontSize: '1rem',
    fontWeight: 500,
    letterSpacing: 0.2,
    zIndex: 10,
  };
  const statusBarStyle = {
    width: '100%',
    background: '#f8f9fa',
    borderTop: '1px solid #e5e7eb',
    color: '#232428',
    fontSize: '1rem',
    fontWeight: 500,
    padding: '0.6rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomRightRadius: '1.2rem',
  };

  // Render trails as SVG paths
  const renderTrails = () => trails.filter(t => t.length > 1).map((trail, trailIndex) => {
    const color = TRAIL_TYPES[trail[0]?.type || 0]?.color || '#3366ff';
    const d = trail.map((pt, i) => i === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`).join(' ');
    
    // Check if this trail has hovered segment
    const isHovered = hoveredSegment && hoveredSegment.trailIndex === trailIndex;
    
    return (
      <g key={trailIndex}>
        <path 
          d={d} 
          stroke={color} 
          strokeWidth={isHovered ? 5 : 3} 
          fill="none" 
          strokeLinejoin="round" 
          strokeLinecap="round"
          style={{ transition: 'stroke-width 0.2s' }}
        />
        {/* Render points */}
        {trail.map((point, pointIndex) => {
          const isSelected = selectedPoint && 
            selectedPoint.trailIndex === trailIndex && 
            selectedPoint.pointIndex === pointIndex;
          
          return (
            <circle
              key={`${trailIndex}-${pointIndex}`}
              cx={point.x}
              cy={point.y}
              r={isSelected ? 6 : 4}
              fill={isSelected ? '#3366ff' : color}
              stroke={isSelected ? '#fff' : 'none'}
              strokeWidth={isSelected ? 2 : 0}
              style={{ 
                cursor: editMode === 'select' ? 'pointer' : 'default',
                transition: 'r 0.2s, fill 0.2s'
              }}
            />
          );
        })}
      </g>
    );
  });

  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        {/* Tool Panel */}
        <div style={toolPanelStyle}>
          {/* Mode buttons */}
          <button
            style={toolBtnStyle(editMode === 'draw')}
            title="Draw Mode"
            onClick={() => setEditMode('draw')}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18 Q11 4 18 18" />
            </svg>
          </button>
          <button
            style={toolBtnStyle(editMode === 'select')}
            title="Select Mode"
            onClick={() => setEditMode('select')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3l8 8-8 8" />
            </svg>
          </button>
          
          {/* Trail type buttons (only in draw mode) */}
          {editMode === 'draw' && TRAIL_TYPES.map((type, idx) => (
            <button
              key={type.label}
              style={toolBtnStyle(trailType === idx)}
              title={type.label}
              onClick={() => setTrailType(idx)}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={type.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18 Q11 4 18 18" />
              </svg>
            </button>
          ))}
          
          {/* Snap to grid toggle */}
          <button
            style={toolBtnStyle(snapToGrid)}
            title={`Snap to Grid ${snapToGrid ? 'ON' : 'OFF'}`}
            onClick={() => setSnapToGrid(!snapToGrid)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="12" height="12" rx="1" />
              <path d="M3 9h12M9 3v12" />
            </svg>
          </button>
          
          {/* Action buttons */}
          <button style={toolBtnStyle(false)} title="Undo (Ctrl+Z)" onClick={handleUndo} disabled={trails.length <= 1}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 4H6v7" />
              <path d="M6 11c2.5-2.5 6.5-2.5 9 0" />
            </svg>
          </button>
          <button style={toolBtnStyle(false)} title="Redo (Ctrl+Y)" onClick={handleRedo} disabled={redoStack.length === 0}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h7v7" />
              <path d="M12 11c-2.5-2.5-6.5-2.5-9 0" />
            </svg>
          </button>
          <button style={toolBtnStyle(false)} title="Clear Canvas" onClick={handleClear}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="12" height="12" rx="3" />
              <path d="M6 6l6 6M12 6l-6 6" />
            </svg>
          </button>
          <button style={toolBtnStyle(false)} title="Save Trail" onClick={handleSave}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="12" height="12" rx="3" />
              <path d="M9 6v6M6 9h6" />
            </svg>
          </button>
        </div>
        {/* Main Area */}
        <div style={mainAreaStyle}>
          {/* Breadcrumb */}
          <div style={breadcrumbStyle}>Dashboard &gt; Missions &gt; Trail Following</div>
          {/* Header */}
          <div style={headerStyle}>
            <span>Trail Following Mode - {editMode === 'draw' ? 'Draw' : 'Edit'}</span>
            <div>
              <button style={zoomBtnStyle} onClick={() => setZoom(z => Math.min(z + 0.1, MAX_ZOOM))}>+</button>
              <button style={zoomBtnStyle} onClick={() => setZoom(z => Math.max(z - 0.1, MIN_ZOOM))}>-</button>
              <button style={closeBtnStyle} onClick={onClose} title="Close">×</button>
            </div>
          </div>
          {/* Canvas */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa', minHeight: 300 }}>
            <svg
              ref={svgRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              data-canvas="true"
              style={{
                background: '#fff',
                borderRadius: '0.7rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: editMode === 'select' ? 'crosshair' : drawing ? 'crosshair' : dragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                transform: `scale(${zoom})`,
                transformOrigin: '0 0',
                position: 'relative',
                left: offset.x,
                top: offset.y,
                transition: dragging ? 'none' : 'box-shadow 0.2s',
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onContextMenu={handleContextMenu}
            >
              {/* Grid */}
              {gridLines}
              {/* Trails */}
              {renderTrails()}
            </svg>
            <div style={coordStyle}>
              X: {mousePos.x} &nbsp; Y: {mousePos.y}
              {snapToGrid && <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Snap ON</div>}
            </div>
          </div>
          {/* Status Bar */}
          <div style={statusBarStyle}>
            <span>Canvas: {CANVAS_WIDTH} × {CANVAS_HEIGHT}px</span>
            <span>Zoom: {zoom.toFixed(2)}x | Mode: {editMode} | {snapToGrid ? 'Snap ON' : 'Snap OFF'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapCanvas; 