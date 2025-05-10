import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaEdit, FaTrash, FaTimes, FaSpinner, FaSearch, FaCloudUploadAlt, FaImages } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import './PanelPersonajes.scss';

const GOOGLE_API_KEY = 'AIzaSyBxPVl2_pURrxvblJ-k8aI5reMt8XRxxYQ';
const SEARCH_ENGINE_ID = '818dc0dab99b14004';

// Credenciales Cloudinary
const CLOUDINARY_CLOUD_NAME = 'boda-baile';
const CLOUDINARY_API_KEY = '851314221741213';
const CLOUDINARY_UPLOAD_PRESET = 'boda_personajes';
const GIPHY_API_KEY = 'VgAQaRv2iDTQMz5Fv5dA6ehM09ws2Yfn';

const PanelPersonajes = ({
  isPanelOpen,
  setIsPanelOpen,
  urlstrapi = 'https://boda-strapi-production.up.railway.app',
  STRAPI_TOKEN
}) => {
  const [personajes, setPersonajes] = useState([]);
  const [selectedPersonaje, setSelectedPersonaje] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTab, setImageTab] = useState('giphy');
  const [imageSearch, setImageSearch] = useState('');
  const [googleResults, setGoogleResults] = useState([]);
  const [giphyResults, setGiphyResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef();
  const [isListLoading, setIsListLoading] = useState(false);

  useEffect(() => {
    if (isPanelOpen) {
      fetchPersonajes();
    }
  }, [isPanelOpen]);

  const fetchPersonajes = async () => {
    try {
      setIsListLoading(true);
      const response = await fetch(`${urlstrapi}/api/personajes?populate[invitados][populate]=*`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });
      const data = await response.json();
      console.log('Datos recibidos de Strapi:', data);
      if (data.data) {
        setPersonajes(data.data);
      }
    } catch (error) {
      console.error('Error al obtener personajes:', error);
    } finally {
      setIsListLoading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen');
      return;
    }
    setIsUploading(true);
    try {
      const formDataCloud = new FormData();
      formDataCloud.append('file', file);
      formDataCloud.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formDataCloud.append('api_key', CLOUDINARY_API_KEY);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formDataCloud
      });
      const data = await res.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, imagen: data.secure_url }));
        setPreviewUrl(data.secure_url);
      } else {
        alert('Error al subir la imagen a Cloudinary');
      }
    } catch (err) {
      alert('Error al subir la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const openImageModal = async () => {
    const searchTerm = selectedPersonaje ? selectedPersonaje.nombre : formData.nombre;
    setImageSearch(searchTerm || '');
    setShowImageModal(true);
    setImageTab('giphy');
    setGoogleResults([]);
    setGiphyResults([]);
    
    // Esperar a que el estado se actualice
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Realizar búsqueda con el término actualizado
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm || '')}&limit=20&rating=pg`);
    const data = await res.json();
    setGiphyResults(data.data.map(gif => gif.images.fixed_height.url));
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setIsSearching(false);
  };

  const handleImageSearch = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    setGoogleResults([]);
    setGiphyResults([]);
    
    if (imageTab === 'google') {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(imageSearch)}&client_id=2QwQn6Qw1QwQn6Qw1QwQn6QwQn6QwQn6QwQn6QwQn6Qw`);
      const data = await res.json();
      setGoogleResults(Array.isArray(data.results) ? data.results.map(img => img.urls.small) : []);
    } else if (imageTab === 'giphy') {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(imageSearch)}&limit=20&rating=pg`);
      const data = await res.json();
      setGiphyResults(data.data.map(gif => gif.images.fixed_height.url));
    }
    setIsSearching(false);
  };

  const handleSelectImage = (url) => {
    setFormData(prev => ({ ...prev, imagen: url }));
    setPreviewUrl(url);
    setShowImageModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        data: {
          nombre: formData.nombre || '',
          descripcion: formData.descripcion || '',
          imagen_url: formData.imagen
        }
      };
      let response;
      if (selectedPersonaje) {
        response = await fetch(`${urlstrapi}/api/personajes/${selectedPersonaje.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify(dataToSend)
        });
      } else {
        response = await fetch(`${urlstrapi}/api/personajes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STRAPI_TOKEN}`
          },
          body: JSON.stringify(dataToSend)
        });
      }
      if (!response.ok) {
        const errorData = await response.json();
        alert(JSON.stringify(errorData, null, 2));
        throw new Error(errorData.error?.message || 'Error al guardar el personaje');
      }
      setFormData({ nombre: '', descripcion: '', imagen: null });
      setSelectedPersonaje(null);
      setPreviewUrl(null);
      fetchPersonajes();
    } catch (error) {
      alert('Error al guardar el personaje. Por favor, intenta de nuevo.');
    }
  };

  const getPersonajeImageUrl = (personaje) => {
    return personaje.imagen_url || null;
  };

  const handleEdit = (personaje) => {
    setSelectedPersonaje(personaje);
    setFormData({
      nombre: personaje.nombre || '',
      descripcion: personaje.descripcion || '',
      imagen: personaje.imagen_url || null
    });
    setPreviewUrl(personaje.imagen_url || null);
  };

  const handleDelete = async () => {
    if (!selectedPersonaje || !window.confirm('¿Estás seguro de que quieres eliminar este personaje?')) return;
    
    try {
      console.log('Personaje a eliminar:', selectedPersonaje);
      const response = await fetch(`${urlstrapi}/api/personajes/${selectedPersonaje.documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(`Error al eliminar: ${JSON.stringify(errorData)}`);
      }

      // Limpiar el estado
      setSelectedPersonaje(null);
      setFormData({ nombre: '', descripcion: '', imagen: null });
      setPreviewUrl(null);
      
      // Actualizar la lista
      await fetchPersonajes();
    } catch (error) {
      console.error('Error al eliminar el personaje:', error);
      alert('Error al eliminar el personaje. Por favor, intenta de nuevo.');
    }
  };

  return (
    <>
      <div className={`panel-personajes ${isPanelOpen ? 'open' : ''}`}>
        <div className="dashboard-content">
          <button className="close-btn" onClick={() => setIsPanelOpen(false)}>
            <FaTimes />
          </button>
          <div className="form-section">
            <form className="panel-personajes-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre del Personaje</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ingresa el nombre del personaje"
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe el personaje..."
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Imagen</label>
                <div
                  className={`dropzone ${isUploading ? 'disabled' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  style={{
                    border: '2px dashed #6366f1',
                    borderRadius: '12px',
                    padding: 0,
                    textAlign: 'center',
                    marginBottom: '12px',
                    background: '#18192a',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    minHeight: 180,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                  onClick={() => !isUploading && fileInputRef.current.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleDrop}
                    disabled={isUploading}
                  />
                  {previewUrl ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: 180,
                          objectFit: 'cover',
                          borderRadius: '12px',
                          filter: isUploading ? 'blur(2px) grayscale(0.7)' : 'none',
                          opacity: isUploading ? 0.7 : 1,
                          transition: 'filter 0.3s, opacity 0.3s'
                        }}
                      />
                      {isUploading && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(24,25,42,0.6)',
                          borderRadius: '12px',
                          zIndex: 2
                        }}>
                          <FaSpinner className="spinner" style={{ fontSize: 36, color: '#fff' }} />
                        </div>
                      )}
                      <button
                        type="button"
                        className="remove-image"
                        onClick={e => {
                          e.stopPropagation();
                          setPreviewUrl(null);
                          setFormData(prev => ({ ...prev, imagen: null }));
                        }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 20,
                          cursor: 'pointer',
                          zIndex: 3,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                        title="Eliminar imagen"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '100%', padding: 24 }}>
                      {isUploading ? (
                        <FaSpinner className="spinner" />
                      ) : (
                        <>
                          <FaCloudUploadAlt style={{ fontSize: 48, color: '#6366f1', marginBottom: 12 }} />
                          <div style={{ color: '#bbb', fontSize: 16, marginBottom: 4 }}>
                            Arrastra una imagen aquí o haz click para seleccionar
                          </div>
                          <div style={{ color: '#6366f1', fontSize: 13 }}>
                            JPG, PNG, GIF, WEBP...
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    className="search-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#6366f1',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontWeight: 'bold',
                      fontSize: '1vw',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.12)',
                      transition: 'background 0.2s',
                      fontFamily: 'VCR, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05vw'
                    }}
                    onClick={openImageModal}
                    onMouseOver={e => e.currentTarget.style.background = '#4f46e5'}
                    onMouseOut={e => e.currentTarget.style.background = '#6366f1'}
                  >
                    <FaImages style={{ fontSize: 20 }} /> Buscar imagen
                  </button>
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={isUploading}>
                {selectedPersonaje ? 'Actualizar Personaje' : 'Crear Personaje'}
              </button>
              {selectedPersonaje && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={handleDelete}
                  style={{
                    marginTop: '1dvh',
                    padding: '1.5dvh',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5vw',
                    fontSize: '1vw',
                    cursor: 'pointer',
                    width: '100%',
                    fontFamily: 'VCR, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05vw',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#dc2626'}
                  onMouseOut={e => e.currentTarget.style.background = '#ef4444'}
                >
                  Eliminar Personaje
                </button>
              )}
            </form>
          </div>
          <div className="list-section">
            <h3>Personajes</h3>
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar personajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            {isListLoading ? (
              <div style={{ textAlign: 'center', color: '#6366f1', padding: 32 }}>
                <FaSpinner className="spinner" style={{ fontSize: 40 }} />
                <div style={{ marginTop: 12 }}>Cargando personajes...</div>
              </div>
            ) : (
              <div className="personajes-grid">
                {personajes
                  .filter(personaje =>
                    (personaje.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (personaje.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                  .map((personaje) => (
                    <div
                      key={personaje.id}
                      className={`personaje-item ${selectedPersonaje?.id === personaje.id ? 'selected' : ''}`}
                      onClick={() => handleEdit(personaje)}
                      style={{
                        background: personaje.invitados?.length > 0 ? '#22c55e20' : 'transparent',
                        border: personaje.invitados?.length > 0 ? '1px solid #22c55e' : '1px solid #333'
                      }}
                    >
                      <div className="personaje-image">
                        {personaje.imagen_url ? (
                          <img
                            src={personaje.imagen_url}
                            alt={personaje.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '2rem',
                            borderRadius: 10
                          }}>
                            {(personaje.nombre || '?')[0]}
                          </div>
                        )}
                      </div>
                      <div className="personaje-info">
                        <h4>{personaje.nombre || 'Sin nombre'}</h4>
                        <p className="descripcion">{personaje.descripcion || ''}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showImageModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: '#222', borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 700, width: '90vw', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
            <button onClick={closeImageModal} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}><FaTimes /></button>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <button onClick={() => setImageTab('google')} style={{ flex: 1, padding: 8, borderRadius: 8, border: imageTab === 'google' ? '2px solid #6366f1' : '1px solid #444', background: imageTab === 'google' ? '#6366f1' : '#333', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Google</button>
              <button onClick={() => setImageTab('giphy')} style={{ flex: 1, padding: 8, borderRadius: 8, border: imageTab === 'giphy' ? '2px solid #6366f1' : '1px solid #444', background: imageTab === 'giphy' ? '#6366f1' : '#333', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Giphy</button>
            </div>
            <form onSubmit={handleImageSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                value={imageSearch}
                onChange={e => setImageSearch(e.target.value)}
                placeholder={imageTab === 'google' ? 'Buscar en Google Imágenes...' : 'Buscar en Giphy...'}
                style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #444', background: '#111', color: '#fff' }}
              />
              <button type="submit" style={{ padding: 8, borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                <FaSearch />
              </button>
            </form>
            <div style={{ minHeight: 200 }}>
              {isSearching && <div style={{ color: '#fff', textAlign: 'center' }}><FaSpinner className="spinner" /> Buscando...</div>}
              {!isSearching && imageTab === 'google' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {googleResults.map((url, idx) => (
                    <img
                      key={url + idx}
                      src={url}
                      alt="Google result"
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid transparent' }}
                      onClick={() => handleSelectImage(url)}
                    />
                  ))}
                  {googleResults.length === 0 && <div style={{ color: '#fff' }}>No hay resultados.</div>}
                </div>
              )}
              {!isSearching && imageTab === 'giphy' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {giphyResults.map((url, idx) => (
                    <img
                      key={url + idx}
                      src={url}
                      alt="Giphy result"
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid transparent' }}
                      onClick={() => handleSelectImage(url)}
                    />
                  ))}
                  {giphyResults.length === 0 && <div style={{ color: '#fff' }}>No hay resultados.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <button
        className={`panel-personajes-toggle ${isPanelOpen ? 'open' : ''}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      />
    </>
  );
};

export default PanelPersonajes; 