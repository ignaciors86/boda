import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaTimes, FaSpinner } from 'react-icons/fa';
import './PanelPersonajes.scss';

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

  useEffect(() => {
    if (isPanelOpen) {
      fetchPersonajes();
    }
  }, [isPanelOpen]);

  const fetchPersonajes = async () => {
    try {
      const response = await fetch(`${urlstrapi}/api/personajes?populate=imagen`, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });
      const data = await response.json();
      console.log('Respuesta completa de Strapi:', data);
      
      if (data.data) {
        const personajesFormateados = data.data.map(personaje => {
          console.log('Procesando personaje completo:', JSON.stringify(personaje, null, 2));
          const personajeFormateado = {
            id: personaje.id,
            documentId: personaje.documentId,
            nombre: personaje.nombre || '',
            descripcion: personaje.descripcion || '',
            imagen: personaje.imagen ? {
              id: personaje.imagen.id,
              url: `${urlstrapi}${personaje.imagen.url}`
            } : null,
            createdAt: personaje.createdAt,
            updatedAt: personaje.updatedAt
          };
          console.log('Personaje formateado:', personajeFormateado);
          return personajeFormateado;
        });
        console.log('Personajes formateados:', personajesFormateados);
        setPersonajes(personajesFormateados);
      }
    } catch (error) {
      console.error('Error al obtener personajes:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch(`${urlstrapi}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();
      console.log('Respuesta de subida de imagen:', data);

      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          imagen: data[0].id
        }));
        setPreviewUrl(`${urlstrapi}${data[0].url}`);
      }
    } catch (error) {
      console.error('Error al subir la imagen:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        data: {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          imagen: formData.imagen
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
        throw new Error('Error al guardar el personaje');
      }

      setFormData({ nombre: '', descripcion: '', imagen: null });
      setSelectedPersonaje(null);
      setPreviewUrl(null);
      fetchPersonajes();
    } catch (error) {
      console.error('Error al guardar personaje:', error);
    }
  };

  const handleEdit = (personaje) => {
    console.log('Editando personaje:', personaje);
    setSelectedPersonaje(personaje);
    setFormData({
      nombre: personaje.nombre,
      descripcion: personaje.descripcion,
      imagen: personaje.imagen ? personaje.imagen.id : null
    });
    setPreviewUrl(personaje.imagen ? personaje.imagen.url : null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este personaje?')) return;

    try {
      const response = await fetch(`${urlstrapi}/api/personajes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`
        }
      });

      if (response.ok) {
        fetchPersonajes();
      }
    } catch (error) {
      console.error('Error al eliminar personaje:', error);
    }
  };

  // Función para filtrar y ordenar personajes
  const getFilteredAndSortedPersonajes = () => {
    return personajes
      .filter(personaje => 
        personaje.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        personaje.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  return (
    <>
      <div className={`panel-personajes ${isPanelOpen ? 'open' : ''}`}>
        <div className="dashboard-header">
          <h2>Administrar Personajes</h2>
          <div className="header-actions">
            <button 
              className="close-btn"
              onClick={() => setIsPanelOpen(false)}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="dashboard-content">
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
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="image-upload"
                    className="file-input"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                  <label htmlFor="image-upload" className="file-upload-label">
                    {isUploading ? (
                      <FaSpinner className="spinner" />
                    ) : (
                      'Subir imagen'
                    )}
                  </label>
                  {previewUrl && (
                    <div className="image-preview">
                      <img src={previewUrl} alt="Preview" />
                      <button 
                        type="button" 
                        className="remove-image"
                        onClick={() => {
                          setPreviewUrl(null);
                          setFormData(prev => ({ ...prev, imagen: null }));
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isUploading}
              >
                {selectedPersonaje ? 'Actualizar Personaje' : 'Crear Personaje'}
              </button>
            </form>
          </div>

          <div className="list-section">
            <h3>Personajes Existentes</h3>
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar personajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            {personajes.length === 0 ? (
              <div className="empty-state">No hay personajes creados</div>
            ) : (
              <div className="personajes-grid">
                {getFilteredAndSortedPersonajes().map((personaje) => (
                  <div 
                    key={personaje.id} 
                    className="personaje-item"
                    onClick={() => handleEdit(personaje)}
                  >
                    <div className="personaje-image">
                      {personaje.imagen ? (
                        <img src={personaje.imagen.url} alt={personaje.nombre} />
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          background: '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '2rem'
                        }}>
                          {personaje.nombre[0]}
                        </div>
                      )}
                    </div>
                    <div className="personaje-info">
                      <h4>{personaje.nombre}</h4>
                      <p className="descripcion">{personaje.descripcion}</p>
                      <div className="personaje-meta">
                        <span className="fecha">Creado: {new Date(personaje.createdAt).toLocaleDateString()}</span>
                        <span className="fecha">Actualizado: {new Date(personaje.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="personaje-actions">
                        <button 
                          className="delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(personaje.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button 
        className={`panel-personajes-toggle ${isPanelOpen ? 'open' : ''}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
      />
    </>
  );
};

export default PanelPersonajes; 